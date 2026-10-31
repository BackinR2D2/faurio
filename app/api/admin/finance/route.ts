import { api, databaseError, requireOperator } from "@/lib/marketplace/http";

export const GET = api(async (request) => {
  const { admin } = await requireOperator(request);
  const page = Math.max(1, Math.min(10000, Math.trunc(Number(new URL(request.url).searchParams.get("page")) || 1)));
  const { data, error, count } = await admin.from("marketplace_order_finance").select("order_code,shop_id,product_subtotal_minor,shipping_minor,fee_minor,seller_transfer_minor,refunded_minor,fee_refunded_minor,test_mode,created_at,orders!inner(status)", { count: "exact" }).in("orders.status", ["paid", "refunded"]).order("created_at", { ascending: false }).order("order_code").range((page - 1) * 20, page * 20 - 1);
  if (error?.code !== "PGRST103") databaseError(error);
  return Response.json({ records: data || [], total: count || 0, page });
});
