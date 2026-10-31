import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateSellerAmounts, singleCheckoutShop,cartShippingByMaker } from "../../lib/commerce/fees.ts";
import { readEmailConfig } from "../../lib/email/config.ts";
import { smtpOptions } from "../../lib/email/smtp.ts";
import { deliverNextOrderEmail } from "../../lib/email/worker.ts";
import { EmailSendError, type EmailJob, type EmailQueue } from "../../lib/email/contracts.ts";

test("5.5% commission uses integer bani, excludes shipping and conserves money", () => {
  assert.deepEqual(calculateSellerAmounts(10000, 1900), { commissionMinor: 550, sellerTransferMinor: 11350 });
  for (const subtotal of [0, 1, 1234, 8999, 10000, 9999999]) { const a = calculateSellerAmounts(subtotal, 1900); assert.equal(a.commissionMinor + a.sellerTransferMinor, subtotal + 1900); }
  assert.throws(() => calculateSellerAmounts(10.1, 0)); assert.throws(() => calculateSellerAmounts(-1, 0));
  assert.throws(() => singleCheckoutShop([{ shopId: "a" }, { shopId: "b" }]), /separat/);
  assert.equal(singleCheckoutShop([{ shopId: "a" }, { shopId: "a" }]), "a");
});
test("mixed-maker shipping never promises a single free shipment based on combined subtotals",()=>{
  assert.deepEqual(cartShippingByMaker([{product:{shopId:"a",price:150},quantity:1},{product:{shopId:"b",price:150},quantity:1}]),{makers:2,shipping:38});
  assert.deepEqual(cartShippingByMaker([{product:{shopId:"a",price:150},quantity:1},{product:{shopId:"a",price:150},quantity:1}]),{makers:1,shipping:0});
});
test("institutional SMTP requires same authenticated sender and verified TLS, with no Resend key", () => {
  const config = readEmailConfig({ EMAIL_PROVIDER: "smtp", SMTP_HOST: "smtp.gmail.com", SMTP_USER: "user@school.example", SMTP_PASS: "fixture-password", EMAIL_FROM: "user@school.example" });
  assert.equal(config?.provider, "smtp");
  if (config?.provider !== "smtp") throw new Error("SMTP config expected");
  const options = smtpOptions(config); assert.equal(options.secure, true); assert.equal(options.requireTLS, true); assert.equal(options.disableUrlAccess, true);
  assert.equal(readEmailConfig({ EMAIL_PROVIDER: "smtp", SMTP_HOST: "smtp.gmail.com", SMTP_USER: "user@school.example", SMTP_PASS: "fixture-password", EMAIL_FROM: "spoof@example.test" }), null);
});
test("SMTP ambiguity is marked uncertain, never automatically retried as if idempotent", async () => {
  const config = readEmailConfig({ EMAIL_PROVIDER: "smtp", SMTP_HOST: "smtp.gmail.com", SMTP_USER: "user@school.example", SMTP_PASS: "fixture-password", EMAIL_FROM: "user@school.example" })!;
  const job: EmailJob = { id: "job", order_code: "FAU-TEST", snapshot: {}, message: { from: "sender", to: ["buyer@example.test"], subject: "Test", html: "test", text: "test", delivery_provider: "smtp" }, attempts: 1, first_attempt_at: new Date().toISOString(), lock_token: "token" };
  const states: string[] = [];
  const queue: EmailQueue = { claim: async () => job, prepare: async (_job, message) => message, finish: async (_job, status) => { states.push(status); } };
  assert.equal(await deliverNextOrderEmail(queue, config, async () => { throw new EmailSendError("SMTP_DELIVERY_UNCERTAIN", true); }), "uncertain");
  assert.deepEqual(states, ["uncertain"]);
});
