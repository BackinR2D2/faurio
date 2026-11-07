import { z } from "zod";
import { api, ApiError, databaseError, readJson, requireShop } from "@/lib/marketplace/http";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getStripeClient } from "@/lib/stripe";
import { syncConnectedAccount } from "@/lib/commerce/connect";
import { FEE_POLICY_VERSION } from "@/lib/commerce/fees";
import { getSiteUrl } from "@/lib/site-url";
import { connectFailure } from "@/lib/commerce/connect-errors";

async function connectRequest<T>(operation: () => Promise<T>) {
  try { return await operation(); }
  catch (error) {
    const failure = connectFailure(error);
    if (!failure) throw error;
    console.error("CONNECT_REQUEST_FAILED", { code: failure.code, providerRequestId: error && typeof error === "object" && "requestId" in error && typeof error.requestId === "string" ? error.requestId : undefined });
    throw new ApiError(failure.status, failure.code, failure.message);
  }
}

export const GET = api(async (request) => {
  const shopId = z.uuid().parse(new URL(request.url).searchParams.get("shop"));
  const auth = await requireShop(request, shopId);
  const { data, error } = await auth.supabase.from("shop_payment_accounts").select("stripe_account_id,test_mode,charges_enabled,payouts_enabled,transfers_enabled").eq("shop_id", shopId).maybeSingle();
  databaseError(error);
  if (!data) return Response.json({ connected: false, enabled: process.env.STRIPE_CONNECT_ENABLED === "true", testMode: true, ready: false });
  const stripe = getStripeClient();
  const status = stripe ? await syncConnectedAccount(await connectRequest(() => stripe.accounts.retrieve(String(data.stripe_account_id)))) : { ready: false };
  return Response.json({ connected: true, enabled: process.env.STRIPE_CONNECT_ENABLED === "true", testMode: data.test_mode, ...status });
});

export const POST = api(async (request) => {
  const body = await readJson(request, z.object({ shopId: z.uuid(), action: z.enum(["onboard", "dashboard"]), acceptFeePolicy: z.boolean().optional() }).strict());
  const auth = await requireShop(request, body.shopId, true);
  const { data: membership } = await auth.supabase.from("shop_memberships").select("role").eq("shop_id", body.shopId).eq("user_id", auth.user.id).is("revoked_at", null).single();
  if (membership?.role !== "owner" || !auth.user.email_confirmed_at) throw new ApiError(403, "OWNER_REQUIRED", "Doar titularul cu email confirmat poate configura încasările.");
  if (process.env.STRIPE_CONNECT_ENABLED !== "true") throw new ApiError(503, "CONNECT_SETUP_REQUIRED", "Administratorul trebuie să activeze configurarea încasărilor.");
  const stripe = getStripeClient(); const db = getSupabaseAdmin();
  if (!stripe || !db) throw new ApiError(503, "PAYMENT_SETUP_REQUIRED", "Serviciul de încasări nu este configurat.");
  const { data: shop } = await auth.supabase.from("shops").select("name,country,status,is_legacy").eq("id", body.shopId).single();
  if (!shop || shop.is_legacy || shop.status !== "active") throw new ApiError(409, "APPROVAL_REQUIRED", "Încasările se configurează după aprobarea atelierului.");
  const { data: existing, error } = await db.from("shop_payment_accounts").select("stripe_account_id,test_mode").eq("shop_id", body.shopId).maybeSingle();
  databaseError(error);
  if (body.action === "dashboard") {
    if (!existing?.test_mode) throw new ApiError(409, "ONBOARDING_REQUIRED", "Configurează mai întâi contul de încasări.");
    const link = await connectRequest(() => stripe.accounts.createLoginLink(String(existing.stripe_account_id)));
    return Response.json({ url: link.url });
  }
  if (!body.acceptFeePolicy) throw new ApiError(400, "FEE_CONSENT_REQUIRED", "Acceptă condițiile pentru creatori și plăți înainte de configurare.");
  const { error: consentError } = await db.from("seller_fee_acceptances").upsert({ shop_id: body.shopId, user_id: auth.user.id, version: FEE_POLICY_VERSION, accepted_at: new Date().toISOString() });
  databaseError(consentError);
  const accountId = existing?.stripe_account_id || (await connectRequest(() => stripe.accounts.create({ type: "express", country: shop.country, email: auth.user.email,
    capabilities: { card_payments: { requested: true }, transfers: { requested: true } }, metadata: { shop_id: body.shopId, platform: "faurio" } },
    { idempotencyKey: `faurio-connect-test-${body.shopId}` }))).id;
  if (!existing) {
    const { error: saveError } = await db.from("shop_payment_accounts").insert({ shop_id: body.shopId, stripe_account_id: accountId, test_mode: true });
    if (saveError && saveError.code !== "23505") databaseError(saveError);
  }
  const origin = getSiteUrl();
  const link = await connectRequest(() => stripe.accountLinks.create({ account: String(accountId), type: "account_onboarding",
    refresh_url: `${origin}/studio/payments?shop=${body.shopId}&refresh=1`, return_url: `${origin}/studio/payments?shop=${body.shopId}&returned=1` }));
  return Response.json({ url: link.url });
});
