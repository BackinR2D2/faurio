export function GET() {
  return Response.json({ status: "ok", service: "faurio", paymentMode: "test-only", marketplacePayments: process.env.STRIPE_CONNECT_ENABLED === "true" ? "connect-configured" : "disabled" }, { headers: { "Cache-Control": "no-store" } });
}
