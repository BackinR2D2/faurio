import { api, databaseError, readJson, requireAuth } from "@/lib/marketplace/http";
import { applicationSchema } from "@/lib/marketplace/contracts";

export const POST = api(async (request) => {
  const auth = await requireAuth(request);
  const body = await readJson(request, applicationSchema);
  const { data, error } = await auth.supabase.rpc("apply_for_shop", { p_name: body.name, p_slug: body.slug, p_country: body.country, p_location: body.location, p_terms_version: body.termsVersion });
  databaseError(error);
  return Response.json({ shopId: data }, { status: 201 });
});
