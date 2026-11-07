import { z } from "zod";
import { api, ApiError, databaseError, readJson, requireAuth } from "@/lib/marketplace/http";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getProductById } from "@/lib/products";
import { getProductReviews } from "@/lib/product-reviews";
import { deleteOwnedReview, eligibleReviewOrders } from "@/lib/review-queries";
import { reviewDeletionSchema, reviewSubmissionSchema, type ReviewEligibility } from "@/lib/reviews";

export const GET = api(async request => {
  const params = new URL(request.url).searchParams;
  const auth = params.get("mode") === "eligibility" ? await requireAuth(request) : null;
  const productId = z.string().trim().min(1).max(200).parse(params.get("productId"));
  if (!auth) return Response.json(await getProductReviews(productId, Number(params.get("page") || 1)));
  const product = await getProductById(productId);
  if (!product) throw new ApiError(404, "PRODUCT_NOT_FOUND", "Produsul nu mai este disponibil.");
  const db = getSupabaseAdmin();
  if (!db) throw new ApiError(503, "REVIEWS_UNAVAILABLE", "Recenziile nu sunt disponibile momentan.");
  const [membership, existing] = await Promise.all([
    auth.supabase.from("shop_memberships").select("shop_id").eq("shop_id", product.shopId || "00000000-0000-0000-0000-000000000000").eq("user_id", auth.user.id).is("revoked_at", null).limit(1),
    auth.supabase.from("product_reviews").select("id,order_code,rating,body,status,created_at").eq("product_id", productId).eq("buyer_id", auth.user.id).order("created_at", { ascending: false }).limit(1),
  ]);
  databaseError(membership.error); databaseError(existing.error);
  const ownProduct = Boolean(membership.data?.length);
  const review = existing.data?.[0];
  const ownReview = review ? { id: review.id, rating: review.rating, body: review.body, status: review.status, created_at: review.created_at } : null;
  if (ownProduct || ownReview) return Response.json({ hasReview: Boolean(ownReview), ownProduct, ownReview, verifiedPurchase: Boolean(review?.order_code) } satisfies ReviewEligibility);
  const { data, error } = await eligibleReviewOrders(db, auth.user.id, productId, []);
  databaseError(error);
  return Response.json({ hasReview: false, ownProduct: false, ownReview: null, verifiedPurchase: Boolean(data?.length) } satisfies ReviewEligibility);
});

export const DELETE = api(async request => {
  const auth = await requireAuth(request);
  const body = await readJson(request, reviewDeletionSchema);
  const db = getSupabaseAdmin();
  if (!db) throw new ApiError(503, "REVIEWS_UNAVAILABLE", "Recenziile nu sunt disponibile momentan.");
  const { data, error } = await deleteOwnedReview(db, auth.user.id, body.id);
  databaseError(error);
  if (!data) throw new ApiError(404, "REVIEW_NOT_FOUND", "Recenzia nu a fost găsită în contul tău.");
  return Response.json({ deleted: true });
});

export const POST = api(async request => {
  const auth = await requireAuth(request);
  const body = await readJson(request, reviewSubmissionSchema);
  const { error } = await auth.supabase.rpc("submit_product_review", { p_code: body.code || null, p_product: body.productId, p_rating: body.rating, p_body: body.body });
  if (error?.message.includes("verified_delivery_required")) throw new ApiError(403, "VERIFIED_PURCHASE_REQUIRED", "Poți recenza produsul după livrarea unei comenzi achitate din contul tău.");
  if (error?.message.includes("self_review_forbidden")) throw new ApiError(403, "SELF_REVIEW_FORBIDDEN", "Nu poți recenza produsele propriului atelier.");
  if (error?.code === "23505") throw new ApiError(409, "REVIEW_EXISTS", "Ai trimis deja o recenzie pentru acest produs.");
  if (error?.message.includes("review_daily_limit")) throw new ApiError(429, "REVIEW_LIMIT", "Ai atins limita de recenzii pentru astăzi. Revino mâine.");
  if (error?.message.includes("review_product_unavailable")) throw new ApiError(404, "PRODUCT_NOT_FOUND", "Produsul nu mai este disponibil.");
  databaseError(error);
  return Response.json({ submitted: true, moderationRequired: true }, { status: 201 });
});
