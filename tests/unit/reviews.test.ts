import { test } from "node:test";
import assert from "node:assert/strict";
import { reviewDeletionSchema, reviewSubmissionSchema, safeAccountDestination } from "../../lib/reviews.ts";
import { createClient } from "@supabase/supabase-js";
import { deleteOwnedReview, eligibleReviewOrders } from "../../lib/review-queries.ts";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductRating } from "../../components/product-rating.tsx";

const submission = { code: "FAU-TEST", productId: "cana-luna-001", rating: 5, body: "O cană foarte frumoasă." };
test("review deletion accepts only one review id, never a supplied owner or unbounded deletion", async () => {
  const id = "10000000-0000-4000-8000-000000000003";
  assert.deepEqual(reviewDeletionSchema.parse({id}),{id});
  for (const value of [{}, {id:""}, {id:"not-a-uuid"}, {id,buyerId:"someone-else"}, {id,status:"approved"}]) assert.equal(reviewDeletionSchema.safeParse(value).success,false);
  const db=createClient("https://fixture.supabase.co","fixture-key",{auth:{persistSession:false},global:{fetch:async(input,init)=>{
    const url=new URL(String(input));
    assert.equal(init?.method,"DELETE");assert.ok(init?.signal);
    assert.equal(url.searchParams.get("buyer_id"),"eq.owner-from-verified-session");
    assert.equal(url.searchParams.get("id"),`eq.${id}`);
    assert.equal(url.searchParams.get("select"),"id");
    return Response.json([{id}]);
  }}});
  assert.equal((await deleteOwnedReview(db,"owner-from-verified-session",id)).data?.id,id);
  assert.throws(()=>deleteOwnedReview(db,"",id),/REVIEW_OWNER_REQUIRED/);
  assert.throws(()=>deleteOwnedReview(db,"owner",""),/REVIEW_OWNER_REQUIRED/);
});
test("catalog stars show real counts, half stars and an honest empty rating",()=>{
  const populated=renderToStaticMarkup(createElement(ProductRating,{rating:4.5,count:2}));
  assert.match(populated,/4,5 din 5 stele, 2 recenzii/);
  assert.match(populated,/width:50%/);
  assert.match(populated,/\(2\)/);
  const empty=renderToStaticMarkup(createElement(ProductRating,{rating:4.9,count:0}));
  assert.match(empty,/0 recenzii/);assert.doesNotMatch(empty,/4,9/);
});
test("reviews accept an authenticated opinion without an order, whole stars and a bounded nonempty comment", () => {
  assert.equal(reviewSubmissionSchema.safeParse(submission).success, true);
  assert.equal(reviewSubmissionSchema.safeParse({productId:submission.productId,rating:4,body:submission.body}).success,true);
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
