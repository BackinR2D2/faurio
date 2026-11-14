import Stripe from "stripe";
import "server-only";
import { readPaymentPolicy } from "@/lib/commerce/payment-policy";

let cachedClient: { key: string; client: Stripe } | null = null;

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!readPaymentPolicy(process.env).ready || !secretKey) return null;
  if (cachedClient?.key !== secretKey) cachedClient = { key: secretKey, client: new Stripe(secretKey, { maxNetworkRetries: 2 }) };
  return cachedClient.client;
}
