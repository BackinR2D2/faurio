"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, CircleCheck, CreditCard, Leaf, LockKeyhole, ReceiptText, ShieldCheck, UserRound } from "lucide-react";
import { useShop } from "@/components/shop-provider";
import { money } from "@/lib/catalog";

type UserInfo = { displayName: string; email: string } | null;
type Invoice = { code: string; paymentId: string; date: string; total: number; subtotal: number; shipping: number; discount: number; customer: { name: string; email: string; phone: string; address: string; city: string; county: string; postalCode: string }; persisted: boolean };

export function CheckoutView({ user, coupon = false }: { user: UserInfo; coupon?: boolean }) {
  const { cart, subtotal, clearCart } = useShop();
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [customer, setCustomer] = useState({ name: user?.displayName || "", email: user?.email || "", phone: "", address: "", city: "", county: "", postalCode: "" });
  const [card, setCard] = useState("4242 4242 4242 4242");
  const discount = coupon ? Math.round(subtotal * .1) : 0;
  const shipping = subtotal >= 250 ? 0 : 19;
  const total = subtotal - discount + shipping;

  if (invoice) return <main className="page-main order-success"><CircleCheck /><p className="eyebrow">Plată de test aprobată</p><h1>Mulțumim, {invoice.customer.name.split(" ")[0]}!</h1><p>Comanda <b>{invoice.code}</b> a fost înregistrată. Confirmarea a fost pregătită pentru {invoice.customer.email}.</p><section className="invoice-card"><div><span className="brand-mark"><i /><b /></span><strong>FACTURĂ</strong><small>{invoice.code}<br />{invoice.date}</small></div><p><span>Articole</span><b>{money.format(invoice.subtotal)}</b></p>{invoice.discount > 0 && <p><span>Reducere</span><b>− {money.format(invoice.discount)}</b></p>}<p><span>Livrare</span><b>{invoice.shipping ? money.format(invoice.shipping) : "Gratuit"}</b></p><p className="invoice-grand"><span>Total achitat</span><b>{money.format(invoice.total)}</b></p><footer><CreditCard /> {invoice.paymentId}<b>ACHITAT</b></footer><small>{invoice.persisted ? "Comandă salvată în baza de date Supabase." : "Comandă demo salvată local în browser."}</small></section><div className="success-actions"><button onClick={() => window.print()}><ReceiptText /> Tipărește factura</button><Link className="primary-button" href="/catalog">Continuă cumpărăturile</Link></div></main>;
  if (!cart.length) return <main className="page-main empty-cart-page"><h1>Nu ai produse de finalizat.</h1><p>Adaugă cel puțin un produs înainte de a continua la checkout.</p><Link className="primary-button" href="/catalog">Mergi la catalog</Link></main>;

  const finish = async (event: React.FormEvent) => {
    event.preventDefault(); setError("");
    if (card.replace(/\s/g, "") !== "4242424242424242") { setError("Pentru test folosește cardul 4242 4242 4242 4242."); return; }
    setProcessing(true);
    try {
      const checkoutResponse = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: cart.map((line) => ({ id: line.product.id, quantity: line.quantity })), email: customer.email, origin: location.origin }) });
      const checkout = await checkoutResponse.json() as { mode?: string; url?: string; paymentId?: string; error?: string };
      if (!checkoutResponse.ok) throw new Error(checkout.error || "Plata nu a putut fi inițializată.");
      if (checkout.mode === "stripe" && checkout.url) { location.assign(checkout.url); return; }
      const orderResponse = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer, items: cart.map((line) => ({ id: line.product.id, name: line.product.name, quantity: line.quantity, price: line.product.price })), total, paymentId: checkout.paymentId }) });
      const order = await orderResponse.json() as { orderCode?: string; persisted?: boolean; error?: string };
      if (!orderResponse.ok) throw new Error(order.error || "Comanda nu a putut fi salvată.");
      const receipt: Invoice = { code: order.orderCode || "FDP-DEMO", paymentId: checkout.paymentId || "pi_test_demo", date: new Date().toLocaleString("ro-RO"), total, subtotal, shipping, discount, customer, persisted: Boolean(order.persisted) };
      try { const orders = JSON.parse(localStorage.getItem("fir-de-poveste-orders") || "[]") as Invoice[]; localStorage.setItem("fir-de-poveste-orders", JSON.stringify([receipt, ...orders].slice(0, 20))); } catch { /* optional */ }
      clearCart(); setInvoice(receipt);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "A apărut o eroare."); } finally { setProcessing(false); }
  };

  return <main className="checkout-page"><section className="checkout-main"><div className="checkout-top"><Link href="/cos">← Înapoi la coș</Link><span><LockKeyhole /> Checkout securizat</span></div><div className="checkout-title"><p className="eyebrow">Finalizare comandă</p><h1>Încă puțin și pleacă spre tine.</h1></div>
    <div className="checkout-steps"><span className={step >= 1 ? "active" : ""}><b>{step > 1 ? <Check /> : "1"}</b>Date de livrare</span><i /><span className={step >= 2 ? "active" : ""}><b>2</b>Plată</span></div>
    {!user && <div className="account-nudge"><UserRound /><span><strong>Ai deja cont?</strong><small>Autentifică-te pentru date precompletate și istoricul comenzilor.</small></span><Link href="/cont">Intră în cont</Link></div>}
    {step === 1 ? <form className="checkout-form" onSubmit={(event) => { event.preventDefault(); setStep(2); }}><div className="form-grid"><label className="wide">Nume complet<input required autoComplete="name" value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} /></label><label>Email<input required type="email" autoComplete="email" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} /></label><label>Telefon<input required type="tel" autoComplete="tel" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} /></label><label className="wide">Adresă<input required autoComplete="street-address" value={customer.address} onChange={(event) => setCustomer({ ...customer, address: event.target.value })} placeholder="Stradă, număr, bloc, apartament" /></label><label>Oraș<input required value={customer.city} onChange={(event) => setCustomer({ ...customer, city: event.target.value })} /></label><label>Județ<input required value={customer.county} onChange={(event) => setCustomer({ ...customer, county: event.target.value })} /></label><label>Cod poștal<input required inputMode="numeric" value={customer.postalCode} onChange={(event) => setCustomer({ ...customer, postalCode: event.target.value })} /></label></div><button className="primary-button" type="submit">Continuă la plată <ArrowRight /></button></form> : <form className="checkout-form payment-form" onSubmit={finish}><button className="back-link" type="button" onClick={() => setStep(1)}>← Modifică datele</button><div className="sandbox-note"><ShieldCheck /><span><strong>Mediu de test</strong><small>Nu se retrag bani reali. Cu o cheie Stripe test, vei fi redirecționat către Stripe Checkout.</small></span></div><label>Numărul cardului<input required inputMode="numeric" value={card} onChange={(event) => setCard(event.target.value)} /></label><div className="form-grid"><label>Data expirării<input required defaultValue="12/34" /></label><label>CVC<input required defaultValue="123" /></label></div><p className="test-card">Card test: <button type="button" onClick={() => setCard("4242 4242 4242 4242")}>4242 4242 4242 4242</button></p>{error && <p className="form-error">{error}</p>}<button className="primary-button" type="submit" disabled={processing}>{processing ? "Se procesează…" : <><CreditCard /> Plătește {money.format(total)}</>}</button></form>}
  </section><aside className="checkout-summary"><h2>Comanda ta</h2>{cart.map((line) => <article key={line.product.id}><div><img src={line.product.image} alt="" /><b>{line.quantity}</b></div><span><strong>{line.product.name}</strong><small>{line.product.maker}</small></span><em>{money.format(line.product.price * line.quantity)}</em></article>)}<div className="checkout-totals"><p><span>Subtotal</span><b>{money.format(subtotal)}</b></p>{discount > 0 && <p className="discount"><span>Reducere</span><b>− {money.format(discount)}</b></p>}<p><span>Livrare</span><b>{shipping ? money.format(shipping) : "Gratuit"}</b></p><p><span>Total</span><b>{money.format(total)}</b></p></div><small><Leaf /> Ambalaj fără plastic · <ShieldCheck /> Plată securizată</small></aside></main>;
}
