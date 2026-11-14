import { after } from "next/server";
import { notifyPaidOrder } from "@/lib/email/server";
import { OrderUnconfirmed } from "@/components/order-confirmation";
import { StripeSuccess } from "@/components/stripe-success";
import { getStripeClient } from "@/lib/stripe";
import { persistStripeOrder } from "@/lib/stripe-order";

export const maxDuration = 30;
export const metadata = { title: "Confirmare comandă", robots: { index: false, follow: false } };

export default async function StripeSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const sessionId = (await searchParams).session_id;
  const stripe = getStripeClient();
  if (!sessionId?.startsWith("cs_test_") || !stripe) return <OrderUnconfirmed />;

  let receipt: Awaited<ReturnType<typeof persistStripeOrder>> | null = null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["invoice"] });
    if (session.payment_status === "paid") receipt = await persistStripeOrder(session);
  } catch {}
  if (!receipt) return <OrderUnconfirmed />;
  const orderCode = receipt.code;
  after(() => notifyPaidOrder(orderCode));
  return <StripeSuccess receipt={{ ...receipt, date: new Date().toLocaleString("ro-RO") }} />;
}
