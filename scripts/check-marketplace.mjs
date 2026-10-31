import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Supabase server configuration is missing. Fill .env.local using .env.example.");
  process.exitCode = 1;
} else {
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const [catalog, shops] = await Promise.all([
    db.from("products").select("id", { count: "exact", head: true }),
    db.from("public_shops").select("id", { count: "exact" }).limit(1),
  ]);
  console.log(JSON.stringify({
    products: catalog.count,
    catalogAvailable: !catalog.error,
    marketplaceMigrationApplied: !shops.error && Array.isArray(shops.data),
    publicShops: shops.count,
    stripeTestKeyConfigured: Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")),
    webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_")),
    operatorAllowlistConfigured: Boolean(process.env.ADMIN_EMAILS?.trim()),
    databaseDirectAccessConfigured: Boolean(process.env.DATABASE_URL),
  }, null, 2));
  if (shops.error || !Array.isArray(shops.data)) {
    console.error("Marketplace schema is not ready. See docs/DEPLOYMENT.md; no database mutations were performed.");
    process.exitCode = 2;
  }
}
