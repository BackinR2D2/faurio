"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { sellerTermsVersion } from "@/lib/marketplace/contracts";
import { studioRequest } from "@/lib/marketplace/client";

export function SellerApplication() {
  const { user, accessToken, loading } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const result = await studioRequest<{ shopId: string }>("/api/shops", accessToken, { method: "POST", body: JSON.stringify({ name: form.get("name"), slug: form.get("slug"), country: String(form.get("country") || "RO").toUpperCase(), location: form.get("location"), termsVersion: sellerTermsVersion }) });
      router.push(`/studio?shop=${result.shopId}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Cererea nu a putut fi trimisă."); }
    finally { setBusy(false); }
  }
  return <main className="page-main seller-landing"><section className="seller-intro"><h1>Atelierul tău, <em>online.</em></h1><p>Publică produsele și gestionează comenzile dintr-un singur loc.</p><ul><li><Check /> Pagină de atelier personalizabilă</li><li><Check /> Produse, stocuri și comenzi</li><li><Check /> Verificare înainte de publicare</li></ul><Link href="/studio">Ai deja un atelier? Intră în Studio →</Link></section>
    <section className="seller-application"><h2>Creează atelierul</h2>{loading ? <p role="status">Se verifică contul…</p> : !user ? <><p>Continuă cu contul tău Faurio.</p><Link className="primary-button" href="/cont?next=/sell">Intră sau creează cont <ArrowUpRight /></Link></> : <form onSubmit={submit}>
      <label>Numele atelierului<input name="name" required minLength={2} maxLength={100} placeholder="De exemplu, Studio de Lut" /></label>
      <label>Adresa atelierului<span className="slug-input"><span>/makers/</span><input name="slug" required minLength={4} maxLength={60} pattern="[a-z0-9][a-z0-9-]{2,58}[a-z0-9]" placeholder="studio-de-lut" /></span><small>Litere mici, cifre și cratime. Adresa rămâne stabilă după creare.</small></label>
      <div className="studio-form-row"><label>Oraș / regiune<input name="location" maxLength={100} placeholder="Brașov" /></label><label>Cod țară<input name="country" required defaultValue="RO" pattern="[A-Za-z]{2}" maxLength={2} /></label></div>
      <label className="studio-check"><input type="checkbox" required /><span>Accept <Link href="/sell/terms" target="_blank">condițiile pentru creatori</Link> și trimit atelierul pentru verificare.</span></label>
      <p className="seller-review-note">După aprobare, conectează Stripe pentru a primi comenzi.</p>
      {error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? "Se trimite…" : <>Trimite atelierul <ArrowUpRight /></>}</button>
    </form>}</section>
  </main>;
}
