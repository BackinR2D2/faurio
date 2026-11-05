import { notFound } from "next/navigation";
import { OrderConfirmation, OrderUnconfirmed } from "@/components/order-confirmation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Previzualizare locală · Confirmare comandă", robots: { index: false, follow: false } };

export default async function CheckoutPreview({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { state } = await searchParams;
  return <>
    <p className="confirmation-preview-label">Previzualizare locală · Date fictive · Nu reprezintă o comandă</p>
    {state === "unconfirmed" ? <OrderUnconfirmed /> : <OrderConfirmation receipt={{
      code: "FAU-2026-4067165A-8C75-4D2F-A566-BB5FA9C29CB9",
      total: 803,
      customer: { name: "Cristian" },
    }} />}
  </>;
}
