import { test } from "node:test";
import assert from "node:assert/strict";
import { aiIntentSchema, extractGroqIntent, mergeAiIntent, redactSearch, type AiIntent } from "../../lib/search/ai.ts";
import { searchFailureNotice, searchFailureReason } from "../../lib/search/status.ts";

const taxonomy = { productTypes: ["Pahar", "Vază", "Cană"], categories: ["Ceramică", "Sticlărie"], materials: ["ceramică", "sticlă"], colors: ["bej", "maro"] };
const empty: AiIntent = { queryMode: "exact", productTypes: [], requiredTerms: [], rankingTerms: [], category: null, minPrice: null, maxPrice: null, colors: [], materials: [], excludedMaterials: [], personalizable: false, inStock: false, ready: false };

test("search diagnostics distinguish setup failures without leaking raw errors or credentials", () => {
  assert.equal(searchFailureReason(new Error("AI_SEARCH_MIGRATION_REQUIRED")), "AI_SEARCH_MIGRATION_REQUIRED");
  assert.match(searchFailureNotice("AI_SEARCH_MIGRATION_REQUIRED"), /configurării/);
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
});
test("AI can turn a story into soft semantic vocabulary without requiring story filler", () => {
  const result = mergeAiIntent("Aș dori ceva pentru cineva care adoră ritualul lent al dimineților și mirosul cafelei proaspete", { ...empty, queryMode: "discovery", requiredTerms: ["ritual lent"], rankingTerms: ["cafea", "cană", "ceașcă"] }, taxonomy);
  assert.equal(result.engine, "groq"); assert.deepEqual(result.rankingTerms, ["cafea", "cană", "ceașcă"]); assert.deepEqual(result.requiredTerms, []);
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
  assert.equal(mergeAiIntent("pahare sub 100 lei", { ...empty, minPrice: 120 }, taxonomy).unsupported, true);
});
test("Groq transport uses strict schema, a timeout and redacted user text, never product choices", async () => {
  const fake = (async (url: string | URL | Request, init?: RequestInit) => {
    assert.equal(url, "https://api.groq.com/openai/v1/chat/completions");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.response_format.json_schema.strict, true); assert.ok(init?.signal);
    assert.ok(!body.messages[1].content.includes("buyer@example.test"));
    assert.ok(!body.messages[1].content.includes("0722123456"));
    return Response.json({ choices: [{ message: { content: JSON.stringify(empty) } }] });
  }) as typeof fetch;
  assert.deepEqual(await extractGroqIntent("cadou buyer@example.test 0722123456", taxonomy, "fixture", undefined, fake), empty);
  await assert.rejects(extractGroqIntent("cadou", taxonomy, "fixture", undefined, (async () => new Response("", { status: 429 })) as typeof fetch));
  assert.ok(!redactSearch("Contact buyer@example.test").includes("buyer@example.test"));
});
