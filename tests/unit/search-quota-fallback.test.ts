import { test } from "node:test";
import assert from "node:assert/strict";
import { keywordQuotaFallback, withQuotaFallback } from "../../lib/search/quota-fallback.ts";
import { extractGroqIntent } from "../../lib/search/ai.ts";

test("only provider rate limits and the shared daily budget activate keyword fallback", async () => {
  for (const reason of ["AI_PROVIDER_429", "AI_SEARCH_BUDGET_EXHAUSTED"] as const) {
    const result = await withQuotaFallback("pahare sub 132,38 lei", async () => { throw new Error(reason); });
    assert.equal(result.engine, "keywords");
    assert.equal(result.fallbackReason, reason);
    assert.equal(result.failure, undefined);
    assert.equal(result.filters.maxPrice, 132.38);
    assert.deepEqual(result.productTypes, ["Pahar", "Set de pahare"]);
  }
  for (const reason of ["AI_PROVIDER_401", "AI_PROVIDER_403", "AI_PROVIDER_500", "AI_SEARCH_DATABASE_UNAVAILABLE", "AI_SEARCH_MIGRATION_REQUIRED", "AI_CONFIGURATION_REQUIRED", "AI_UNKNOWN_TAXONOMY", "AI_INVALID_RESPONSE"]) {
    await assert.rejects(withQuotaFallback("pahar", async () => { throw new Error(reason); }), { message: reason });
  }
  await assert.rejects(withQuotaFallback("pahar", async () => { throw new DOMException("timeout", "TimeoutError"); }), { name: "TimeoutError" });
});
test("Groq HTTP 429 transport activates fallback without retrying the exhausted provider", async () => {
  let calls = 0;
  const result = await withQuotaFallback("tricou maro sub 100 lei", async () => {
    await extractGroqIntent("tricou maro sub 100 lei", { productTypes: [], categories: [], materials: [], colors: [] }, "fixture", undefined,
      (async () => { calls++; return Response.json({ error: { message: "Quota" } }, { status: 429 }); }) as typeof fetch);
    throw new Error("Unexpected provider success");
  });
  assert.equal(calls, 1);
  assert.deepEqual(result.requiredTerms, ["tricou"]);
  assert.deepEqual(result.filters.colors, ["maro"]);
  assert.equal(result.filters.maxPrice, 100);
});
test("successful interpretations are untouched and the provider resumes on the next attempt", async () => {
  const expected = { ...keywordQuotaFallback("pahar", "AI_PROVIDER_429"), engine: "groq" as const, fallbackReason: undefined };
  assert.equal(await withQuotaFallback("pahar", async () => expected), expected);
  let attempts = 0;
  const resolve = async () => { if (++attempts === 1) throw new Error("AI_PROVIDER_429"); return expected; };
  assert.equal((await withQuotaFallback("pahar", resolve)).engine, "keywords");
  assert.equal((await withQuotaFallback("pahar", resolve)).engine, "groq");
});
test("keywords preserve all literal terms, product alternatives, decimal ranges and negations", () => {
  const result = keywordQuotaFallback("un jurnal Herbarium verde, între 80,50 și 132,38 lei, în stoc, fără piele", "AI_PROVIDER_429");
  assert.deepEqual(result.requiredTerms, ["herbarium"]);
  assert.deepEqual(result.productTypes, ["Jurnal"]);
  assert.equal(result.filters.minPrice, 80.5);
  assert.equal(result.filters.maxPrice, 132.38);
  assert.deepEqual(result.filters.excludedMaterials, ["piele"]);
  assert.equal(result.filters.inStock, true);
  const alternative = keywordQuotaFallback("o cană sau un jurnal, nu maro, fără vaze, sub 200 lei", "AI_PROVIDER_429");
  assert.deepEqual(alternative.productTypes, ["Cană", "Jurnal"]);
  assert.deepEqual(alternative.filters.excludedProductTypes, ["Vază"]);
  assert.deepEqual(alternative.filters.excludedColors, ["maro"]);
  assert.equal(alternative.filters.category, undefined);
});
test("keywords preserve color and material alternatives instead of silently requiring both", () => {
  assert.equal(keywordQuotaFallback("cană albă sau albastră", "AI_PROVIDER_429").filters.colorMatch, "any");
  assert.equal(keywordQuotaFallback("cană albă și albastră", "AI_PROVIDER_429").filters.colorMatch, "all");
  assert.equal(keywordQuotaFallback("pernă din in sau bumbac", "AI_PROVIDER_429").filters.materialMatch, "any");
  assert.equal(keywordQuotaFallback("o cană sau un jurnal alb și albastru", "AI_PROVIDER_429").filters.colorMatch, "all");
});
test("a story never fabricates semantic recommendations and empty or foreign-currency requests remain unsupported", () => {
  const story = keywordQuotaFallback("cadou unchiului meu profesor sub 250 lei", "AI_PROVIDER_429");
  assert.equal(story.queryMode, "exact");
  assert.deepEqual(story.recommendations, []);
  assert.deepEqual(story.productTypes, []);
  assert.ok(story.requiredTerms?.includes("profesor"));
  for (const query of ["", "cadou sub 250 lei", "pahar sub 100 euro"]) assert.equal(keywordQuotaFallback(query, "AI_PROVIDER_429").unsupported, true);
  assert.match(story.notice!, /cuvinte-cheie/);
  assert.doesNotMatch(story.notice!, /Groq|\bAI\b/);
});
