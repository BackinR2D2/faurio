import { test } from "node:test";
import assert from "node:assert/strict";
import { applicationSchema, defaultLayout, layoutSchema, moveBlock, moveBlockTo, productInputSchema } from "../../lib/marketplace/contracts.ts";

test("safe layout permits distinct themes and literal text, never arbitrary embeds/styles", () => {
  assert.equal(layoutSchema.safeParse({ ...defaultLayout(), theme: "clay" }).success, true);
  assert.equal(layoutSchema.safeParse({ ...defaultLayout(), theme: "botanical" }).success, true);
  assert.equal(layoutSchema.safeParse({ ...defaultLayout(), html: "<script>alert(1)</script>" }).success, false);
  assert.equal(layoutSchema.safeParse({ ...defaultLayout(), cover: "javascript:alert(1)" }).success, false);
  assert.equal(layoutSchema.safeParse({ ...defaultLayout(), theme: "url(https://attacker.test)" }).success, false);
});
test("block reorder has stable identity and cannot hide products", () => {
  const initial = defaultLayout();
  const moved = moveBlock(initial, 0, 1);
  assert.equal(moved.blocks[1].type, "hero");
  assert.equal(initial.blocks[0].type, "hero");
  assert.deepEqual(moveBlock(initial, 0, -1), initial);
  assert.equal(layoutSchema.safeParse({ ...initial, blocks: initial.blocks.map((block) => ({ ...block, visible: false })) }).success, false);
  assert.equal(layoutSchema.safeParse({ ...initial, blocks: initial.blocks.map(() => ({ type: "hero", visible: true })) }).success, false);
});
test("shop application rejects privilege flags, malformed slugs and absent consent", () => {
  const application = { name: "Atelier", slug: "atelier-test", country: "RO", location: "Brașov", termsVersion: "seller-2026-10" };
  assert.equal(applicationSchema.safeParse(application).success, true);
  assert.equal(applicationSchema.safeParse({ ...application, status: "active" }).success, false);
  assert.equal(applicationSchema.safeParse({ ...application, slug: "../admin" }).success, false);
  assert.equal(applicationSchema.safeParse({ ...application, termsVersion: "" }).success, false);
});
test("drag reorder moves only the selected section and rejects forged indices", () => {
  const layout = defaultLayout();
  assert.deepEqual(moveBlockTo(layout, 0, 2).blocks.map((block) => block.type).slice(0, 3), ["products", "story", "hero"]);
  assert.deepEqual(moveBlockTo(layout, -1, 1), layout);
  assert.deepEqual(moveBlockTo(layout, 1, 99), layout);
  assert.equal(layoutSchema.safeParse(moveBlockTo(layout, 2, 0)).success, true);
});
test("seller input cannot set ownership, verification, active status or fractional stock", () => {
  const input = { name: "Vază test", product_type: "Vază", category: "Ceramică", price: 125, stock: 1, shipping_days: 3, material: "ceramică", color: "bej", description: "Vază realizată manual într-un atelier independent.", image: "/products/ceramica-luna.avif" };
  assert.equal(productInputSchema.safeParse(input).success, true);
  for (const patch of [{ shop_id: "forged" }, { active: true }, { rating: 5 }, { stock: 1.5 }, { price: -10 }, { image: "https://attacker.test/a.svg" }]) assert.equal(productInputSchema.safeParse({ ...input, ...patch }).success, false);
});
