import { readPaymentPolicy } from "@/lib/commerce/payment-policy";

export function GET() {
  const policy = readPaymentPolicy(process.env);
  return Response.json({ status: "ok", service: "faurio", paymentMode: policy.mode === "test" ? "test-only" : policy.mode === "disabled" ? "disabled" : "unavailable", paymentsReady: policy.ready, livePaymentsEnabled: false, marketplacePayments: process.env.STRIPE_CONNECT_ENABLED === "true" ? "connect-configured" : "disabled" }, { headers: { "Cache-Control": "no-store" } });
}
