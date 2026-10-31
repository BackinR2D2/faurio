import { test } from "node:test";
import assert from "node:assert/strict";
import { interpretNaturalQuery } from "../../lib/search-intent.ts";

test("precise glass query cannot expand into ceramics or jewelry", () => {
  const intent = interpretNaturalQuery("Caut pahare sub 100 lei");
  assert.deepEqual(intent.productTypes, ["Pahar", "Set de pahare"]);
  assert.equal(intent.filters.category, "Sticlărie"); assert.equal(intent.filters.maxPrice, 100);
});
test("recognized style inflections are not mandatory literal product words", () => {
  for (const style of ["minimalistă", "minimaliste", "minimalist", "minimalisti"]) {
    const intent = interpretNaturalQuery(`Ceramică ${style} pentru casă nouă`);
    assert.equal(intent.freeText, "");
    assert.equal(intent.filters.mood, "minimalist");
    assert.deepEqual(intent.filters.materials, ["ceramică"]);
  }
  assert.equal(interpretNaturalQuery("vază naturalistă").freeText, "naturalista");
});
test("personalization is a hard constraint even if no matching inventory exists", () => {
  const intent = interpretNaturalQuery("Cadou pentru mama sub 150 lei, personalizabil");
  assert.equal(intent.filters.maxPrice, 150); assert.equal(intent.filters.personalizable, true);
  assert.deepEqual(intent.filters.recipients, ["mamă"]);
});
test("range, color and product type are extracted independently", () => {
  const intent = interpretNaturalQuery("Cercei argintii între 60 și 120 lei");
  assert.deepEqual(intent.productTypes, ["Cercei"]);
  assert.equal(intent.filters.minPrice, 60); assert.equal(intent.filters.maxPrice, 120); assert.equal(intent.filters.color, "argintiu");
});
test("diacritic and plain queries produce equivalent constraints", () => {
  const a = interpretNaturalQuery("Vreau o vază ceramică bej pentru casă nouă");
  const b = interpretNaturalQuery("Vreau o vaza ceramica bej pentru casa noua");
  assert.deepEqual(a.filters, b.filters); assert.equal(a.filters.color, "bej"); assert.equal(a.filters.occasion, "casă nouă");
});
test("Romanian preposition în is not mistaken for linen", () => {
  const intent = interpretNaturalQuery("Un cadou pentru profesoară, până în 100 RON");
  assert.equal(intent.filters.maxPrice, 100); assert.deepEqual(intent.filters.materials, []); assert.equal(intent.notice, undefined);
});
test("negative leather constraint survives positive cotton and linen clauses", () => {
  const intent = interpretNaturalQuery("Nu vreau piele; doar bumbac și in");
  assert.deepEqual(intent.filters.excludedMaterials, ["piele"]);
  assert.ok(intent.filters.materials.includes("bumbac")); assert.ok(intent.filters.materials.includes("in"));
  assert.ok(!intent.filters.materials.includes("piele"));
});
test("wood budget, actual stock and preparation time remain hard constraints", () => {
  const wood = interpretNaturalQuery("Produse din lemn lucrate manual, sub 200 lei");
  assert.equal(wood.filters.maxPrice, 200); assert.ok(wood.filters.materials.includes("lemn"));
  const ready = interpretNaturalQuery("Doar articole în stoc și gata de trimis");
  assert.equal(ready.filters.inStock, true); assert.equal(ready.filters.ready, true);
});
test("foreign currencies and contextless followups do not invent a conversion or recommendations", () => {
  const euro = interpretNaturalQuery("Show personalized handmade jewelry under 50 EUR");
  assert.equal(euro.unsupported, true); assert.equal(euro.filters.maxPrice, undefined); assert.match(euro.notice!, /RON/);
  assert.equal(interpretNaturalQuery("Vreau același lucru dar mai ieftin").unsupported, true);
});
test("deadline requests explain uncertainty instead of promising arrival", () => {
  assert.match(interpretNaturalQuery("Vază până vineri").notice!, /confirmată/);
});

test("a budget never discards the requested brown T-shirt", () => {
  const intent = interpretNaturalQuery("as cauta un tricou maro, am un buget de 100 de lei maxim.");
  assert.equal(intent.freeText, "tricou");
  assert.equal(intent.filters.color, "maro");
  assert.equal(intent.filters.maxPrice, 100);
  assert.equal(intent.strict, true);
  assert.ok(intent.summary.includes("termeni: tricou"));
  assert.ok(intent.summary.includes("culoare maro"));
});

test("unknown product terms survive every recognized contextual constraint", () => {
  for (const query of ["rucsac sub 100 lei", "rucsac maro", "rucsac pentru mama", "cadou rucsac personalizabil", "rucsac din bumbac în stoc"]) {
    assert.match(interpretNaturalQuery(query).freeText, /\brucsac\b/, query);
  }
  assert.equal(interpretNaturalQuery("Caut o vază Indigo sub 250 lei").freeText, "indigo");
  assert.equal(interpretNaturalQuery("Vreau pahare cu dinozauri, maxim 100 lei").freeText, "dinozauri");
});

test("budget placement and zero are preserved", () => {
  for (const query of ["pahare maxim 100 lei", "pahare 100 de lei maxim", "pahare, buget 100 RON", "pahare până la 100 lei"]) {
    const intent = interpretNaturalQuery(query);
    assert.equal(intent.filters.maxPrice, 100, query);
    assert.equal(intent.freeText, "", query);
  }
  assert.equal(interpretNaturalQuery("pahare sub 0 lei").filters.maxPrice, 0);
});

test("constraints do not leave conversational filler in valid gift searches", () => {
  for (const query of ["Cadou pentru mama sub 150 lei, personalizabil", "Un cadou pentru profesoară, până în 100 RON", "Produse din lemn lucrate manual, sub 200 lei", "Doar articole în stoc și gata de trimis", "Nu vreau piele; doar bumbac și in"]) {
    assert.equal(interpretNaturalQuery(query).freeText, "", query);
  }
});

test("candle holders are not mistaken for candles and empty requests do not recommend everything", () => {
  assert.deepEqual(interpretNaturalQuery("Suport de lumânare sub 150 lei").productTypes, ["Suport de lumânare"]);
  assert.equal(interpretNaturalQuery("aș vrea ceva te rog").unsupported, true);
});
