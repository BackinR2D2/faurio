import { test } from "node:test";
import assert from "node:assert/strict";
import { aiIntentSchema, extractGroqIntent, mergeAiIntent, redactSearch, type AiIntent } from "../../lib/search/ai.ts";
import { searchFailureNotice, searchFailureReason } from "../../lib/search/status.ts";

const taxonomy = { productTypes: ["Pahar", "Vază", "Cană", "Jurnal", "Semn de carte"], categories: ["Ceramică", "Sticlărie", "Papetărie"], materials: ["ceramică", "sticlă"], colors: ["bej", "maro"] };
const empty: AiIntent = { queryMode: "exact", productTypes: [], requiredTerms: [], rankingTerms: [], category: null, minPrice: null, maxPrice: null, colors: [], materials: [], excludedMaterials: [], excludedColors: [], excludedProductTypes: [], colorMatch: "all", materialMatch: "all", personalizable: false, inStock: false, ready: false, evidence: { personalizable: null, inStock: null, ready: null }, explanation: "", recommendations: [] };

test("search diagnostics distinguish setup failures without leaking raw errors or credentials", () => {
  assert.equal(searchFailureReason(new Error("AI_SEARCH_MIGRATION_REQUIRED")), "AI_SEARCH_MIGRATION_REQUIRED");
  assert.match(searchFailureNotice("AI_SEARCH_MIGRATION_REQUIRED"), /configurării/);
  assert.doesNotMatch(searchFailureNotice("AI_PROVIDER_429"), /filtre exacte|nu este disponibil|fără AI/);
  assert.equal(searchFailureReason(new Error("AI_PROVIDER_401")), "AI_PROVIDER_401");
  assert.equal(searchFailureReason(new Error("secret credential or customer query")), "AI_RESPONSE_INVALID");
  assert.equal(searchFailureReason(new DOMException("timeout", "TimeoutError")), "AI_TIMEOUT");
});

test("AI cannot broaden explicit brown T-shirt, budget or stock constraints", () => {
  const result = mergeAiIntent("as cauta un tricou maro, am un buget de 100 de lei maxim.", { ...empty, productTypes: ["Vază"], maxPrice: 500 }, taxonomy);
  assert.ok(result.requiredTerms?.includes("tricou")); assert.ok(result.filters.colors.includes("maro")); assert.equal(result.filters.maxPrice, 100);
  const glass = mergeAiIntent("Pahare sub 100 lei în stoc", { ...empty, productTypes: ["Vază"] }, taxonomy);
  assert.deepEqual(glass.productTypes, ["Pahar", "Set de pahare"]); assert.equal(glass.filters.inStock, true);
  assert.deepEqual(mergeAiIntent("tricou maro sub 100 lei",{...empty,requiredTerms:["tricou maro","maro"],colors:["maro"]},taxonomy).requiredTerms,["tricou"]);
  assert.ok(mergeAiIntent("pahare cu dinozauri",{...empty},taxonomy).requiredTerms?.includes("dinozauri"));
  const mistakenMode = mergeAiIntent("Caut pahare sub 100 lei", { ...empty, queryMode: "discovery", recommendations: [] }, taxonomy);
  assert.equal(mistakenMode.queryMode, "exact");
  assert.deepEqual(mistakenMode.productTypes, ["Pahar", "Set de pahare"]);
  assert.equal(mistakenMode.unsupported, false);
  const plural = mergeAiIntent("pahare sub 100 lei", { ...empty, productTypes: ["Pahar"], requiredTerms: ["pahare"] }, taxonomy);
  assert.deepEqual(plural.requiredTerms, []);
  assert.deepEqual(mergeAiIntent("pahare cu dinozauri", { ...empty, requiredTerms: ["pahare dinozauri"] }, taxonomy).requiredTerms, ["dinozauri"]);
});
test("AI can turn a story into soft semantic vocabulary without requiring story filler", () => {
  const result = mergeAiIntent("Aș dori ceva pentru cineva care adoră ritualul lent al dimineților și mirosul cafelei proaspete", { ...empty, queryMode: "discovery", requiredTerms: ["ritual lent"], rankingTerms: ["cafea", "cană", "ceașcă"], recommendations: [{ productType: "Cană", reason: "O idee pentru cafeaua de dimineață." }] }, taxonomy);
  assert.equal(result.engine, "groq"); assert.ok(result.rankingTerms?.includes("cafea")); assert.deepEqual(result.requiredTerms, []);
  assert.deepEqual(result.productTypes, ["Cană"]);
  assert.equal(result.unsupported, false);
});
test("sets, multiple product families, exclusions and decimal budgets stay precise", () => {
  const catalog = { ...taxonomy, productTypes: [...taxonomy.productTypes, "Set de pahare"] };
  const set = mergeAiIntent("un set de pahare, între 80,50 și 150,75 lei", { ...empty, productTypes: ["Pahar"] }, catalog);
  assert.deepEqual(set.productTypes, ["Set de pahare"]);
  assert.equal(set.filters.minPrice, 80.5);
  assert.equal(set.filters.maxPrice, 150.75);
  const mixed = mergeAiIntent("o cană sau un jurnal sub 200 lei", { ...empty, category: "Ceramică", productTypes: ["Cană", "Jurnal"] }, catalog);
  assert.deepEqual(mixed.productTypes, ["Cană", "Jurnal"]);
  assert.equal(mixed.filters.category, undefined);
  const negative = mergeAiIntent("cadou profesor, fără vaze, nu maro, nu e urgent", { ...empty, queryMode: "discovery", colors: ["maro"], recommendations: [{ productType: "Vază", reason: "Decor." }, { productType: "Jurnal", reason: "Pentru notițe." }] }, catalog);
  assert.deepEqual(negative.productTypes, ["Jurnal"]);
  assert.deepEqual(negative.filters.excludedProductTypes, ["Vază"]);
  assert.deepEqual(negative.filters.excludedColors, ["maro"]);
  assert.deepEqual(negative.filters.colors, []);
  assert.equal(negative.filters.ready, false);
  const alternatives = mergeAiIntent("o cană albă sau albastră", { ...empty, colorMatch: "any", colors: ["albă", "albastră"] }, catalog);
  assert.equal(alternatives.filters.colorMatch, "any");
  assert.deepEqual(new Set(alternatives.filters.colors), new Set(["alb", "albastru"]));
});
test("provider schema-generation failure is retried once, but other errors are not hidden", async () => {
  let calls = 0;
  const provider = (async () => {
    calls++;
    return calls === 1 ? Response.json({ error: { code: "json_validate_failed" } }, { status: 400 }) : Response.json({ choices: [{ message: { content: JSON.stringify(empty) } }] });
  }) as typeof fetch;
  assert.deepEqual(await extractGroqIntent("pahar", taxonomy, "fixture", undefined, provider), empty);
  assert.equal(calls, 2);
  calls = 0;
  await assert.rejects(extractGroqIntent("pahar", taxonomy, "fixture", undefined, (async () => { calls++; return Response.json({ error: { code: "json_validate_failed" } }, { status: 400 }); }) as typeof fetch));
  assert.equal(calls, 2);
});
test("recipient stories do not become literal product features or inferred product colors", () => {
  const result = mergeAiIntent("O cană pentru unchiul meu care este profesor și are ochi albaștri, sub 180 lei", { ...empty, productTypes: ["Cană"], category: "Ceramică", maxPrice: 180 }, taxonomy);
  assert.deepEqual(result.productTypes, ["Cană"]);
  assert.deepEqual(result.requiredTerms, []);
  assert.deepEqual(result.filters.recipients, []);
  assert.deepEqual(result.filters.colors, []);
  assert.equal(result.filters.category, undefined);
  assert.equal(result.filters.maxPrice, 180);
  assert.deepEqual(mergeAiIntent("pahar cu dinozauri", empty, taxonomy).requiredTerms, ["dinozauri"]);
});
test("teacher gift stories select useful inventory types, never mandatory recipient words", () => {
  const ai = { ...empty, queryMode: "discovery" as const, maxPrice: 500, explanation: "Idei pentru notițe și lectură.", recommendations: [{ productType: "Jurnal", reason: "Pentru notițe la cursuri." }, { productType: "Semn de carte", reason: "Pentru a păstra pagina în timpul lecturii." }] };
  for (const query of ["vreau sa cumpar un cadou unchiului meu care e profesor, in buget de 250 de lei maxim", "cadou profesor sub 250 lei", "Cadou pentru cineva cu ochi albaștri care predă, sub 250 lei"]) {
    const result = mergeAiIntent(query, ai, taxonomy);
    assert.deepEqual(result.productTypes, ["Jurnal", "Semn de carte"]);
    assert.deepEqual(result.requiredTerms, []);
    assert.equal(result.filters.maxPrice, 250);
    assert.deepEqual(result.filters.colors, []);
    assert.deepEqual(result.filters.recipients, []);
    assert.equal(result.filters.occasion, undefined);
  }
});
test("no grounded discovery recommendations means no results, not all products under budget", () => {
  const result = mergeAiIntent("cadou pentru unchiul meu sub 250 lei", { ...empty, queryMode: "discovery", rankingTerms: ["cadou"] }, taxonomy);
  assert.equal(result.unsupported, true);
  assert.throws(() => mergeAiIntent("cadou", { ...empty, queryMode: "discovery", recommendations: [{ productType: "Pix magic", reason: "Inventat" }] }, taxonomy));
});
test("AI cannot invent urgent shipping or personalization constraints absent from the story", () => {
  const result = mergeAiIntent("cadou pentru profesor sub 250 lei", { ...empty, queryMode: "discovery", ready: true, inStock: true, personalizable: true, recommendations: [{ productType: "Jurnal", reason: "Pentru notițe." }] }, taxonomy);
  assert.equal(result.filters.ready, false);
  assert.equal(result.filters.inStock, false);
  assert.equal(result.filters.personalizable, false);
  const explicit = mergeAiIntent("cadou profesor, să fie gata în două zile", { ...empty, queryMode: "discovery", ready: true, evidence: { ...empty.evidence, ready: "gata în două zile" }, recommendations: [{ productType: "Jurnal", reason: "Pentru notițe." }] }, taxonomy);
  assert.equal(explicit.filters.ready, true);
});
test("Romanian style inflections retain canonical catalog ranking vocabulary", () => {
  const result = mergeAiIntent("Ceramică minimalistă pentru casă nouă", { ...empty, rankingTerms: ["minimalistă"], materials: ["ceramică"] }, taxonomy);
  assert.equal(result.freeText, "");
  assert.ok(result.rankingTerms?.includes("minimalist"));
  assert.equal(result.filters.mood, "minimalist");
  assert.equal(result.filters.occasion, "casă nouă");
});
test("invented taxonomy, extra fields, unsafe operators and contradictory prices are rejected", () => {
  assert.throws(() => mergeAiIntent("cadou", { ...empty, productTypes: ["Unicorn inventat"] }, taxonomy));
  assert.equal(aiIntentSchema.safeParse({ ...empty, sql: "select *" }).success, false);
  assert.equal(aiIntentSchema.safeParse({ ...empty, requiredTerms: ["% OR 1=1"] }).success, false);
  assert.equal(mergeAiIntent("pahare între 120 și 100 lei", empty, taxonomy).unsupported, true);
});
test("inventory prices cannot become invented budget constraints",()=>{
  const result=mergeAiIntent("vaza pentru flori",{...empty,productTypes:["Vază"],minPrice:189,maxPrice:239},taxonomy);
  assert.equal(result.filters.minPrice,undefined);assert.equal(result.filters.maxPrice,undefined);
  const limited=mergeAiIntent("vaza sub 100 lei",{...empty,minPrice:189,maxPrice:239},taxonomy);
  assert.equal(limited.filters.minPrice,undefined);assert.equal(limited.filters.maxPrice,100);
  const minimum=mergeAiIntent("vaza de la 80,50 lei",{...empty,minPrice:189,maxPrice:239},taxonomy);
  assert.equal(minimum.filters.minPrice,80.5);assert.equal(minimum.filters.maxPrice,undefined);
});
test("Groq transport uses strict schema, inventory grounding, a timeout and redacted user text", async () => {
  const fake = (async (url: string | URL | Request, init?: RequestInit) => {
    assert.equal(url, "https://api.groq.com/openai/v1/chat/completions");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.response_format.json_schema.strict, true); assert.ok(init?.signal);
    assert.match(body.messages[0].content, /REAL INVENTORY/);
    assert.ok(!body.messages[1].content.includes("buyer@example.test"));
    assert.ok(!body.messages[1].content.includes("0722123456"));
    return Response.json({ choices: [{ message: { content: JSON.stringify(empty) } }] });
  }) as typeof fetch;
  assert.deepEqual(await extractGroqIntent("cadou buyer@example.test 0722123456", taxonomy, "fixture", undefined, fake), empty);
  await assert.rejects(extractGroqIntent("cadou", taxonomy, "fixture", undefined, (async () => new Response("", { status: 429 })) as typeof fetch));
  assert.ok(!redactSearch("Contact buyer@example.test").includes("buyer@example.test"));
});
