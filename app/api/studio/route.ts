import { api, databaseError, requireAuth } from "@/lib/marketplace/http";

export const GET = api(async (request) => {
  const auth = await requireAuth(request);
  const { data: memberships, error: membershipError } = await auth.supabase.from("shop_memberships").select("shop_id,role").eq("user_id", auth.user.id).is("revoked_at", null);
  databaseError(membershipError);
  if (!memberships?.length) return Response.json({ shops: [] });
  const { data: shops, error } = await auth.supabase.from("shops").select("id,slug,name,country,location,status,is_legacy").in("id", memberships.map((row) => row.shop_id)).order("created_at");
  databaseError(error);
  return Response.json({ shops: (shops || []).map((shop) => ({ ...shop, role: memberships.find((membership) => membership.shop_id === shop.id)?.role })) });
});
