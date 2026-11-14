import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { bootstrapMigrations, buildCleanBootstrap } from "../../lib/database-bootstrap.ts";

async function source() {
  const schema = await readFile(new URL("../../supabase/schema.sql", import.meta.url), "utf8");
  const migrations = await Promise.all(bootstrapMigrations.map(async name => ({ name, sql: await readFile(new URL(`../../supabase/migrations/${name}`, import.meta.url), "utf8") })));
  return { schema, migrations };
}

async function freshProject() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated,service_role;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
  return db;
}

test("bootstrap manifest covers every migration in the exact reviewed order", async () => {
  assert.deepEqual((await readdir(new URL("../../supabase/migrations", import.meta.url))).filter(name => name.endsWith(".sql")).sort(), [...bootstrapMigrations]);
  const { schema, migrations } = await source();
  assert.throws(() => buildCleanBootstrap("commercial", schema, [...migrations].reverse()), /MANIFEST_MISMATCH/);
  assert.throws(() => buildCleanBootstrap("commercial", schema, migrations.slice(1)), /MANIFEST_MISMATCH/);
  assert.throws(() => buildCleanBootstrap("commercial", schema, migrations.map((item, index) => index ? item : { ...item, sql: "select 1;" })), /TRANSACTION_WRAPPER_REQUIRED/);
  assert.deepEqual(buildCleanBootstrap("commercial", schema, migrations), buildCleanBootstrap("commercial", schema, migrations));
});

for (const environment of ["staging", "commercial"] as const) test(`fresh ${environment} install is empty, private, transactional and supports a real seller application`, async () => {
  const db = await freshProject();
  try {
    const { schema, migrations } = await source();
    const { sql, fingerprint } = buildCleanBootstrap(environment, schema, migrations);
    await db.exec(sql.replace("create extension if not exists pgcrypto;", ""));
    for (const table of ["products", "shops", "shop_pages", "orders", "profiles", "product_reviews", "promotions", "contact_messages", "newsletter_subscribers"]) {
      assert.equal((await db.query<{ count: number }>(`select count(*)::int as count from public.${table}`)).rows[0].count, 0, table);
    }
    const installation = (await db.query<{ environment: string; source_fingerprint: string }>("select environment,source_fingerprint from public.faurio_installation")).rows[0];
    assert.equal(installation.environment, environment);
    assert.equal(installation.source_fingerprint, fingerprint);
    assert.equal((await db.query<{ public: boolean }>("select public from storage.buckets where id='shop-media'")).rows[0].public, false);
    assert.equal((await db.query<{ allowed: boolean }>("select has_table_privilege('anon','public.faurio_installation','select') as allowed")).rows[0].allowed, false);
    assert.equal((await db.query<{ allowed: boolean }>("select has_function_privilege('authenticated','public.delete_customer_account(uuid)','execute') as allowed")).rows[0].allowed, false);
    await assert.rejects(db.exec(sql.replace("create extension if not exists pgcrypto;", "")), /bootstrap_existing_database_refused/);
    await db.exec("rollback");
    const user = "30000000-0000-4000-8000-000000000001";
    await db.query("insert into auth.users(id,email) values($1,'seller@example.test')", [user]);
    await db.exec("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
    const shop = (await db.query<{ id: string }>("select public.apply_for_shop('Atelier real','atelier-real','RO','Brașov','seller-2026-10') as id")).rows[0].id;
    const product = (await db.query<{ id: string }>("select public.save_shop_product($1,null,$2,false) as id", [shop, { name: "Vază de atelier", product_type: "Vază", category: "Ceramică", price: 120, stock: 3, material: "ceramică", color: "bej", description: "Vază lucrată manual, finisată cu glazură mată.", shipping_days: 3, image: "/products/ceramica-luna.avif" }])).rows[0].id;
    await db.exec("reset role");
    assert.equal((await db.query<{ shop_id: string }>("select shop_id from public.products where id=$1", [product])).rows[0].shop_id, shop);
  } finally { await db.close(); }
});

for (const existing of ["users", "storage", "public-table"] as const) test(`bootstrap refuses a project with existing ${existing} without changing its contents`, async () => {
  const db = await freshProject();
  try {
    if (existing === "users") await db.exec("insert into auth.users(id,email) values('30000000-0000-4000-8000-000000000001','preserve@example.test')");
    if (existing === "storage") await db.exec("insert into storage.buckets(id,name,public) values('preserve','preserve',false)");
    if (existing === "public-table") await db.exec("create table public.preserve(value text); insert into public.preserve values('keep')");
    const { schema, migrations } = await source();
    const { sql } = buildCleanBootstrap("commercial", schema, migrations);
    await assert.rejects(db.exec(sql.replace("create extension if not exists pgcrypto;", "")), /bootstrap_existing_/);
    await db.exec("rollback");
    const target = existing === "users" ? "auth.users" : existing === "storage" ? "storage.buckets" : "public.preserve";
    assert.equal((await db.query<{ count: number }>(`select count(*)::int as count from ${target}`)).rows[0].count, 1);
    assert.equal((await db.query<{ name: string | null }>("select to_regclass('public.products')::text as name")).rows[0].name, null);
  } finally { await db.close(); }
});

test("a late migration failure rolls back all tables and bucket creation", async () => {
  const db = await freshProject();
  try {
    const { schema, migrations } = await source();
    const broken = migrations.map((item, index) => index === migrations.length - 1 ? { ...item, sql: item.sql.replace(/commit;\s*$/i, "select 1/0;\ncommit;") } : item);
    const { sql } = buildCleanBootstrap("commercial", schema, broken);
    await assert.rejects(db.exec(sql.replace("create extension if not exists pgcrypto;", "")), /division by zero/);
    await db.exec("rollback");
    assert.equal((await db.query<{ name: string | null }>("select to_regclass('public.products')::text as name")).rows[0].name, null);
    assert.equal((await db.query<{ count: number }>("select count(*)::int as count from storage.buckets")).rows[0].count, 0);
  } finally { await db.close(); }
});
