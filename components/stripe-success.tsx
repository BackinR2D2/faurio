"use client";

import { useEffect, useRef } from "react";
import { useShop } from "@/components/shop-provider";
import { OrderConfirmation } from "@/components/order-confirmation";

type StripeReceipt = { code: string; paymentId: string; date: string; total: number; itemIds: string[]; invoiceUrl?: string; customer: { name: string; email: string } };

export function StripeSuccess({ receipt }: { receipt: StripeReceipt }) {
  const { removeFromCart } = useShop();
  const saved = useRef(false);

  useEffect(() => {
    if (saved.current) return;
    saved.current = true;
    receipt.itemIds.forEach(removeFromCart);
  }, [removeFromCart, receipt]);

  return <OrderConfirmation receipt={receipt} />;
}
