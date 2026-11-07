import { test } from "node:test";
import assert from "node:assert/strict";
import { connectFailure } from "../../lib/commerce/connect-errors.ts";

test("missing Connect activation is actionable and never leaks provider details into the UI",()=>{
  const failure=connectFailure({type:"StripeInvalidRequestError",message:"You can only create new accounts if you've signed up for Connect, which you can do at https://dashboard.stripe.com/connect. SECRET"});
  assert.equal(failure?.status,503);assert.equal(failure?.code,"CONNECT_ACTIVATION_REQUIRED");
  assert.doesNotMatch(failure!.message,/Stripe|SECRET|https:/);
});
test("Connect failures preserve retryable service and rate limit errors without masking application errors",()=>{
  for (const [type,status,code] of [["StripeRateLimitError",429,"PAYMENT_RATE_LIMIT"],["StripeAuthenticationError",503,"PAYMENT_SETUP_REQUIRED"],["StripePermissionError",503,"PAYMENT_SETUP_REQUIRED"],["StripeInvalidRequestError",409,"ONBOARDING_UNAVAILABLE"],["StripeConnectionError",503,"PAYMENT_UNAVAILABLE"]] as const) {
    const result=connectFailure({type,message:"private-provider-details"});
    assert.equal(result?.status,status);assert.equal(result?.code,code);assert.doesNotMatch(result!.message,/private-provider-details/);
  }
  assert.equal(connectFailure(new Error("database error")),null);
  assert.equal(connectFailure(null),null);
});
