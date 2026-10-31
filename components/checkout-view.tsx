"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CreditCard, Leaf, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { useShop } from "@/components/shop-provider";
import { money } from "@/lib/catalog";
import { useAuth } from "@/components/auth-provider";

export function CheckoutView({ coupon = false, stripeEnabled, paymentCancelled = false }: { coupon?: boolean; stripeEnabled: boolean; paymentCancelled?: boolean }) {
  const { user, accessToken } = useAuth();
  const { cart: fullCart } = useShop();
  const [selectedShop, setSelectedShop] = useState("");
  const shopKeys = [...new Set(fullCart.map((line) => line.product.shopId || "legacy"))];
  const currentShop = shopKeys.includes(selectedShop) ? selectedShop : shopKeys[0];
  const cart = fullCart.filter((line) => (line.product.shopId || "legacy") === currentShop);
  const subtotal = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const checkoutAttempt = useRef<{ fingerprint: string; id: string } | null>(null);
  const [error, setError] = useState(paymentCancelled ? "Plata a fost anulată. Coșul tău a rămas neschimbat." : "");
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "", address: "", city: "", county: "", postalCode: "" });
  const discount = coupon ? subtotal * .1 : 0;
  const shipping = subtotal >= 250 ? 0 : 19;
  const total = subtotal - discount + shipping;

  useEffect(() => {
    if (!user) return;
    queueMicrotask(() => setCustomer((current) => ({ ...current, name: current.name || user.name, email: user.email })));
    if (!accessToken) return;
    let active = true;
    void fetch("/api/profile", { headers: { Authorization: `Bearer ${accessToken}` } }).then(async (response) => response.ok ? response.json() : null).then((data: { profile?: Partial<typeof customer> } | null) => {
      if (active && data?.profile) setCustomer((current) => ({ ...current, ...data.profile, email: user.email }));
    });
    return () => { active = false; };
  }, [accessToken, user]);

  if (!cart.length) return <main className="page-main empty-cart-page"><h1>Nu ai produse de finalizat.</h1><p>Adaugă cel puțin un produs înainte de a continua la checkout.</p><Link className="primary-button" href="/catalog">Mergi la catalog</Link></main>;

  const finish = async (event: React.FormEvent) => {
    event.preventDefault(); setError("");
    if (!stripeEnabled) { setError("Plata online nu este configurată momentan."); return; }
    setProcessing(true);
    try {
      const { name, phone, address, city, county, postalCode } = customer;
      const payload = { items: cart.map((line) => ({ id: line.product.id, quantity: line.quantity })), email: customer.email, customer: { name, phone, address, city, county, postalCode }, coupon: coupon ? "POVESTE10" : "" };
      const fingerprint = JSON.stringify(payload);
      if (checkoutAttempt.current?.fingerprint !== fingerprint) checkoutAttempt.current = { fingerprint, id: crypto.randomUUID() };
      const checkoutResponse = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify({ ...payload, requestId: checkoutAttempt.current.id }) });
      const checkout = await checkoutResponse.json() as { url?: string; error?: string; code?: string };
      if (checkout.code === "CHECKOUT_ATTEMPT_UNAVAILABLE") checkoutAttempt.current = null;
      if (!checkoutResponse.ok) throw new Error(checkout.error || "Plata nu a putut fi inițializată.");
      if (!checkout.url) throw new Error("Stripe nu a returnat pagina de plată.");
      location.assign(checkout.url);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "A apărut o eroare."); } finally { setProcessing(false); }
  };

  return <main className="checkout-page"><section className="checkout-main"><div className="checkout-top"><Link href="/cos">← Înapoi la coș</Link><span><LockKeyhole /> Checkout securizat</span></div><div className="checkout-title"><p className="eyebrow">Finalizare comandă</p><h1>Încă puțin și pleacă spre tine.</h1></div>
    {shopKeys.length > 1 && <label className="checkout-maker-select">Achită un atelier<select value={currentShop} onChange={(event) => { setSelectedShop(event.target.value); setStep(1); }}>{shopKeys.map((key) => <option key={key} value={key}>{fullCart.find((line) => (line.product.shopId || "legacy") === key)?.product.maker}</option>)}</select><small>Fiecare atelier are o plată și o livrare separate. Celelalte produse rămân în coș.</small></label>}<div className="checkout-steps"><span className={step >= 1 ? "active" : ""}><b>{step > 1 ? <Check /> : "1"}</b>Date de livrare</span><i /><span className={step >= 2 ? "active" : ""}><b>2</b>Plată</span></div>
    {!user && <div className="account-nudge"><UserRound /><span><strong>Checkout mai rapid cu un cont</strong></span><Link href="/cont">Autentifică-te</Link></div>}
    {step === 1 ? <form className="checkout-form" onSubmit={(event) => { event.preventDefault(); setError(""); setStep(2); }}><div className="form-grid"><label className="wide">Nume<input required autoComplete="name" value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} /></label><label>Email<input required type="email" autoComplete="email" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} /></label><label>Telefon<input required type="tel" autoComplete="tel" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} /></label><label className="wide">Adresă<input required autoComplete="street-address" value={customer.address} onChange={(event) => setCustomer({ ...customer, address: event.target.value })} /></label><label>Oraș<input required value={customer.city} onChange={(event) => setCustomer({ ...customer, city: event.target.value })} /></label><label>Județ<input required value={customer.county} onChange={(event) => setCustomer({ ...customer, county: event.target.value })} /></label><label>Cod poștal<input required inputMode="numeric" value={customer.postalCode} onChange={(event) => setCustomer({ ...customer, postalCode: event.target.value })} /></label></div>{error && <p className="form-error">{error}</p>}<button className="primary-button" type="submit">Continuă <ArrowRight /></button></form> : <form className="checkout-form payment-form" onSubmit={finish}><button className="back-link" type="button" onClick={() => setStep(1)}>← Date de livrare</button><div className={`stripe-redirect${stripeEnabled ? "" : " unavailable"}`}><ShieldCheck /><span><strong>{stripeEnabled ? "Plată găzduită de Stripe" : "Plata online este indisponibilă"}</strong><small>{stripeEnabled ? "Mod de test: nu se debitează bani reali. Datele cardului se introduc numai în Stripe." : "Administratorul trebuie să configureze cheia Stripe."}</small></span>{stripeEnabled && <em>stripe</em>}</div>{error && <p className="form-error">{error}</p>}<button className="primary-button" type="submit" disabled={processing || !stripeEnabled}>{processing ? "Se deschide Stripe…" : <><CreditCard /> Continuă la Stripe · {money.format(total)}</>}</button></form>}
  </section><aside className="checkout-summary"><h2>Comanda ta</h2>{cart.map((line) => <article key={line.product.id}><div><Image src={line.product.image} alt="" width={65} height={72} /><b>{line.quantity}</b></div><span><strong>{line.product.name}</strong><small>{line.product.maker}</small></span><em>{money.format(line.product.price * line.quantity)}</em></article>)}<div className="checkout-totals"><p><span>Subtotal</span><b>{money.format(subtotal)}</b></p>{discount > 0 && <p className="discount"><span>Reducere</span><b>− {money.format(discount)}</b></p>}<p><span>Livrare</span><b>{shipping ? money.format(shipping) : "Gratuit"}</b></p><p><span>Total</span><b>{money.format(total)}</b></p></div><small><Leaf /> Ambalaj fără plastic · <ShieldCheck /> Plată securizată</small></aside></main>;
}
