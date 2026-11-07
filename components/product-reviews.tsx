import { getProductReviews } from "@/lib/product-reviews";
import { ProductFeedback } from "@/components/product-feedback";
import type { ReviewPage } from "@/lib/reviews";

export async function ProductReviews({ productId }: { productId: string }) {
  let initial: ReviewPage;
  try { initial = await getProductReviews(productId); }
  catch { initial = { reviews: [], total: 0, rating: 0, page: 1, pageCount: 0, available: false }; }
  return <ProductFeedback key={productId} productId={productId} initial={initial} />;
}
