import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOrderEmail } from "../../lib/email/order-template.ts";
import { readEmailConfig } from "../../lib/email/config.ts";
import { sendResendEmail } from "../../lib/email/resend.ts";
import { deliverNextOrderEmail } from "../../lib/email/worker.ts";
import { EmailSendError, type EmailJob, type EmailMessage, type EmailQueue } from "../../lib/email/contracts.ts";
import { authorizedEmailDispatch } from "../../lib/email/authorization.ts";
import { authErrorMessage } from "../../lib/auth-errors.ts";

const config = { apiKey: "re_fixture_key", fromEmail: "orders@example.test", siteUrl: "https://shop.example.test", replyTo: "support@example.test" };
const snapshot = { code: "FAU-TEST", customer_name: '<img src=x onerror="alert(1)">', customer_email: "buyer@example.test", shipping_address: "Strada <Test> 1", items: [{ name: "Vază & bol", quantity: 2, unit_price: 100 }], subtotal: 200, discount: 20, shipping: 19, total: 199, invoice_url: "https://invoice.stripe.com/i/fixture", test_mode: true };
const job = (): EmailJob => ({ id: "10000000-0000-4000-8000-000000000001", order_code: snapshot.code, snapshot, message: null, attempts: 1, first_attempt_at: new Date().toISOString(), lock_token: "token" });

test("paid-order email escapes customer content, uses actual totals and labels Stripe test mode", () => {
  const email = buildOrderEmail(snapshot, config);
  assert.match(email.subject, /^\[TEST\] Faurio/);
  assert.ok(!email.html.includes('<img src=x'));
  assert.match(email.html, /&lt;img/);
  assert.match(email.html, /Vază &amp; bol/);
  assert.match(email.text, /199/);
  assert.match(email.text, /nu s-au încasat bani reali/);
  assert.deepEqual(email.to, ["buyer@example.test"]);
  assert.equal(email.from, "Faurio <orders@example.test>");
  assert.ok(!buildOrderEmail({ ...snapshot, test_mode: false }, config).subject.includes("[TEST]"));
});
test("email never includes unsafe invoice links or invalid order payloads", () => {
  for (const invoice_url of ["javascript:alert(1)", "https://evil.example/invoice", "https://invoice.stripe.com.evil.example/"]) {
    assert.ok(!buildOrderEmail({ ...snapshot, invoice_url }, config).html.includes("Deschide documentul"));
  }
  assert.throws(() => buildOrderEmail({ ...snapshot, items: [] }, config));
  assert.throws(() => buildOrderEmail({ ...snapshot, customer_email: "a@example.test\r\nBcc:x@example.test" }, config));
});
test("missing keys and header injection cannot configure the email service", () => {
  assert.equal(readEmailConfig({}), null);
  assert.equal(readEmailConfig({ RESEND_API_KEY: "re_fixture", EMAIL_FROM: "sender@example.test\nBcc:evil@example.test" }), null);
  assert.ok(readEmailConfig({ RESEND_API_KEY: "re_fixture", EMAIL_FROM: "sender@example.test" }));
  assert.equal(authorizedEmailDispatch(null, "a".repeat(32)), false);
  assert.equal(authorizedEmailDispatch("Bearer short", "short"), false);
  assert.equal(authorizedEmailDispatch(`Bearer ${"a".repeat(32)}`, "a".repeat(32)), true);
  assert.equal(authorizedEmailDispatch(`Bearer ${"b".repeat(32)}`, "a".repeat(32)), false);
});
test("Resend requests use a stable idempotency key and never swallow provider errors", async () => {
  const message = buildOrderEmail(snapshot, config);
  let captured: RequestInit | undefined;
  const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => { assert.equal(url, "https://api.resend.com/emails"); captured = init; return Response.json({ id: "provider-fixture" }); }) as typeof fetch;
  assert.equal(await sendResendEmail(message, "job-id", config.apiKey, fakeFetch), "provider-fixture");
  assert.equal((captured!.headers as Record<string, string>)["Idempotency-Key"], "order-confirmation/job-id");
  assert.deepEqual(JSON.parse(captured!.body as string), message);
  for (const status of [401, 403, 422, 429, 500]) {
    await assert.rejects(sendResendEmail(message, "job-id", config.apiKey, (async () => new Response("error", { status })) as typeof fetch), (error: unknown) => error instanceof EmailSendError && error.retryable === (status === 429 || status >= 500));
  }
});
test("worker persists the exact message before sending and reuses it after an acknowledgement failure", async () => {
  const current = job();
  let persisted: EmailMessage | null = null;
  let acknowledgements = 0;
  const physicalSends = new Map<string, EmailMessage>();
  const queue: EmailQueue = {
    claim: async () => ({ ...current, message: persisted }),
    prepare: async (_job, message) => persisted ||= message,
    finish: async () => { if (++acknowledgements === 1) throw new Error("Database temporarily unavailable after acceptance"); },
  };
  const send = async (message: EmailMessage, id: string) => {
    if (physicalSends.has(id)) assert.deepEqual(message, physicalSends.get(id)); else physicalSends.set(id, structuredClone(message));
    return "provider-fixture";
  };
  await assert.rejects(deliverNextOrderEmail(queue, config, send));
  assert.equal(await deliverNextOrderEmail(queue, { ...config, fromEmail: "changed@example.test" }, send), "sent");
  assert.equal(physicalSends.size, 1);
  assert.equal(persisted!.from, "Faurio <orders@example.test>");
});
test("expired idempotency windows and permanent provider failures do not resend blindly", async () => {
  let current = job();
  const states: string[] = [];
  let sends = 0;
  const queue: EmailQueue = { claim: async () => current, prepare: async (_job, message) => message, finish: async (_job, status) => { states.push(status); } };
  const send = async () => { sends++; throw new EmailSendError("RESEND_HTTP_403", false); };
  assert.equal(await deliverNextOrderEmail(queue, config, send), "blocked");
  current = { ...job(), first_attempt_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() };
  assert.equal(await deliverNextOrderEmail(queue, config, send), "uncertain");
  assert.equal(sends, 1);
  assert.deepEqual(states, ["blocked", "uncertain"]);
});
test("reported Supabase SMTP failures and throttles have honest user-facing messages", () => {
  assert.match(authErrorMessage({ code: "unexpected_failure", message: "Error sending confirmation email" }), /nu a putut fi trimis/);
  assert.match(authErrorMessage({ code: "over_email_send_rate_limit" }), /Așteaptă/);
});

test("temporary payload persistence errors are retried, while invalid snapshots never reach the provider", async () => {
  let current = job();
  const states: string[] = [];
  const queue: EmailQueue = { claim: async () => current, prepare: async () => { throw new Error("temporary database failure"); }, finish: async (_job, status) => { states.push(status); } };
  const send = async () => { throw new Error("Provider must not be called before durable preparation"); };
  assert.equal(await deliverNextOrderEmail(queue, config, send), "failed");
  current = { ...job(), snapshot: {} };
  assert.equal(await deliverNextOrderEmail(queue, config, send), "blocked");
  assert.deepEqual(states, ["failed", "blocked"]);
});
