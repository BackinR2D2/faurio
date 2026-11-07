import type { SupabaseClient } from "@supabase/supabase-js";
import { catalogStringList } from "./catalog-filters.ts";

export function eligibleReviewOrders(db: SupabaseClient, userId: string, productId: string, reviewedCodes: string[]) {
  let query = db.from("orders").select("code,created_at,marketplace_order_finance!inner(seller_fulfillments!inner(state))")
    .eq("user_id", userId).eq("status", "paid").contains("items", JSON.stringify([{ id: productId }]))
    .eq("marketplace_order_finance.seller_fulfillments.state", "delivered")
    .order("created_at", { ascending: false }).order("code").limit(20);
  if (reviewedCodes.length) query = query.not("code", "in", catalogStringList(reviewedCodes));
  return query.abortSignal(AbortSignal.timeout(8000));
}
