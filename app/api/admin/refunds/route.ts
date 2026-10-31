import { z } from "zod";
import { api, ApiError, databaseError, readJson, requireOperator } from "@/lib/marketplace/http";
import { getStripeClient } from "@/lib/stripe";

export const POST = api(async (request) => {
  const { admin } = await requireOperator(request);
  const body = await readJson(request, z.object({ code: z.string().min(1).max(100), amountMinor: z.number().int().positive().max(100000000) }).strict());
  const { data: order, error } = await admin.from("orders").select("code,payment_id,total,status").eq("code", body.code).single();
  databaseError(error);
  if (!order || order.status !== "paid" || !String(order.payment_id).startsWith("pi_")) throw new ApiError(409, "ORDER_NOT_REFUNDABLE", "Comanda nu poate fi rambursată.");
  const { data: finance, error: financeError } = await admin.from("marketplace_order_finance").select("stripe_account_id,refunded_minor,test_mode").eq("order_code", body.code).maybeSingle();
  databaseError(financeError);
  if (!finance?.test_mode) throw new ApiError(409, "TEST_ORDER_REQUIRED", "Acest instrument permite doar comenzi Stripe de test cu evidență financiară.");
  if (body.amountMinor > Math.round(Number(order.total) * 100) - Number(finance.refunded_minor)) throw new ApiError(400, "REFUND_EXCEEDS_REMAINDER", "Suma depășește valoarea nerambursată.");
  const stripe = getStripeClient();
  if (!stripe) throw new ApiError(503, "STRIPE_UNAVAILABLE", "Stripe nu este configurat.");
  const refund = await stripe.refunds.create({ payment_intent: String(order.payment_id), amount: body.amountMinor,
    ...(finance.stripe_account_id ? { reverse_transfer: true, refund_application_fee: true } : {}) },
    { idempotencyKey: `faurio-refund-${body.code}-${finance.refunded_minor}-${body.amountMinor}` });
  return Response.json({ id: refund.id, status: refund.status, pendingReconciliation: true });
});
