import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout-view";
import { readPaymentPolicy } from "@/lib/commerce/payment-policy";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ coupon?: string; payment?: string }> }) {
  const params = await searchParams;
  return <CheckoutView coupon={params.coupon === "POVESTE10"} stripeEnabled={Boolean(readPaymentPolicy(process.env).ready && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_URL)} paymentCancelled={params.payment === "cancelled"} />;
}
