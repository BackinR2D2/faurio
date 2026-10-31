import "server-only";
import type Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getStripeClient } from "@/lib/stripe";

export async function syncConnectedAccount(account: Stripe.Account) {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const { error } = await db.from("shop_payment_accounts").update({ charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled, transfers_enabled: account.capabilities?.transfers === "active", updated_at: new Date().toISOString() }).eq("stripe_account_id", account.id);
  if (error) throw new Error("CONNECT_SYNC_FAILED");
  return { chargesEnabled: account.charges_enabled, payoutsEnabled: account.payouts_enabled,
    ready: Boolean(account.charges_enabled && account.payouts_enabled && account.capabilities?.transfers === "active") };
}

export async function getCheckoutDestination(shopId?: string) {
  const db = getSupabaseAdmin();
  if (!db || !shopId) return null;
  const { data: shop, error: shopError } = await db.from("shops").select("is_legacy,status").eq("id", shopId).single();
  if (shopError || !shop || shop.status !== "active") throw new Error("Atelierul nu poate primi comenzi acum.");
  if (shop.is_legacy) return null;
  if (process.env.STRIPE_CONNECT_ENABLED !== "true") throw new Error("Plățile pentru creatori nu sunt activate încă.");
  const { data, error } = await db.from("shop_payment_accounts").select("stripe_account_id,test_mode").eq("shop_id", shopId).single();
  if (error || !data || !data.test_mode) throw new Error("Creatorul trebuie să finalizeze configurarea Stripe.");
  const stripe = getStripeClient();
  if (!stripe) throw new Error("Stripe nu este configurat.");
  const account = await stripe.accounts.retrieve(String(data.stripe_account_id));
  if (!(await syncConnectedAccount(account)).ready) throw new Error("Stripe nu a activat încasările acestui creator.");
  return account.id;
}
