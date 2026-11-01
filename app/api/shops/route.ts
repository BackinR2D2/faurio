import { z } from "zod";
import { api, ApiError, databaseError, readJson, requireAuth } from "@/lib/marketplace/http";
import { applicationSchema } from "@/lib/marketplace/contracts";

export const POST = api(async (request) => {
  const auth = await requireAuth(request);
  const body = await readJson(request, applicationSchema);
  const { data, error } = await auth.supabase.rpc("apply_for_shop", { p_name: body.name, p_slug: body.slug, p_country: body.country, p_location: body.location, p_terms_version: body.termsVersion });
  databaseError(error);
  return Response.json({ shopId: data }, { status: 201 });
});

export const DELETE = api(async (request) => {
  const auth = await requireAuth(request);
  if (!auth.user.email_confirmed_at) throw new ApiError(403, "EMAIL_CONFIRMATION_REQUIRED", "Confirmă emailul înainte de a închide atelierul.");
  const body = await readJson(request, z.object({ shopId: z.uuid(), confirmation: z.string().trim().min(4).max(60) }).strict());
  const { error } = await auth.supabase.rpc("close_owned_shop", { p_shop_id: body.shopId, p_confirmation: body.confirmation });
  if (error?.message.includes("shop_open_orders")) throw new ApiError(409, "OPEN_ORDERS", "Finalizează sau rambursează comenzile deschise înainte de a închide atelierul.");
  if (error?.message.includes("shop_open_returns")) throw new ApiError(409, "OPEN_RETURNS", "Soluționează retururile deschise înainte de a închide atelierul.");
  if (error?.message.includes("shop_confirmation_mismatch")) throw new ApiError(400, "CONFIRMATION_MISMATCH", "Scrie adresa exactă a atelierului pentru confirmare.");
  databaseError(error);
  return Response.json({ closed: true, orderHistoryPreserved: true });
});
