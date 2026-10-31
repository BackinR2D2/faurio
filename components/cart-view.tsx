"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";
import { useState } from "react";
import { useShop } from "@/components/shop-provider";
import { money } from "@/lib/catalog";
import { cartShippingByMaker } from "@/lib/commerce/fees";

export function CartView() {
  const { cart, subtotal, changeQuantity, removeFromCart } = useShop();
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState(false);
  const { shipping, makers } = cartShippingByMaker(cart);
  const discount = applied ? subtotal * .1 : 0;
  const total = subtotal + shipping - discount;
  if (!cart.length) return <main className="page-main empty-cart-page"><ShoppingBag /><h1>Coșul este gol.</h1><Link className="primary-button" href="/catalog">Vezi catalogul <ArrowRight /></Link></main>;
  return <main className="page-main cart-page"><div className="page-heading"><p className="eyebrow">Coș</p><h1>Alegerile tale</h1><p>{cart.reduce((sum, line) => sum + line.quantity, 0)} articole</p></div>
    <div className="cart-layout"><section className="cart-list">{cart.map((line) => <article key={line.product.id}><Link href={`/produs/${line.product.id}`}><Image src={line.product.image} alt={line.product.name} width={135} height={155} style={{ objectPosition: line.product.imagePosition || "center" }} /></Link><div><p>{line.product.category} · {line.product.maker}</p><Link href={`/produs/${line.product.id}`}><h2>{line.product.name}</h2></Link><small>Expediere în {line.product.days} {line.product.days === 1 ? "zi" : "zile"}</small><div className="cart-line-bottom"><div className="quantity-control"><button onClick={() => changeQuantity(line.product.id, -1)}><Minus /></button><b>{line.quantity}</b><button onClick={() => changeQuantity(line.product.id, 1)}><Plus /></button></div><button className="remove-line" onClick={() => removeFromCart(line.product.id)}><Trash2 /> Elimină</button></div></div><strong>{money.format(line.product.price * line.quantity)}</strong></article>)}</section>
      <aside className="order-summary"><h2>Sumarul comenzii</h2><p><span>Subtotal</span><b>{money.format(subtotal)}</b></p>{discount > 0 && <p className="discount"><span>Reducere POVESTE10</span><b>− {money.format(discount)}</b></p>}<p><span>Livrare</span><b>{shipping ? money.format(shipping) : "Gratuit"}</b></p>{makers === 1 && <div className="shipping-progress"><span style={{ width: `${Math.min(100, subtotal / 2.5)}%` }} /> </div>}<small><Truck /> {makers > 1 ? `Transport separat pentru ${makers} ateliere.` : subtotal >= 250 ? "Ai livrare gratuită." : `Mai adaugă ${money.format(250 - subtotal)} pentru livrare gratuită.`}</small><form onSubmit={(event) => { event.preventDefault(); setApplied(coupon.trim().toUpperCase() === "POVESTE10"); }}><input value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="Cod promoțional" /><button>Aplică</button></form><p className="summary-total"><span>Total</span><b>{money.format(total)}</b></p><small>Costul final este confirmat înainte de plată. Fiecare atelier se achită separat.</small><Link className="primary-button" href={`/checkout${applied ? "?coupon=POVESTE10" : ""}`}>Continuă la checkout <ArrowRight /></Link><Link className="continue-link" href="/catalog">← Continuă cumpărăturile</Link></aside>
    </div>
  </main>;
}
