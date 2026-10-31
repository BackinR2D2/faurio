"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { studioRequest } from "@/lib/marketplace/client";

type FinanceRow = { order_code: string; product_subtotal_minor: number; shipping_minor: number; fee_minor: number; seller_transfer_minor: number; refunded_minor: number; fee_refunded_minor: number; test_mode: boolean };
const money = (minor: number) => new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(minor / 100);
export function MarketplaceFinance() {
  const { accessToken, loading } = useAuth();
  const [rows, setRows] = useState<FinanceRow[]>([]); const [page, setPage] = useState(1); const [total, setTotal] = useState(0);
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    if (!accessToken) return;
    try { const result = await studioRequest<{ records: FinanceRow[]; total: number }>(`/api/admin/finance?page=${page}`, accessToken); setRows(result.records); setTotal(result.total); }
    catch (caught) { setError((caught as Error).message); }
  }, [accessToken, page]);
  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    studioRequest<{ records: FinanceRow[]; total: number }>(`/api/admin/finance?page=${page}`, accessToken, { signal: controller.signal }).then((result) => { setRows(result.records); setTotal(result.total); })
      .catch((caught) => { if (!controller.signal.aborted) setError((caught as Error).message); });
    return () => controller.abort();
  }, [accessToken, page]);
  if (loading) return <main className="page-main" role="status">Se verifică accesul…</main>;
  if (!accessToken) return <main className="page-main"><h1>Acces operator.</h1><Link href="/cont?next=/admin/finance">Autentifică-te</Link></main>;
  return <main className="page-main"><header className="studio-heading"><p className="eyebrow">Operator · financiar</p><h1>Comisioane & retururi.</h1><p>Comisionul nu este profit. În modul Stripe test, niciuna dintre sume nu reprezintă venit real.</p><Link href="/admin/marketplace">Moderare ateliere →</Link></header>{error && <p role="alert" className="form-error">{error}</p>}{notice && <p role="status" className="form-success">{notice}</p>}
    <button className="studio-secondary" onClick={refresh}>Actualizează situația</button><div className="seller-orders">{rows.map((row) => <article className="seller-order" key={row.order_code}><h2>{row.order_code}</h2><small>{row.test_mode ? "STRIPE TEST" : "LIVE"}</small><dl><div><dt>Produse</dt><dd>{money(row.product_subtotal_minor)}</dd></div><div><dt>Comision inițial</dt><dd>{money(row.fee_minor)}</dd></div><div><dt>Comision după rambursări</dt><dd>{money(row.fee_minor - row.fee_refunded_minor)}</dd></div><div><dt>Rambursat clientului</dt><dd>{money(row.refunded_minor)}</dd></div></dl>{row.test_mode && row.refunded_minor < row.product_subtotal_minor + row.shipping_minor && <form onSubmit={async (event) => {
      event.preventDefault(); const form = new FormData(event.currentTarget); if (!form.get("confirm")) return;
      setBusy(true); setError(""); setNotice("");
      try { const result = await studioRequest<{ status: string }>("/api/admin/refunds", accessToken, { method: "POST", body: JSON.stringify({ code: row.order_code, amountMinor: Math.round(Number(form.get("amount")) * 100) }) }); setNotice(`Cerere Stripe: ${result.status}. Situația se actualizează după confirmarea webhook-ului.`); }
      catch (caught) { setError((caught as Error).message); } finally { setBusy(false); }
    }}><label>Suma de rambursat (RON)<input name="amount" type="number" required min={0.01} step={0.01} max={(row.product_subtotal_minor + row.shipping_minor - row.refunded_minor) / 100} /></label><label className="studio-check"><input name="confirm" type="checkbox" required />Confirm cererea de rambursare și inversarea transferului Stripe de test.</label><button className="studio-secondary" disabled={busy}>Solicită rambursarea în Stripe</button></form>}</article>)}</div>{total > 20 && <nav className="maker-page-links" aria-label="Pagini financiare"><button disabled={page === 1} onClick={() => setPage(page - 1)}>Înapoi</button><span>{page} / {Math.ceil(total / 20)}</span><button disabled={page * 20 >= total} onClick={() => setPage(page + 1)}>Înainte</button></nav>}
  </main>;
}
