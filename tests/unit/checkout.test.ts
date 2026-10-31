import { test } from "node:test";
import assert from "node:assert/strict";
import { checkoutSchema } from "../../lib/commerce/checkout-input.ts";

const checkout = { items: [{ id: "legacy-vase", quantity: 1 }], email: "buyer@example.test", customer: { name: "Buyer Test", phone: "+40700000000", address: "Strada Test 1", city: "Brașov", county: "Brașov", postalCode: "500001" }, coupon: "" };

test("normal storefront checkout payload satisfies the server contract", () => {
  assert.equal(checkoutSchema.safeParse(checkout).success, true);
  assert.equal(checkoutSchema.safeParse({...checkout,requestId:"10000000-0000-4000-8000-000000000001"}).success,true);
  assert.equal(checkoutSchema.safeParse({...checkout,requestId:"not-a-uuid"}).success,false);
});
test("checkout rejects client price and ownership tampering", () => {
  assert.equal(checkoutSchema.safeParse({ ...checkout, total: 1 }).success, false);
  assert.equal(checkoutSchema.safeParse({ ...checkout, items: [{ id: "legacy-vase", quantity: 1, unit_price: 1, shop_id: "other" }] }).success, false);
});
test("malformed quantities and incomplete fulfillment data cannot reach Stripe", () => {
  for (const quantity of [0, -1, 0.5, 11, NaN]) assert.equal(checkoutSchema.safeParse({ ...checkout, items: [{ id: "legacy-vase", quantity }] }).success, false);
  assert.equal(checkoutSchema.safeParse({ ...checkout, customer: { ...checkout.customer, address: "" } }).success, false);
});
