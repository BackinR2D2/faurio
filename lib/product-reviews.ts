import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getProductById } from "@/lib/products";
import { ApiError, databaseError } from "@/lib/marketplace/http";
import type { PublicReview, ReviewPage } from "@/lib/reviews";

export async function getProductReviews(productId: string, requestedPage = 1): Promise<ReviewPage> {
  const db = getSupabaseAdmin();
  if (!db) throw new ApiError(503, "REVIEWS_UNAVAILABLE", "Recenziile nu sunt disponibile momentan.");
  const product = await getProductById(productId);
  if (!product) throw new ApiError(404, "PRODUCT_NOT_FOUND", "Produsul nu mai este disponibil.");
  const page = Math.max(1, Math.min(10000, Math.trunc(Number.isFinite(requestedPage) ? requestedPage : 1)));
  const { data, error, count } = await db.from("public_product_reviews").select("id,rating,body,created_at", { count: "exact" })
    .eq("product_id", productId).order("created_at", { ascending: false }).order("id").range((page - 1) * 10, page * 10 - 1);
  if (error?.code === "PGRST103" && page > 1) return getProductReviews(productId, 1);
  databaseError(error);
  const total = count || 0;
  const pageCount = Math.ceil(total / 10);
  if (page > Math.max(1, pageCount)) return getProductReviews(productId, Math.max(1, pageCount));
  return { reviews: (data || []) as PublicReview[], total, rating: total ? product.rating : 0, page, pageCount, available: true };
}
