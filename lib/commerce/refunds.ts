import "server-only";
import type Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function reconcileChargeRefund(stripe: Stripe, chargeId: string) {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const charge = await stripe.charges.retrieve(chargeId, { expand: ["application_fee"] });
  const payment = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!payment) return;
  const fee = charge.application_fee;
  const refundedFee = typeof fee === "object" && fee ? fee.amount_refunded : typeof fee === "string" ? (await stripe.applicationFees.retrieve(fee)).amount_refunded : 0;
  const { error } = await db.rpc("reconcile_order_refund", { p_payment: payment, p_refunded: charge.amount_refunded, p_fee_refunded: refundedFee });
  if (error) throw new Error("REFUND_RECONCILIATION_FAILED");
}
