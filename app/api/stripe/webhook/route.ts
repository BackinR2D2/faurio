import type Stripe from "stripe";
import { after } from "next/server";
import { notifyPaidOrder } from "@/lib/email/server";
import { getStripeClient } from "@/lib/stripe";
import { persistStripeOrder } from "@/lib/stripe-order";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { reconcileChargeRefund } from "@/lib/commerce/refunds";
import { acceptsTestCheckoutSession, acceptsTestPaymentEvent } from "@/lib/commerce/payment-policy";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!stripe || !webhookSecret) return Response.json({ error: "Webhook Stripe neconfigurat." }, { status: 503 });
  if (!signature) return Response.json({ error: "Semnătură Stripe lipsă." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch {
    return Response.json({ error: "Semnătură Stripe invalidă." }, { status: 400 });
  }

  if (!acceptsTestPaymentEvent(event)) return Response.json({ error: "Mediul evenimentului nu corespunde configurării plăților." }, { status: 400 });

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    if (!acceptsTestCheckoutSession(session)) return Response.json({ error: "Sesiunea de plată nu aparține mediului de test." }, { status: 400 });
    if (session.payment_status === "paid") {
      try { const order = await persistStripeOrder(session); after(() => notifyPaidOrder(order.code)); }
      catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Comanda nu a putut fi confirmată." }, { status: 500 }); }
    }
  }
  if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object;
    if (!acceptsTestCheckoutSession(session)) return Response.json({ error: "Sesiunea de plată nu aparține mediului de test." }, { status: 400 });
    const admin = getSupabaseAdmin();
    if (!admin) return Response.json({ error: "Baza de date nu este configurată." }, { status: 503 });
    if (session.client_reference_id) {
      const { error } = await admin.rpc("cancel_pending_order", { p_code: session.client_reference_id });
      if (error) return Response.json({ error: "Anularea va fi reîncercată." }, { status: 500 });
    }
  }

  if (event.type === "charge.refunded") {
    try { await reconcileChargeRefund(stripe, event.data.object.id); }
    catch { return Response.json({ error: "Rambursarea va fi reconciliată la reîncercare." }, { status: 500 }); }
  }
  if (event.type === "application_fee.refunded") {
    const charge = event.data.object.charge;
    try { await reconcileChargeRefund(stripe, typeof charge === "string" ? charge : charge.id); }
    catch { return Response.json({ error: "Comisionul va fi reconciliat la reîncercare." }, { status: 500 }); }
  }

  return Response.json({ received: true });
}
