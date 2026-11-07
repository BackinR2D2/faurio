import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getProductById } from "@/lib/products";
import { ApiError, databaseError } from "@/lib/marketplace/http";
import type { PublicReview, ReviewPage } from "@/lib/reviews";
import { createReviewAuthorLookup, reviewAuthor } from "@/lib/review-authors";

const authorLookup = createReviewAuthorLookup(async id => {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const { data, error } = await db.auth.admin.getUserById(id);
  if (error) throw error;
  return reviewAuthor(data.user?.user_metadata);
});

export async function getProductReviews(productId: string, requestedPage = 1): Promise<ReviewPage> {
  const db = getSupabaseAdmin();
  if (!db) throw new ApiError(503, "REVIEWS_UNAVAILABLE", "Recenziile nu sunt disponibile momentan.");
  const product = await getProductById(productId);
  if (!product) throw new ApiError(404, "PRODUCT_NOT_FOUND", "Produsul nu mai este disponibil.");
  const page = Math.max(1, Math.min(10000, Math.trunc(Number.isFinite(requestedPage) ? requestedPage : 1)));
  const { data, error, count } = await db.from("public_product_reviews").select("id,rating,body,created_at,verified_purchase", { count: "exact" })
    .eq("product_id", productId).order("created_at", { ascending: false }).order("id").range((page - 1) * 10, page * 10 - 1);
  if (error?.code === "PGRST103" && page > 1) return getProductReviews(productId, 1);
  databaseError(error);
  const total = count || 0;
  const pageCount = Math.ceil(total / 10);
  if (page > Math.max(1, pageCount)) return getProductReviews(productId, Math.max(1, pageCount));
  const rows = data || [];
  const identities = rows.length ? await db.from("product_reviews").select("id,buyer_id").in("id", rows.map(row => row.id)).eq("status", "approved").abortSignal(AbortSignal.timeout(5000)) : { data: [] };
  const authors = new Map(await Promise.all([...new Set((identities.data || []).map(row => row.buyer_id as string))].map(async id => [id, await authorLookup(id)] as const)));
  const buyers = new Map((identities.data || []).map(row => [row.id, row.buyer_id]));
  const reviews: PublicReview[] = rows.map(row => ({ ...row, author: authors.get(buyers.get(row.id) || "") || reviewAuthor() }));
  return { reviews, total, rating: total ? product.rating : 0, page, pageCount, available: true };
}
