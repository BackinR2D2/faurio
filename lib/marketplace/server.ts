import "server-only";
import { cache } from "react";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { databaseError, isMissingSchema } from "@/lib/marketplace/http";
import { layoutSchema, type PublicShop } from "@/lib/marketplace/contracts";

export const marketplaceReady = cache(async () => {
  const db = getSupabaseAdmin();
  if (!db) return false;
  const { error } = await db.from("public_shops").select("id").limit(1);
  if (isMissingSchema(error)) return false;
  databaseError(error);
  return true;
});

export async function publicProductSource() {
  return await marketplaceReady() ? "catalog_products" : "products";
}

export async function getPublicShops(page = 1) {
  const db = getSupabaseAdmin();
  if (!db || !(await marketplaceReady())) return { shops: [] as PublicShop[], total: 0, configured: false };
  const start = Math.max(0, Math.trunc(page) - 1) * 24;
  const { data, error, count } = await db.from("public_shops").select("*", { count: "exact" }).order("name").order("id").range(start, start + 23);
  if (error?.code === "PGRST103") return { shops: [] as PublicShop[], total: 0, configured: true };
  databaseError(error);
  const shops = (data || []).flatMap((row) => {
    const parsed = layoutSchema.safeParse(row.layout);
    return parsed.success ? [{ ...row, layout: parsed.data } as PublicShop] : [];
  });
  return { shops, total: count || 0, configured: true };
}

export async function getPublicShop(slug: string): Promise<PublicShop | null> {
  const db = getSupabaseAdmin();
  if (!db || !(await marketplaceReady())) return null;
  const { data, error } = await db.from("public_shops").select("*").eq("slug", slug).maybeSingle();
  databaseError(error);
  if (!data) return null;
  const parsed = layoutSchema.safeParse(data.layout);
  return parsed.success ? { ...data, layout: parsed.data } as PublicShop : null;
}
