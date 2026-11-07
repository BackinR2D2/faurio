import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogHref, catalogIntegerPriceBounds, catalogMaterialOr, catalogStringList, changedCatalogFilters, parseCatalogFilters, visibleCatalogFilters } from "../../lib/catalog-filters.ts";
import { interpretNaturalQuery } from "../../lib/search-intent.ts";

const options = { categories: ["Ceramică", "Papetărie"], materials: ["ceramică", "hârtie"], productTypes: ["Cană", "Jurnal"], typeCategories: { "Cană": ["Ceramică"], "Jurnal": ["Papetărie"] } };
test("integer database predicates preserve exact decimal budget semantics without mutating filters", () => {
  const filters = { minPrice: 132.38, maxPrice: 149.99 };
  assert.deepEqual(catalogIntegerPriceBounds(filters), { minPrice: 133, maxPrice: 149 });
  assert.deepEqual(filters, { minPrice: 132.38, maxPrice: 149.99 });
  for (const minimum of [undefined, 0, 0.01, 80.5, 132, 132.38, 150.75]) {
    for (const maximum of [undefined, 0, 0.38, 132, 132.38, 149.99, 200]) {
      const bounds = catalogIntegerPriceBounds({ minPrice: minimum, maxPrice: maximum });
      for (let price = 0; price <= 250; price++) {
        const expected = (minimum === undefined || price >= minimum) && (maximum === undefined || price <= maximum);
        const actual = (bounds.minPrice === undefined || price >= bounds.minPrice) && (bounds.maxPrice === undefined || price <= bounds.maxPrice);
        assert.equal(actual, expected, JSON.stringify({ minimum, maximum, price }));
      }
    }
  }
});
test("integer price predicates retain zero and omit non-finite bounds", () => {
  assert.deepEqual(catalogIntegerPriceBounds({ minPrice: 0, maxPrice: 0 }), { minPrice: 0, maxPrice: 0 });
  assert.deepEqual(catalogIntegerPriceBounds({ minPrice: NaN, maxPrice: Infinity }), { minPrice: undefined, maxPrice: undefined });
  assert.deepEqual(catalogIntegerPriceBounds({}), { minPrice: undefined, maxPrice: undefined });
});
test("catalog filter URLs round-trip multiple selections, zero and decimal prices", () => {
  const filters = { categories: ["Ceramică", "Papetărie"], materials: ["ceramică", "hârtie reciclată"], productTypes: ["Cană", "Jurnal"], minPrice: 0, maxPrice: 150.75, ready: true, sort: "pret-mic" as const };
  const url = new URL(catalogHref("cadou", filters, 3), "https://example.test");
  const params = Object.fromEntries([...new Set(url.searchParams.keys())].map(key => [key, url.searchParams.getAll(key).length > 1 ? url.searchParams.getAll(key) : url.searchParams.get(key)!]));
  assert.deepEqual(parseCatalogFilters(params), { ...filters, minRating: undefined });
  assert.equal(url.searchParams.get("page"), "3");
  assert.equal(url.searchParams.get("q"), "cadou");
});
test("legacy singular filters stay valid and malformed inputs are bounded", () => {
  const parsed = parseCatalogFilters({ categorie: "Textile", material: ["in", "in", "argint", "x\u0000", "a".repeat(161)], pret: "NaN", pretMin: "-1" });
  assert.deepEqual(parsed.categories, ["Textile"]);
  assert.deepEqual(parsed.materials, ["in", "argint"]);
  assert.equal(parsed.maxPrice, undefined);
  assert.equal(parsed.minPrice, undefined);
  assert.equal(new URL(catalogHref("", { category: "Textile", material: "in" }), "https://example.test").searchParams.get("material"), "in");
});
test("seller materials with punctuation remain literal, not wildcard or filter expressions", () => {
  const parsed = parseCatalogFilters({ material: ['bumbac 100%', 'lemn (nuc)', 'x"),stock.gt.0'] });
  assert.equal(parsed.materials?.length, 3);
  assert.equal(catalogMaterialOr(["in"]), 'material.imatch."(^|[^[:alnum:]])in([^[:alnum:]]|$)"');
  assert.equal(catalogMaterialOr(["a.*b"]), `material.imatch.${JSON.stringify("a\\.\\*b")}`);
  assert.equal(catalogMaterialOr(['x"),stock.gt.0']), `material.imatch.${JSON.stringify('x"\\),stock\\.gt\\.0')}`);
  assert.equal(catalogStringList(['Tip "special"', "Tip (mare)"]), `(${JSON.stringify('Tip "special"')},${JSON.stringify("Tip (mare)")})`);
});
test("interpreted request fills budget, categories, multiple types, materials and shipping", () => {
  const intent = { ...interpretNaturalQuery("O cană sau un jurnal sub 250 lei"), productTypes: ["Cană", "Jurnal"] };
  intent.filters.materials = ["ceramică", "hârtie"];
  intent.filters.ready = true;
  const visible = visibleCatalogFilters({}, intent, options);
  assert.deepEqual(visible.categories, ["Ceramică", "Papetărie"]);
  assert.deepEqual(visible.productTypes, ["Cană", "Jurnal"]);
  assert.deepEqual(visible.materials, ["ceramică", "hârtie"]);
  assert.equal(visible.maxPrice, 250);
  assert.equal(visible.ready, true);
});
test("manual refinements preserve hard query limits and unchanged inferred filters are not persisted", () => {
  const intent = interpretNaturalQuery("pahare între 80,50 și 150,75 lei");
  const visible = visibleCatalogFilters({ minPrice: 0, maxPrice: 999 }, intent, options);
  assert.equal(visible.minPrice, 80.5);
  assert.equal(visible.maxPrice, 150.75);
  assert.deepEqual(changedCatalogFilters(visible, { ...visible, minRating: 4.5 }), { minRating: 4.5 });
  assert.deepEqual(changedCatalogFilters(visible, { ...visible, materials: ["in", "bumbac"] }), { materials: ["in", "bumbac"] });
});
test("failed interpretations never silently populate guessed filters", () => {
  const intent = { ...interpretNaturalQuery("cana sub 100 lei"), failure: "AI_UNAVAILABLE" };
  const visible = visibleCatalogFilters({}, intent, options);
  assert.equal(visible.maxPrice, undefined);
  assert.deepEqual(visible.productTypes, []);
  assert.deepEqual(visible.categories, []);
});
