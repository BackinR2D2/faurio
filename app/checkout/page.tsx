import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout-view";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ coupon?: string; payment?: string }> }) {
  const params = await searchParams;
  return <CheckoutView coupon={params.coupon === "POVESTE10"} stripeEnabled={Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_URL)} paymentCancelled={params.payment === "cancelled"} />;
}
