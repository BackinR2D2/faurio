import { z } from "zod";
import { productInputSchema } from "@/lib/marketplace/contracts";
import { api, databaseError, readJson, requireShop, ApiError } from "@/lib/marketplace/http";
import { mapProduct } from "@/lib/products";
import { classifyProductType } from "@/lib/product-classification";

export const GET = api(async (request) => {
  const params = new URL(request.url).searchParams;
  const shop = z.uuid().safeParse(params.get("shop"));
  if (!shop.success) throw new ApiError(400, "INVALID_SHOP", "Atelier invalid.");
  const page = Math.min(10000, Math.max(1, Math.trunc(Number(params.get("page")) || 1)));
  const auth = await requireShop(request, shop.data);
  const { data, error, count } = await auth.supabase.from("products").select("id,shop_id,name,product_type,category,price,stock,shipping_days,material,color,description,image,listing_status,active", { count: "exact" }).eq("shop_id", shop.data).order("updated_at", { ascending: false }).order("id").range((page - 1) * 20, page * 20 - 1);
  if (error?.code === "PGRST103") return Response.json({ products: [], page, total: 0 });
  databaseError(error);
  return Response.json({ products: data || [], previewProducts: (data || []).map((product) => mapProduct({ ...product, checkout_eligible: false })), total: count || 0, page });
});

export const POST = api(async (request) => {
  const body = await readJson(request, z.object({ shopId: z.uuid(), productId: z.string().min(1).max(200).nullable(), product: productInputSchema, submit: z.boolean() }).strict());
  const auth = await requireShop(request, body.shopId, true);
  const productType = classifyProductType(body.product.name, body.product.product_type);
  if (!productType) throw new ApiError(400, "PRODUCT_TYPE_REQUIRED", "Completează tipul produsului, de exemplu Vază, Cană sau Brățară.");
  const { data, error } = await auth.supabase.rpc("save_shop_product", { p_shop_id: body.shopId, p_product_id: body.productId, p_data: { ...body.product, product_type: productType }, p_submit: body.submit });
  databaseError(error);
  return Response.json({ productId: data }, { status: body.productId ? 200 : 201 });
});

export const DELETE = api(async (request) => {
  const body = await readJson(request, z.object({ shopId: z.uuid(), productId: z.string().min(1).max(200) }).strict());
  const auth = await requireShop(request, body.shopId, true);
  const { error } = await auth.supabase.rpc("archive_shop_product", { p_shop_id: body.shopId, p_product_id: body.productId });
  databaseError(error);
  return Response.json({ archived: true });
});
