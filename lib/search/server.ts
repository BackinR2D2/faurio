import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { interpretNaturalQuery } from "@/lib/search-intent";
import { aiIntentSchema, extractGroqIntent, mergeAiIntent, redactSearch, type ResolvedIntent, type SearchTaxonomy } from "./ai";
import { searchFailureNotice, searchFailureReason } from "./status";

const inflight = new Map<string, Promise<ResolvedIntent>>();

export async function resolveSearch(query: string, db: SupabaseClient): Promise<ResolvedIntent> {
  const fallback = { ...interpretNaturalQuery(query), engine: "rules" as const };
  const key = process.env.GROQ_API_KEY;
  if (!key || process.env.SEARCH_AI_ENABLED === "false" || (fallback.unsupported && fallback.notice?.includes("RON"))) return fallback;
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
  const cacheKey = createHash("sha256").update(`faurio-search-v2:${model}:${redactSearch(query).trim().toLowerCase()}`).digest("hex");
  if (inflight.has(cacheKey)) return inflight.get(cacheKey)!;
  const work = (async () => {
    try {
      const { data: taxonomy, error: taxonomyError } = await db.rpc("catalog_search_taxonomy");
      if (taxonomyError || !taxonomy) throw new Error(taxonomyError && !["PGRST202", "PGRST205", "42P01", "42883"].includes(taxonomyError.code) ? "AI_SEARCH_DATABASE_UNAVAILABLE" : "AI_SEARCH_MIGRATION_REQUIRED");
      const { data: cached } = await db.from("search_intent_cache").select("intent").eq("cache_key", cacheKey).gt("expires_at", new Date().toISOString()).maybeSingle();
      if (cached) return mergeAiIntent(query, aiIntentSchema.parse(cached.intent), taxonomy as SearchTaxonomy);
      const requestedLimit = Number(process.env.GROQ_DAILY_SEARCH_LIMIT || 200);
      const limit = Number.isFinite(requestedLimit) ? Math.max(0, Math.min(1000, Math.trunc(requestedLimit))) : 200;
      const { data: allowed, error: quotaError } = await db.rpc("claim_search_ai_slot", { p_limit: limit });
      if (quotaError) throw new Error(["PGRST202", "PGRST205", "42P01", "42883"].includes(quotaError.code) ? "AI_SEARCH_MIGRATION_REQUIRED" : "AI_SEARCH_DATABASE_UNAVAILABLE");
      if (!allowed) throw new Error("AI_SEARCH_BUDGET_EXHAUSTED");
      const ai = await extractGroqIntent(query, taxonomy as SearchTaxonomy, key, model);
      const intent = mergeAiIntent(query, ai, taxonomy as SearchTaxonomy);
      await db.from("search_intent_cache").upsert({ cache_key: cacheKey, intent: ai, expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() });
      return intent;
    } catch (error) {
      const reason = searchFailureReason(error);
      console.warn("[search-ai]", reason);
      return { ...fallback, notice: [fallback.notice, searchFailureNotice(reason)].filter(Boolean).join(" ") };
    }
  })();
  inflight.set(cacheKey, work);
  try { return await work; } finally { inflight.delete(cacheKey); }
}
