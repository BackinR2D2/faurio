import type Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase-server";

function paymentReference(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") return session.payment_intent;
  return session.payment_intent?.id || session.id;
}

function hostedInvoiceUrl(session: Stripe.Checkout.Session) {
  if (!session.invoice || typeof session.invoice === "string") return undefined;
  return session.invoice.hosted_invoice_url || undefined;
}

export async function persistStripeOrder(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid" || session.currency !== "ron") throw new Error("Plata în RON nu este confirmată.");
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Baza de date nu este configurată.");
  const code = session.metadata?.order_code || session.client_reference_id;
  if (!code || session.amount_total == null) throw new Error("Sesiunea Stripe nu conține identificatorul comenzii.");
  const { data: pending, error: pendingError } = await admin.from("orders").select("stripe_session_id,total").eq("code", code).single();
  if (pendingError || !pending || pending.stripe_session_id !== session.id || Math.round(Number(pending.total) * 100) !== session.amount_total) throw new Error("Sesiunea Stripe nu corespunde comenzii înregistrate.");
  const paymentId = paymentReference(session);
  const invoiceUrl = hostedInvoiceUrl(session);
  const { error } = await admin.rpc("complete_paid_order", { p_code: code, p_payment_id: paymentId, p_total: session.amount_total / 100, p_invoice_url: invoiceUrl || null });
  if (error) throw new Error(error.message);
  const { data: order, error: orderError } = await admin.from("orders").select("code,total,customer_name,customer_email,invoice_url,items,stripe_session_id,payment_id").eq("code", code).single();
  if (orderError || !order) throw new Error(orderError?.message || "Comanda nu a putut fi citită.");
  if (order.stripe_session_id !== session.id || order.payment_id !== paymentId) throw new Error("Sesiunea nu corespunde comenzii.");
  return { code: String(order.code), paymentId, total: Number(order.total), itemIds: (order.items as { id: string }[]).map((item) => item.id), invoiceUrl: order.invoice_url ? String(order.invoice_url) : invoiceUrl, customer: { name: String(order.customer_name), email: String(order.customer_email) } };
}
