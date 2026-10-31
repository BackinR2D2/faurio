import Link from "next/link";
import { after } from "next/server";
import { notifyPaidOrder } from "@/lib/email/server";
import { CircleX } from "lucide-react";
import { StripeSuccess } from "@/components/stripe-success";
import { getStripeClient } from "@/lib/stripe";
import { persistStripeOrder } from "@/lib/stripe-order";

export const maxDuration = 30;
export const metadata = { title: "Confirmare comandă", robots: { index: false, follow: false } };

function Failure() {
  return <main className="page-main order-success"><CircleX /><p className="eyebrow">Plată neconfirmată</p><h1>Nu am putut valida plata.</h1><p>Reia checkout-ul sau contactează-ne dacă suma a fost rezervată.</p><Link className="primary-button" href="/checkout">Înapoi la checkout</Link></main>;
}

export default async function StripeSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const sessionId = (await searchParams).session_id;
  const stripe = getStripeClient();
  if (!sessionId?.startsWith("cs_") || !stripe) return <Failure />;

  let receipt: Awaited<ReturnType<typeof persistStripeOrder>> | null = null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["invoice"] });
    if (session.payment_status === "paid") receipt = await persistStripeOrder(session);
  } catch {}
  if (!receipt) return <Failure />;
  const orderCode = receipt.code;
  after(() => notifyPaidOrder(orderCode));
  return <StripeSuccess receipt={{ ...receipt, date: new Date().toLocaleString("ro-RO") }} />;
}
