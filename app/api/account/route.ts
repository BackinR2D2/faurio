import { z } from "zod";
import { api, ApiError, databaseError, readJson, requireAuth } from "@/lib/marketplace/http";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const DELETE = api(async request => {
  const auth = await requireAuth(request);
  const body = await readJson(request, z.object({
    confirmation: z.literal("STERGE"),
    password: z.string().min(1).max(1024),
  }).strict());
  const admin = getSupabaseAdmin();
  if (!admin) throw new ApiError(503, "ACCOUNT_DELETION_UNAVAILABLE", "Ștergerea contului nu este disponibilă momentan.");
  const { data: allowed, error: limitError } = await admin.rpc("claim_account_deletion_attempt", { p_user_id: auth.user.id });
  databaseError(limitError);
  if (!allowed) throw new ApiError(429, "TOO_MANY_ATTEMPTS", "Prea multe încercări. Încearcă din nou peste o oră.");
  if (!auth.user.email) throw new ApiError(403, "REAUTH_REQUIRED", "Contactează-ne pentru ștergerea acestui cont.");
  const { data, error } = await auth.supabase.auth.signInWithPassword({ email: auth.user.email, password: body.password });
  if (error || data.user?.id !== auth.user.id) throw new ApiError(403, "REAUTH_REQUIRED", "Parola nu este corectă. Contul nu a fost șters.");
  const { error: deletionError } = await admin.rpc("delete_customer_account", { p_user_id: auth.user.id });
  if (deletionError?.message.includes("account_open_shops")) throw new ApiError(409, "ACCOUNT_OPEN_SHOPS", "Închide mai întâi atelierele tale din Studio, apoi revino pentru ștergerea contului.");
  if (deletionError?.message.includes("account_open_orders")) throw new ApiError(409, "ACCOUNT_OPEN_ORDERS", "Ai comenzi în curs. Finalizează sau anulează comenzile înainte de ștergerea contului.");
  if (deletionError?.message.includes("account_open_returns")) throw new ApiError(409, "ACCOUNT_OPEN_RETURNS", "Ai cereri de retur deschise. Așteaptă soluționarea lor înainte de ștergerea contului.");
  databaseError(deletionError);
  return Response.json({ deleted: true });
});
