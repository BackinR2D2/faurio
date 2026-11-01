"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { useStudio } from "@/components/studio-shell";
import { studioRequest } from "@/lib/marketplace/client";

type PaymentStatus = { connected: boolean; enabled: boolean; ready: boolean; testMode: boolean };
export function StudioPayments() {
  const { shop, token } = useStudio();
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setError("");
    try { setStatus(await studioRequest<PaymentStatus>(`/api/studio/payments?shop=${shop.id}`, token)); }
    catch (caught) { setError((caught as Error).message); }
  }, [shop.id, token]);
  useEffect(() => {
    const controller = new AbortController();
    studioRequest<PaymentStatus>(`/api/studio/payments?shop=${shop.id}`, token, { signal: controller.signal }).then(setStatus)
      .catch((caught) => { if (!controller.signal.aborted) setError((caught as Error).message); });
    return () => controller.abort();
  }, [shop.id, token]);
  async function open(action: "onboard" | "dashboard") {
    setBusy(true); setError("");
    try {
      const result = await studioRequest<{ url: string }>("/api/studio/payments", token, { method: "POST", body: JSON.stringify({ shopId: shop.id, action, acceptFeePolicy: accepted }) });
      const url = new URL(result.url);
      if (url.protocol !== "https:" || !["connect.stripe.com", "dashboard.stripe.com"].includes(url.hostname)) throw new Error("Stripe nu a returnat o adresă validă.");
      window.location.assign(url.href);
    } catch (caught) { setError((caught as Error).message); setBusy(false); }
  }
  return <section><header className="studio-heading"><h1>Încasări</h1><p>Stripe gestionează verificarea identității și datele bancare.</p></header>
    <div className="studio-finance-notice"><ShieldCheck /><h2>{status?.ready ? "Stripe a activat încasările de test." : "Configurează contul de încasări."}</h2><p>Mod demonstrativ: se folosesc bani și date Stripe de test. Nu sunt efectuate plăți bancare reale.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!status && !error && <p role="status">Se verifică starea Stripe…</p>}
      {status && !status.enabled && <p className="form-notice">Administratorul trebuie să activeze Stripe Connect și migrarea financiară. Nu introducem date bancare în Faurio.</p>}
      {shop.status !== "active" && <p>Configurarea este disponibilă după aprobarea atelierului.</p>}
      {shop.role === "owner" && status?.enabled && shop.status === "active" && <><label className="studio-check"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>Accept <Link href="/termeni#comisioane" target="_blank">condițiile pentru creatori și plăți</Link>.</span></label><div className="studio-form-actions"><button className="primary-button" disabled={busy || !accepted} onClick={() => open("onboard")}>{busy ? "Se deschide…" : status.connected ? "Continuă configurarea Stripe" : "Conectează Stripe"}<ArrowUpRight size={18} /></button>{status.connected && <button className="studio-secondary" disabled={busy} onClick={() => open("dashboard")}>Panoul Stripe <ArrowUpRight size={18} /></button>}</div></>}
      <button className="studio-text-button" disabled={busy} onClick={refresh}>Verifică din nou starea</button>
    </div>
  </section>;
}
