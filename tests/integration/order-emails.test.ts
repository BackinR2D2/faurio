import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const items = [{ id: "vase", name: "Vază", quantity: 1, unit_price: 100, paid_unit_price: 100 }];
async function insert(code: string, status = "pending") {
  await db.query("insert into public.orders(code,customer_name,customer_email,shipping_address,items,subtotal,shipping,total,status,stripe_session_id) values($1,'Buyer','buyer@example.test','Address 1',$2,100,19,119,$3,$4)", [code, JSON.stringify(items), status, `cs_test_${code}`]);
}
async function claim(code: string) { return (await db.query<Record<string, unknown>>("select * from public.claim_order_email($1)", [code])).rows[0]; }
async function state(code: string) { return (await db.query<{ status: string }>("select status from public.order_email_outbox where order_code=$1", [code])).rows[0]?.status; }
before(async () => {
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;");
  const schema = (await readFile(new URL("../../supabase/schema.sql", import.meta.url), "utf8")).replace("create extension if not exists pgcrypto;", "");
  await db.exec(schema);
  await insert("historical", "paid");
  await db.exec(await readFile(new URL("../../supabase/migrations/202610300003_order_emails.sql", import.meta.url), "utf8"));
});
after(async () => db.close());

test("only newly paid orders enqueue: no historical backfill, unpaid or failed-payment emails", async () => {
  await insert("pending"); await insert("cancelled", "cancelled");
  assert.equal(await state("historical"), undefined);
  assert.equal(await state("pending"), undefined);
  assert.equal(await state("cancelled"), undefined);
  await assert.rejects(db.query("select public.complete_paid_order('pending','pi_test',1,null)"), /payment_total_mismatch/);
  assert.equal(await state("pending"), undefined);
});
test("replayed paid notifications create exactly one immutable order snapshot", async () => {
  await insert("paid");
  await db.exec("select public.complete_paid_order('paid','pi_test',119,null); select public.complete_paid_order('paid','pi_test',119,null)");
  assert.equal((await db.query("select * from public.order_email_outbox where order_code='paid'")).rows.length, 1);
  await db.exec("update public.orders set customer_email='changed@example.test' where code='paid'");
  const row = (await db.query<{ snapshot: { customer_email: string; total: number; test_mode: boolean } }>("select snapshot from public.order_email_outbox where order_code='paid'")).rows[0];
  assert.equal(row.snapshot.customer_email, "buyer@example.test"); assert.equal(row.snapshot.total, 119); assert.equal(row.snapshot.test_mode, true);
});
test("claims exclude concurrent dispatch, preserve prepared payload, require the lease token and never resend sent mail", async () => {
  const row = await claim("paid");
  assert.ok(row); assert.equal(await claim("paid"), undefined);
  const message = { from: "Faurio <orders@example.test>", to: ["buyer@example.test"], subject: "Order", html: "<p>Order</p>", text: "Order" };
  for (const value of [message, { ...message, subject: "Changed deploy" }]) {
    const result = await db.query<{ payload: unknown }>("select public.prepare_order_email($1,$2,$3) as payload", [row.id, row.lock_token, JSON.stringify(value)]);
    assert.deepEqual(result.rows[0].payload, message);
  }
  await assert.rejects(db.query("select public.finish_order_email($1,'00000000-0000-4000-8000-000000000000','sent','provider',null)", [row.id]), /email_claim_lost/);
  await db.query("select public.finish_order_email($1,$2,'sent','provider',null)", [row.id, row.lock_token]);
  assert.equal(await state("paid"), "sent"); assert.equal(await claim("paid"), undefined);
});
test("transient failures are delayed and retries retain the same job identity", async () => {
  await insert("retry", "paid"); const first = await claim("retry");
  await db.query("select public.finish_order_email($1,$2,'failed',null,'RESEND_HTTP_429')", [first.id, first.lock_token]);
  assert.equal(await claim("retry"), undefined);
  await db.exec("update public.order_email_outbox set next_attempt_at=now()-interval '1 minute' where order_code='retry'");
  const second = await claim("retry"); assert.equal(second.id, first.id); assert.equal(second.attempts, 2);
});
test("stale uncertain delivery is not retried outside the provider idempotency window", async () => {
  await db.exec("update public.order_email_outbox set first_attempt_at=now()-interval '24 hours',locked_at=now()-interval '10 minutes' where order_code='retry'");
  assert.equal(await claim("retry"), undefined); assert.equal(await state("retry"), "uncertain");
});
test("refunded jobs are cancelled and private outbox access is denied to buyers and anonymous users", async () => {
  await insert("refund", "paid"); await db.exec("update public.orders set status='refunded' where code='refund'");
  assert.equal(await claim("refund"), undefined); assert.equal(await state("refund"), "cancelled");
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    try {
      await assert.rejects(db.exec("select * from public.order_email_outbox"), /permission denied/);
      await assert.rejects(db.exec("select * from public.claim_order_email(null)"), /permission denied/);
      await assert.rejects(db.exec("update public.order_email_outbox set status='pending'"), /permission denied/);
    } finally { await db.exec("reset role"); }
  }
  await db.exec("set role service_role");
  try { await db.exec("select * from public.order_email_outbox limit 1"); await db.exec("select * from public.claim_order_email('paid')"); } finally { await db.exec("reset role"); }
});

test("failed jobs stop after five attempts and expired final leases require review", async () => {
  await insert("exhausted", "paid");
  await db.exec("update public.order_email_outbox set attempts=4 where order_code='exhausted'");
  const row = await claim("exhausted");
  assert.equal(row.attempts, 5);
  await db.query("select public.finish_order_email($1,$2,'failed',null,'RESEND_HTTP_500')", [row.id, row.lock_token]);
  assert.equal(await state("exhausted"), "blocked"); assert.equal(await claim("exhausted"), undefined);
  await db.exec("update public.order_email_outbox set status='processing',locked_at=now()-interval '10 minutes' where order_code='exhausted'");
  assert.equal(await claim("exhausted"), undefined); assert.equal(await state("exhausted"), "uncertain");
});
