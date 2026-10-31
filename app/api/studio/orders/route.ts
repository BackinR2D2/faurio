import { z } from "zod";
import { api, databaseError, readJson, requireShop } from "@/lib/marketplace/http";

export const GET = api(async (request) => {
  const params = new URL(request.url).searchParams;
  const shop = z.uuid().parse(params.get("shop"));
  const auth = await requireShop(request, shop);
  const page = Math.max(1, Math.min(10000, Math.trunc(Number(params.get("page")) || 1)));
  const { data, error } = await auth.supabase.rpc("seller_orders", { p_shop: shop, p_page: page });
  databaseError(error);
  return Response.json({ ...data, page });
});

export const PATCH = api(async (request) => {
  const body = await readJson(request, z.object({ shopId: z.uuid(), code: z.string().min(1).max(100), state: z.enum(["preparing", "shipped", "delivered"]), carrier: z.string().trim().max(80), tracking: z.string().trim().max(160) }).strict());
  const auth = await requireShop(request, body.shopId, true);
  const { error } = await auth.supabase.rpc("update_seller_fulfillment", { p_shop: body.shopId, p_code: body.code, p_state: body.state, p_carrier: body.carrier, p_tracking: body.tracking });
  databaseError(error);
  return Response.json({ updated: true });
});
