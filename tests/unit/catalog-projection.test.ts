import test from "node:test";
import assert from "node:assert/strict";
import { catalogCardColumns, legacyCatalogCardColumns, catalogCardProduct } from "../../lib/catalog-projection";
import type { Product } from "../../lib/catalog";

test("catalog projection excludes long detail fields, not prices, eligibility or verified ratings", () => {
  const columns = catalogCardColumns.split(",");
  for (const column of ["price", "old_price", "stock", "shop_id", "checkout_eligible", "rating_source", "image", "shipping_days"]) assert.ok(columns.includes(column));
  for (const column of ["story", "care", "description", "details", "search_vector"]) assert.ok(!columns.includes(column));
  for (const column of ["checkout_eligible", "shop_slug", "shop_id", "rating_source"]) assert.ok(!legacyCatalogCardColumns.split(",").includes(column));
});

test("card data stays usable for cart and favorites without sending full product stories", () => {
  const product = { id: "sample", name: "Farfurie", price: 149, stock: 3, shopId: "shop", checkoutEligible: false, description: "Long description", care: "Instructions", story: "Story", details: ["Detail"], occasion: ["gift"], moods: [], recipients: [] } as unknown as Product;
  const card = catalogCardProduct(product);
  assert.equal(card.price, product.price);
  assert.equal(card.stock, product.stock);
  assert.equal(card.checkoutEligible, false);
  assert.equal(card.shopId, "shop");
  assert.equal(card.description, "");
  assert.deepEqual(card.details, []);
  assert.equal(product.description, "Long description");
  assert.ok(JSON.stringify(card).length < JSON.stringify(product).length);
});
