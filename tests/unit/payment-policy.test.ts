import { test } from "node:test";
import assert from "node:assert/strict";
import { acceptsTestCheckoutSession, acceptsTestPaymentEvent, readPaymentPolicy } from "../../lib/commerce/payment-policy.ts";

test("existing test deployments remain supported without a new environment variable", () => {
  assert.deepEqual(readPaymentPolicy({ STRIPE_SECRET_KEY: "sk_test_fixture123" }), { mode: "test", ready: true, reason: null });
  assert.equal(readPaymentPolicy({ FAURIO_PAYMENT_MODE: "test", STRIPE_SECRET_KEY: "sk_test_fixture123" }).ready, true);
});

test("payments fail closed for live mode regardless of the configured key", () => {
  for (const key of [undefined, "sk_live_fixture123", "sk_test_fixture123"]) {
    assert.deepEqual(readPaymentPolicy({ FAURIO_PAYMENT_MODE: "live", STRIPE_SECRET_KEY: key }), { mode: "live", ready: false, reason: "LIVE_PAYMENTS_NOT_RELEASED" });
  }
});

test("disabled and unknown modes cannot fall back to test payments", () => {
  assert.deepEqual(readPaymentPolicy({ FAURIO_PAYMENT_MODE: "disabled", STRIPE_SECRET_KEY: "sk_test_fixture123" }), { mode: "disabled", ready: false, reason: "PAYMENTS_DISABLED" });
  for (const mode of ["", "LIVE", "production", " test", "test "]) assert.equal(readPaymentPolicy({ FAURIO_PAYMENT_MODE: mode, STRIPE_SECRET_KEY: "sk_test_fixture123" }).ready, false);
});

test("missing, live, public, partial and malformed keys are rejected without exposing secrets", () => {
  for (const key of [undefined, "", "sk_live_fixture123", "pk_test_fixture123", "sk_test_", "sk_test_fixture\n"]) {
    const result = readPaymentPolicy({ FAURIO_PAYMENT_MODE: "test", STRIPE_SECRET_KEY: key });
    assert.equal(result.ready, false);
    assert.equal(result.reason, "TEST_KEY_REQUIRED");
    assert.deepEqual(Object.keys(result).sort(), ["mode", "ready", "reason"]);
  }
});

test("signed webhooks still require an explicit test-mode event", () => {
  assert.equal(acceptsTestPaymentEvent({ livemode: false }), true);
  assert.equal(acceptsTestPaymentEvent({ livemode: true }), false);
  assert.equal(acceptsTestPaymentEvent({}), false);
});

test("checkout persistence requires both a test session identifier and test mode", () => {
  assert.equal(acceptsTestCheckoutSession({ id: "cs_test_fixture123", livemode: false }), true);
  for (const session of [{ id: "cs_live_fixture123", livemode: false }, { id: "cs_test_fixture123", livemode: true }, { id: "cs_test_fixture123" }, { id: "cs_test_", livemode: false }]) {
    assert.equal(acceptsTestCheckoutSession(session), false);
  }
});
