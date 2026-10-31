import Stripe from "stripe";
import "server-only";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey?.startsWith("sk_test_")) return null;
  if (!stripeClient) stripeClient = new Stripe(secretKey, { maxNetworkRetries: 2 });
  return stripeClient;
}
