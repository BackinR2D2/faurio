import { interpretNaturalQuery } from "../search-intent.ts";
import { normalizeSearch, type ResolvedIntent } from "./ai.ts";
import { searchFailureReason } from "./status.ts";

function attributeMatch(query: string, attributes: string[], kind: "colors" | "materials"): "all" | "any" {
  const words = normalizeSearch(query).split(/\s+/);
  const positions = words.flatMap((word, index) => {
    const parsed = interpretNaturalQuery(kind === "materials" ? `din ${word}` : word);
    return parsed.filters[kind].some(value => attributes.includes(value)) ? [index] : [];
  });
  return positions.some((position, index) => index > 0 && /\b(?:sau|ori|or)\b/.test(words.slice(positions[index - 1] + 1, position).join(" "))) ? "any" : "all";
}

export function keywordQuotaFallback(query: string, reason: NonNullable<ResolvedIntent["fallbackReason"]>): ResolvedIntent {
  const local = interpretNaturalQuery(query);
  const requiredTerms = local.freeText.split(/\s+/).filter(Boolean);
  const meaningful = local.productTypes.length > 0 || requiredTerms.length > 0 || local.filters.colors.length > 0 || local.filters.materials.length > 0 || Boolean(local.filters.mood);
  const filters = { ...local.filters, category: undefined, occasion: undefined, recipients: [],
    colorMatch: attributeMatch(query, local.filters.colors, "colors"), materialMatch: attributeMatch(query, local.filters.materials, "materials") };
  return { ...local, filters, engine: "keywords", fallbackReason: reason, queryMode: "exact", requiredTerms, rankingTerms: [...local.productTypes, ...requiredTerms], recommendations: [],
    summary: local.summary.filter(item => !item.startsWith("pentru ")),
    unsupported: local.unsupported || !meaningful || requiredTerms.length > 24,
    notice: [local.notice, "Căutare după cuvinte-cheie. Pentru rezultate mai precise, scrie produsul și caracteristicile dorite."].filter(Boolean).join(" ") };
}

export async function withQuotaFallback(query: string, resolve: () => Promise<ResolvedIntent>): Promise<ResolvedIntent> {
  try { return await resolve(); }
  catch (error) {
    const reason = searchFailureReason(error);
    if (reason === "AI_PROVIDER_429" || reason === "AI_SEARCH_BUDGET_EXHAUSTED") return keywordQuotaFallback(query, reason);
    throw error;
  }
}
