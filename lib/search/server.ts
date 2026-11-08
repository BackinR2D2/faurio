import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { interpretNaturalQuery } from "@/lib/search-intent";
import { aiIntentSchema, DEFAULT_SEARCH_MODEL, extractGroqIntent, mergeAiIntent, redactSearch, type ResolvedIntent, type SearchTaxonomy } from "./ai";
import { searchFailureNotice, searchFailureReason } from "./status";
import { inventoryFingerprint, summarizeInventory, type InventoryRow } from "./inventory";
import { withQuotaFallback } from "./quota-fallback";

const inflight = new Map<string, Promise<ResolvedIntent>>();
const recentIntents = new Map<string, { expires: number; intent: ResolvedIntent }>();
let inventoryCache: { expires: number; work: Promise<{ taxonomy: SearchTaxonomy; typeCategories: Record<string, string[]>; context: ReturnType<typeof summarizeInventory>; fingerprint: string }> } | undefined;

async function readInventory(db: SupabaseClient) {
  if (inventoryCache && inventoryCache.expires > Date.now()) return inventoryCache.work;
  const work = (async () => {
    const columns = "id,name,product_type,category,description,material,color,price,stock";
    const first = await db.from("catalog_products").select(columns, { count: "exact" }).eq("active", true).order("id").range(0, 499).abortSignal(AbortSignal.timeout(8000));
    if (first.error || first.count == null) throw new Error("AI_SEARCH_DATABASE_UNAVAILABLE");
    const rows = [...(first.data || [])] as InventoryRow[];
    for (let offset = 500; offset < first.count; offset += 2000) {
      const pages = await Promise.all([0, 500, 1000, 1500].filter(delta => offset + delta < first.count!).map(delta => db.from("catalog_products").select(columns).eq("active", true).order("id").range(offset + delta, offset + delta + 499).abortSignal(AbortSignal.timeout(8000))));
      for (const page of pages) {
        if (page.error) throw new Error("AI_SEARCH_DATABASE_UNAVAILABLE");
        rows.push(...(page.data || []) as InventoryRow[]);
      }
    }
    const unique = (column: "product_type" | "category" | "material" | "color") => [...new Set(rows.map(row => row[column]))];
    const typeCategories = Object.fromEntries(unique("product_type").map(type => [type, [...new Set(rows.filter(row => row.product_type === type).map(row => row.category))]]));
    return { taxonomy: { productTypes: unique("product_type"), categories: unique("category"), materials: unique("material"), colors: unique("color") }, typeCategories, context: summarizeInventory(rows), fingerprint: inventoryFingerprint(rows) };
  })();
  inventoryCache = { expires: Date.now() + 30000, work };
  try { return await work; } catch (error) { inventoryCache = undefined; throw error; }
}

export async function getCatalogFilterOptions(db: SupabaseClient) {
  const inventory = await readInventory(db);
  return { ...inventory.taxonomy, typeCategories: inventory.typeCategories };
}

export async function resolveSearch(query: string, db: SupabaseClient): Promise<ResolvedIntent> {
  const parsed = interpretNaturalQuery(query);
  const failure = (reason: string): ResolvedIntent => ({ ...parsed, unsupported: true, failure: reason, notice: [parsed.notice, searchFailureNotice(reason)].filter(Boolean).join(" ") });
  const key = process.env.GROQ_API_KEY;
  if (!key || process.env.SEARCH_AI_ENABLED === "false") return failure("AI_CONFIGURATION_REQUIRED");
  const model = process.env.GROQ_MODEL || DEFAULT_SEARCH_MODEL;
  const recentKey = createHash("sha256").update(`${model}:${query.trim().toLowerCase()}`).digest("hex");
  const recent = recentIntents.get(recentKey);
  if (recent && recent.expires > Date.now()) return recent.intent;
  recentIntents.delete(recentKey);
  let inventory: Awaited<ReturnType<typeof readInventory>>;
  try { inventory = await readInventory(db); }
  catch (error) { return failure(searchFailureReason(error)); }
  const cacheKey = createHash("sha256").update(`faurio-search-v8:${model}:${inventory.fingerprint}:${redactSearch(query).trim().toLowerCase()}`).digest("hex");
  const flightKey = `${cacheKey}:${recentKey}`;
  if (inflight.has(flightKey)) return inflight.get(flightKey)!;
  const work = (async () => {
    try {
      return await withQuotaFallback(query, async () => {
        const { taxonomy } = inventory;
        const { data: cached } = await db.from("search_intent_cache").select("intent").eq("cache_key", cacheKey).gt("expires_at", new Date().toISOString()).maybeSingle();
        if (cached) return mergeAiIntent(query, aiIntentSchema.parse(cached.intent), taxonomy as SearchTaxonomy);
        const requestedLimit = Number(process.env.GROQ_DAILY_SEARCH_LIMIT || 200);
        const limit = Number.isFinite(requestedLimit) ? Math.max(0, Math.min(1000, Math.trunc(requestedLimit))) : 200;
        const { data: allowed, error: quotaError } = await db.rpc("claim_search_ai_slot", { p_limit: limit });
        if (quotaError) throw new Error(["PGRST202", "PGRST205", "42P01", "42883"].includes(quotaError.code) ? "AI_SEARCH_MIGRATION_REQUIRED" : "AI_SEARCH_DATABASE_UNAVAILABLE");
        if (!allowed) throw new Error("AI_SEARCH_BUDGET_EXHAUSTED");
        const ai = await extractGroqIntent(query, taxonomy, key, model, fetch, inventory.context);
        const intent = mergeAiIntent(query, ai, taxonomy as SearchTaxonomy);
        await db.from("search_intent_cache").upsert({ cache_key: cacheKey, intent: ai, expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() });
        return intent;
      });
    } catch (error) {
      const reason = searchFailureReason(error);
      console.warn("[search-ai]", reason);
      return failure(reason);
    }
  })();
  inflight.set(flightKey, work);
  try {
    const intent = await work;
    if (intent.engine === "groq" && !intent.failure && !intent.unsupported) {
      if (recentIntents.size >= 100) recentIntents.delete(recentIntents.keys().next().value!);
      recentIntents.set(recentKey, { expires: Math.min(Date.now() + 15000, inventoryCache?.expires || Date.now()), intent });
    }
    return intent;
  } finally { inflight.delete(flightKey); }
}
