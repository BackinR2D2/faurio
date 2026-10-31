import { z } from "zod";
import { layoutSchema } from "@/lib/marketplace/contracts";
import { api, databaseError, readJson, requireShop, ApiError } from "@/lib/marketplace/http";

export const GET = api(async (request) => {
  const shopId = z.uuid().safeParse(new URL(request.url).searchParams.get("shop"));
  if (!shopId.success) throw new ApiError(400, "INVALID_SHOP", "Atelier invalid.");
  const auth = await requireShop(request, shopId.data);
  const { data, error } = await auth.supabase.from("shop_pages").select("shop_id,draft,published,revision,published_at,updated_at").eq("shop_id", shopId.data).single();
  databaseError(error);
  const { data: versions, error: versionError } = await auth.supabase.from("shop_page_versions").select("revision,content,created_at").eq("shop_id", shopId.data).order("revision", { ascending: false }).limit(10);
  databaseError(versionError);
  return Response.json({ page: data, versions: versions || [] });
});

export const PUT = api(async (request) => {
  const body = await readJson(request, z.object({ shopId: z.uuid(), revision: z.number().int().positive(), layout: layoutSchema }).strict());
  const auth = await requireShop(request, body.shopId, true);
  const { data, error } = await auth.supabase.rpc("save_shop_page", { p_shop_id: body.shopId, p_draft: body.layout, p_revision: body.revision });
  databaseError(error);
  return Response.json({ revision: data });
});

export const POST = api(async (request) => {
  const body = await readJson(request, z.object({ shopId: z.uuid(), revision: z.number().int().positive(), publish: z.boolean() }).strict());
  const auth = await requireShop(request, body.shopId, true);
  const { data, error } = await auth.supabase.rpc("publish_shop_page", { p_shop_id: body.shopId, p_revision: body.revision, p_publish: body.publish });
  databaseError(error);
  return Response.json({ revision: data, published: body.publish });
});
