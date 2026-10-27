import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout-view";
import { getChatGPTUser } from "@/app/chatgpt-auth";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout securizat" };
export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ coupon?: string }> }) {
  const [user, params] = await Promise.all([getChatGPTUser(), searchParams]);
  return <CheckoutView user={user ? { displayName: user.displayName, email: user.email } : null} coupon={params.coupon === "POVESTE10"} />;
}
