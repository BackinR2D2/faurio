import "server-only";
import type { CatalogFilters, Product } from "@/lib/catalog";
import { interpretNaturalQuery } from "@/lib/search-intent";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { publicProductSource } from "@/lib/marketplace/server";
import { resolveSearch } from "@/lib/search/server";
import type { ResolvedIntent } from "@/lib/search/ai";

type ProductRow = Record<string, unknown>;

export const CATALOG_PAGE_SIZE = 24;

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export function mapProduct(row: ProductRow): Product {
  return {
    id: String(row.id), name: String(row.name), productType: String(row.product_type || "Produs"),
    maker: String(row.maker || "Atelier local"), makerLocation: String(row.maker_location || "România"), category: String(row.category),
    price: Number(row.price), oldPrice: row.old_price == null ? undefined : Number(row.old_price), material: String(row.material || "materiale naturale"),
    color: String(row.color || "natural"), occasion: list(row.occasion), recipients: list(row.recipients), moods: list(row.moods),
    image: String(row.image || "/products/ceramica-luna.avif"), imagePosition: row.image_position ? String(row.image_position) : undefined,
    stock: Number(row.stock || 0), rating: row.rating_source === "verified" ? Number(row.rating || 0) : 0, reviews: row.rating_source === "verified" ? Number(row.reviews || 0) : 0, days: Number(row.shipping_days || 3),
    badge: row.badge ? String(row.badge) : undefined, description: String(row.description || "Produs lucrat manual în serie mică."),
    details: list(row.details), care: String(row.care || "Urmează instrucțiunile de îngrijire ale atelierului."), story: String(row.story || "Realizat cu grijă într-un atelier local."),
    shopId: row.shop_id ? String(row.shop_id) : undefined, shopSlug: row.shop_slug ? String(row.shop_slug) : undefined,
    checkoutEligible: row.checkout_eligible === undefined ? true : Boolean(row.checkout_eligible),
  };
}

export type CatalogResult = { products: Product[]; total: number; page: number; pageSize: number; pageCount: number; configured: boolean; intent: ResolvedIntent | null };

function totalFromRangeError(details: string | null | undefined) {
  const match = details?.match(/only\s+(\d+)\s+rows?/i);
  return match ? Number(match[1]) : null;
}

export async function getCatalogProducts({ query = "", page = 1, pageSize = CATALOG_PAGE_SIZE, filters = {} }: { query?: string; page?: number; pageSize?: number; filters?: CatalogFilters } = {}): Promise<CatalogResult> {
  const admin = getSupabaseAdmin();
  const safePageSize = Math.min(48, Math.max(1, Math.trunc(Number.isFinite(pageSize) ? pageSize : CATALOG_PAGE_SIZE)));
  const safePage = Math.min(10000, Math.max(1, Math.trunc(Number.isFinite(page) ? page : 1)));
  const intent: ResolvedIntent | null = query.trim() ? admin ? await resolveSearch(query, admin) : interpretNaturalQuery(query) : null;
  if (!admin) return { products: [], total: 0, page: safePage, pageSize: safePageSize, pageCount: 0, configured: false, intent };
  if (intent?.unsupported) return { products: [], total: 0, page: 1, pageSize: safePageSize, pageCount: 0, configured: true, intent };

  const source = await publicProductSource();
  if (intent?.engine === "groq" && source === "catalog_products") {
    const { data, error } = await admin.rpc("search_marketplace_catalog", { p_intent: intent, p_filters: filters, p_page: safePage, p_size: safePageSize });
    if (error) throw new Error("Căutarea AI necesită finalizarea migrărilor bazei de date.");
    const result = data as { products: ProductRow[]; total: number; page: number; pageSize: number };
    return { ...result, products: result.products.map(mapProduct), pageCount: Math.ceil(result.total / result.pageSize), configured: true, intent };
  }
  if (intent?.filters.personalizable && source === "products") return { products: [], total: 0, page: 1, pageSize: safePageSize, pageCount: 0, configured: true, intent };
  let request = admin.from(source).select("*", { count: "exact" }).eq("active", true);
  if (filters.shopId) request = request.eq("shop_id", filters.shopId);
  const category = filters.category && filters.category !== "Toate" ? filters.category : intent?.filters.category;
  if (category) request = request.eq("category", category);
  if (filters.material && filters.material !== "Toate") request = request.ilike("material", `%${filters.material}%`);
  const ceilings = [filters.maxPrice, intent?.filters.maxPrice].filter((value): value is number => value !== undefined && Number.isFinite(value));
  if (ceilings.length) request = request.lte("price", Math.min(...ceilings));
  if (intent?.filters.minPrice !== undefined) request = request.gte("price", intent.filters.minPrice);
  if (filters.minRating && source === "products") return { products: [], total: 0, page: 1, pageSize: safePageSize, pageCount: 0, configured: true, intent };
  if (filters.minRating) request = request.eq("rating_source", "verified").gt("reviews", 0).gte("rating", filters.minRating);
  if (filters.ready || intent?.filters.ready) request = request.lte("shipping_days", 2);
  if (intent?.productTypes.length) request = request.in("product_type", intent.productTypes);
  for (const material of intent?.filters.materials || []) request = material === "in" ? request.filter("material", "imatch", "\\min\\M") : request.ilike("material", `%${material}%`);
  for (const material of intent?.filters.excludedMaterials || []) request = request.not("material", "ilike", `%${material}%`);
  if (intent?.filters.personalizable) request = request.eq("personalizable", true);
  if (intent?.filters.inStock) request = request.gt("stock", 0);
  for (const color of intent?.filters.colors || []) request = request.ilike("color", `%${color}%`);
  if (intent?.filters.occasion) request = request.contains("occasion", [intent.filters.occasion]);
  if (intent?.filters.recipients.length) request = request.overlaps("recipients", intent.filters.recipients);
  if (intent?.filters.mood) request = request.contains("moods", [intent.filters.mood]);
  if (intent?.freeText) request = request.textSearch("search_vector", intent.freeText, { config: "simple", type: "plain" });

  const sort = filters.sort || "relevanta";
  if (sort === "pret-mic") request = request.order("price", { ascending: true });
  else if (sort === "pret-mare") request = request.order("price", { ascending: false });
  else if (sort === "nou") request = request.order("created_at", { ascending: false });
  else request = request.order("rating", { ascending: false }).order("reviews", { ascending: false });
  request = request.order("id", { ascending: true });

  const start = (safePage - 1) * safePageSize;
  const { data, error, count } = await request.range(start, start + safePageSize - 1);
  if (error?.code === "PGRST103") {
    const rangeTotal = totalFromRangeError(error.details);
    if (rangeTotal === 0) return { products: [], total: 0, page: 1, pageSize: safePageSize, pageCount: 0, configured: true, intent };
    if (rangeTotal !== null) {
      const lastPage = Math.max(1, Math.ceil(rangeTotal / safePageSize));
      return getCatalogProducts({ query, page: lastPage, pageSize: safePageSize, filters });
    }
  }
  if (error) throw new Error(`Catalogul nu a putut fi citit: ${error.message}`);
  const total = count || 0;
  const pageCount = Math.ceil(total / safePageSize);
  if (pageCount > 0 && safePage > pageCount) return getCatalogProducts({ query, page: pageCount, pageSize: safePageSize, filters });
  return { products: (data || []).map((row) => mapProduct(row as ProductRow)), total, page: pageCount ? safePage : 1, pageSize: safePageSize, pageCount, configured: true, intent };
}

export async function getProductById(id: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin.from(await publicProductSource()).select("*").eq("id", id).eq("active", true).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapProduct(data as ProductRow) : null;
}

export async function getProductsByIds(ids: string[]) {
  const admin = getSupabaseAdmin();
  const unique = Array.from(new Set(ids)).filter(Boolean).slice(0, 50);
  if (!admin || !unique.length) return [];
  const { data, error } = await admin.from(await publicProductSource()).select("*").in("id", unique).eq("active", true);
  if (error) throw new Error(error.message);
  const products = (data || []).map((row) => mapProduct(row as ProductRow));
  return unique.flatMap((id) => products.filter((product) => product.id === id));
}

export async function getRelatedProducts(product: Product, limit = 3) {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const { data, error } = await admin.from(await publicProductSource()).select("*").eq("active", true).eq("category", product.category).neq("id", product.id).order("rating", { ascending: false }).order("id").limit(limit);
  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapProduct(row as ProductRow));
}

export async function getProductIds(limit = 1000) {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const { data, error } = await admin.from(await publicProductSource()).select("id").eq("active", true).order("id").limit(limit);
  if (error) return [];
  return (data || []).map((row) => String(row.id));
}

export async function getPromotion(code: string) {
  const admin = getSupabaseAdmin();
  if (!admin || !code) return null;
  const now = new Date().toISOString();
  const { data, error } = await admin.from("promotions").select("code,discount_percent").eq("code", code.toUpperCase()).eq("active", true).lte("starts_at", now).gte("ends_at", now).maybeSingle();
  if (error || !data) return null;
  return { code: String(data.code), discountPercent: Math.max(0, Math.min(100, Number(data.discount_percent))) };
}
