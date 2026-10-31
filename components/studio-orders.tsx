"use client";

import { useCallback, useEffect, useState } from "react";
import { useStudio } from "@/components/studio-shell";
import { studioRequest } from "@/lib/marketplace/client";

type SellerOrder = { code: string; customer_name: string; shipping_address: string; customer_phone: string; status: string; created_at: string;
  items: { name: string; quantity: number }[]; product_subtotal_minor: number; shipping_minor: number; fee_minor: number; seller_transfer_minor: number;
  refunded_minor: number; fee_refunded_minor: number; test_mode: boolean; state: "unfulfilled" | "preparing" | "shipped" | "delivered"; carrier: string; tracking: string };
const money = (minor: number) => new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(minor / 100);
const labels = { unfulfilled: "De pregătit", preparing: "În pregătire", shipped: "Expediată", delivered: "Livrată" };
export function StudioOrders() {
  const { shop, token } = useStudio();
  const [orders, setOrders] = useState<SellerOrder[] | null>(null);
  const [page, setPage] = useState(1); const [total, setTotal] = useState(0);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try { const result = await studioRequest<{ orders: SellerOrder[]; total: number }>(`/api/studio/orders?shop=${shop.id}&page=${page}`, token); setOrders(result.orders); setTotal(result.total); }
    catch (caught) { setError((caught as Error).message); }
  }, [shop.id, token, page]);
  useEffect(() => {
    const controller = new AbortController();
    studioRequest<{ orders: SellerOrder[]; total: number }>(`/api/studio/orders?shop=${shop.id}&page=${page}`, token, { signal: controller.signal }).then((result) => { setOrders(result.orders); setTotal(result.total); })
      .catch((caught) => { if (!controller.signal.aborted) setError((caught as Error).message); });
    return () => controller.abort();
  }, [shop.id, token, page]);
  async function update(order: SellerOrder, form: FormData) {
    setBusy(true); setError("");
    const next = { unfulfilled: "preparing", preparing: "shipped", shipped: "delivered", delivered: "delivered" }[order.state];
    try { await studioRequest("/api/studio/orders", token, { method: "PATCH", body: JSON.stringify({ shopId: shop.id, code: order.code, state: next,
      carrier: String(form.get("carrier") || order.carrier), tracking: String(form.get("tracking") || order.tracking) }) }); await refresh(); }
    catch (caught) { setError((caught as Error).message); } finally { setBusy(false); }
  }
  return <section><header className="studio-heading"><p className="eyebrow">Din atelier, spre oameni</p><h1>Comenzi.</h1><p>Doar comenzile achitate pentru atelierul tău. Sumele de test nu sunt un sold bancar.</p></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    {!orders && !error && <p role="status">Se citesc comenzile…</p>}
    {orders?.length === 0 && <div className="studio-empty-inline"><h2>Nicio comandă achitată încă.</h2><p>Publică pagina și produsele, apoi finalizează configurarea Stripe.</p></div>}
    <div className="seller-orders">{orders?.map((order) => <article className="seller-order" key={order.code}><header><div><small>{order.test_mode ? "STRIPE TEST" : "PLATĂ CONFIRMATĂ"}</small><h2>{order.code}</h2></div><span>{order.status === "refunded" ? "Rambursată" : labels[order.state]}</span></header><ul>{order.items.map((item, index) => <li key={index}>{item.quantity} × {item.name}</li>)}</ul><dl><div><dt>Produse după reduceri</dt><dd>{money(order.product_subtotal_minor)}</dd></div><div><dt>Livrare</dt><dd>{money(order.shipping_minor)}</dd></div><div><dt>Comision Faurio</dt><dd>{money(order.fee_minor)}</dd></div><div><dt>Transfer inițial către creator</dt><dd>{money(order.seller_transfer_minor)}</dd></div>{order.refunded_minor > 0 && <><div><dt>Rambursat clientului</dt><dd>{money(order.refunded_minor)}</dd></div><div><dt>Comision restituit</dt><dd>{money(order.fee_refunded_minor)}</dd></div></>}</dl><p><strong>{order.customer_name}</strong><br />{order.shipping_address}<br />{order.customer_phone}</p>
      {order.status === "paid" && order.refunded_minor === 0 && order.state !== "delivered" && <form onSubmit={(event) => { event.preventDefault(); void update(order, new FormData(event.currentTarget)); }}>{order.state === "preparing" && <div className="studio-form-row"><label>Curier<input name="carrier" required minLength={2} maxLength={80} defaultValue={order.carrier} /></label><label>Număr de urmărire<input name="tracking" required minLength={3} maxLength={160} defaultValue={order.tracking} /></label></div>}<button className="studio-secondary" disabled={busy || ["suspended", "closed"].includes(shop.status)}>{order.state === "unfulfilled" ? "Începe pregătirea" : order.state === "preparing" ? "Confirmă expedierea" : "Confirmă livrarea"}</button></form>}{order.tracking && <p>Urmărire: {order.carrier} · {order.tracking}</p>}
    </article>)}</div>{total > 20 && <nav className="maker-page-links" aria-label="Pagini comenzi"><button disabled={page === 1} onClick={() => setPage(page - 1)}>Înapoi</button><span>{page} / {Math.ceil(total / 20)}</span><button disabled={page * 20 >= total} onClick={() => setPage(page + 1)}>Înainte</button></nav>}
  </section>;
}
