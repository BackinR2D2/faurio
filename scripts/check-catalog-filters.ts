import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase server configuration required");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const checks: Record<string, boolean> = {};
for (const [label, filters] of [
  ["categories", { categories: ["__unavailable_test_category__"] }],
  ["materials", { materials: ["__unavailable_test_material__"] }],
  ["productTypes", { productTypes: ["__unavailable_test_type__"] }],
  ["priceBounds", { minPrice: 1, maxPrice: 0 }],
] as const) {
  const { data, error } = await db.rpc("search_marketplace_catalog", { p_intent: {}, p_filters: filters, p_page: 1, p_size: 1 });
  checks[label] = !error && data.total === 0 && data.products.length === 0;
}
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (publicKey) {
  const anon = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await anon.rpc("search_marketplace_catalog", { p_intent: {}, p_filters: {} });
  checks.anonymousExecutionDenied = error?.code === "42501";
}
console.log(JSON.stringify({ readOnly: true, checks }, null, 2));
if (Object.values(checks).some(value => !value)) process.exitCode = 2;
