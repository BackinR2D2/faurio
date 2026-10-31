"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CircleCheck } from "lucide-react";
import { useShop } from "@/components/shop-provider";
import { money } from "@/lib/catalog";

type StripeReceipt = { code: string; paymentId: string; date: string; total: number; itemIds: string[]; invoiceUrl?: string; customer: { name: string; email: string } };

export function StripeSuccess({ receipt }: { receipt: StripeReceipt }) {
  const { removeFromCart } = useShop();
  const saved = useRef(false);

  useEffect(() => {
    if (saved.current) return;
    saved.current = true;
    receipt.itemIds.forEach(removeFromCart);
  }, [removeFromCart, receipt]);

  return <main className="page-main order-success"><CircleCheck /><p className="eyebrow">Plată confirmată</p><h1>Mulțumim, {receipt.customer.name.split(" ")[0]}!</h1><p>Comanda <b>{receipt.code}</b>, în valoare de <b>{money.format(receipt.total)}</b>, este înregistrată.</p><div className="success-actions">{receipt.invoiceUrl && <a className="primary-button" href={receipt.invoiceUrl} target="_blank" rel="noreferrer">Document Stripe</a>}<Link href="/cont/profil">Vezi comenzile</Link><Link href="/catalog">Continuă cumpărăturile</Link></div></main>;
}
