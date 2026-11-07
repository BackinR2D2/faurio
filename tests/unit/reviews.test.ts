import { test } from "node:test";
import assert from "node:assert/strict";
import { reviewSubmissionSchema, safeAccountDestination } from "../../lib/reviews.ts";
import { createClient } from "@supabase/supabase-js";
import { eligibleReviewOrders } from "../../lib/review-queries.ts";

const submission = { code: "FAU-TEST", productId: "cana-luna-001", rating: 5, body: "O cană foarte frumoasă." };
test("reviews require a real order identifier, whole stars and a bounded nonempty comment", () => {
  assert.equal(reviewSubmissionSchema.safeParse(submission).success, true);
  assert.equal(reviewSubmissionSchema.parse({ ...submission, body: "  Foarte bine.  " }).body, "Foarte bine.");
  for (const patch of [{ rating: 0 }, { rating: 6 }, { rating: 4.5 }, { rating: "5" }, { code: "" }, { productId: "" }, { body: "     " }, { body: "abcd" }, { body: "a".repeat(2001) }, { status: "approved" }, { buyerId: "another-user" }]) {
    assert.equal(reviewSubmissionSchema.safeParse({ ...submission, ...patch }).success, false, JSON.stringify(patch));
  }
});
test("sign-in returns to the product reviews without allowing external or privileged redirects", () => {
  for (const path of ["/produs/cana-luna-001#recenzii", "/produs/product_2", "/studio/appearance?shop=1", "/sell"]) assert.equal(safeAccountDestination(path), path);
  for (const path of [null, "https://evil.example/", "//evil.example", "/produs/../admin", "/produs/x?next=//evil.example", "/admin", "javascript:alert(1)", "/produs/x#other"]) assert.equal(safeAccountDestination(path), "/cont/profil");
});
test("eligibility uses the actual foreign-key path, JSONB containment and mandatory buyer and delivery restrictions", async () => {
  let requested: URL | undefined;
  const db = createClient("https://fixture.supabase.co", "fixture-key", { auth: { persistSession: false }, global: { fetch: async (input, init) => {
    requested = new URL(String(input));
    assert.ok(init?.signal);
    return Response.json([]);
  } } });
  const result = await eligibleReviewOrders(db, "buyer-fixture", "cana-luna-001", ['FAU-"quoted"']);
  assert.equal(result.error, null);
  assert.equal(requested?.searchParams.get("user_id"), "eq.buyer-fixture");
  assert.equal(requested?.searchParams.get("status"), "eq.paid");
  assert.equal(requested?.searchParams.get("items"), 'cs.[{"id":"cana-luna-001"}]');
  assert.equal(requested?.searchParams.get("select"), "code,created_at,marketplace_order_finance!inner(seller_fulfillments!inner(state))");
  assert.equal(requested?.searchParams.get("marketplace_order_finance.seller_fulfillments.state"), "eq.delivered");
  assert.equal(requested?.searchParams.get("limit"), "20");
  assert.equal(requested?.searchParams.get("code"), `not.in.(${JSON.stringify('FAU-"quoted"')})`);
});
