import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { readFile, stat } from "node:fs/promises";

nextEnv.loadEnvConfig(process.cwd());
const apply = process.argv.includes("--apply");
const media = JSON.parse(await readFile(new URL("../lib/product-media.json", import.meta.url), "utf8"));
const legacyImages = ["/products/ceramica-luna.avif", "/products/broderie-camp.avif", "/products/lumanare-terrazzo.avif"];
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Configure Supabase server credentials in .env.local.");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
let planned = 0;
let updated = 0;
const report = [];
for (const item of media) {
  if (!/^\/products\/catalog\/[a-z-]+\.webp$/.test(item.src)) throw new Error("Invalid catalog asset path.");
  const asset = await stat(new URL(`../public${item.src}`, import.meta.url));
  if (!asset.size) throw new Error(`Empty catalog asset: ${item.slug}`);
  const ids = Array.from({ length: 30 }, (_, index) => `${item.slug}-${String(index + 1).padStart(3, "0")}`);
  const { data, error } = await db.from("products").select("id,image,product_type").in("id", ids);
  if (error) throw new Error(`Could not inspect demo media (${error.code}).`);
  const candidates = (data || []).filter((row) => row.product_type === item.productType && legacyImages.includes(row.image));
  planned += candidates.length;
  if (apply && candidates.length) {
    const result = await db.from("products").update({ image: item.src, image_position: "center" })
      .in("id", candidates.map((row) => row.id)).eq("product_type", item.productType).in("image", legacyImages).select("id");
    if (result.error) throw new Error(`Could not update demo media (${result.error.code}).`);
    updated += result.data.length;
  }
  report.push({ model: item.slug, candidates: candidates.length, alreadyAssigned: (data || []).filter((row) => row.image === item.src).length });
}
console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", planned, updated, report }, null, 2));
