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
  return <main className="page-main seller-landing"><section className="seller-intro"><p className="eyebrow">Pentru mâini care creează</p><h1>Atelierul tău.<br /><em>În lumea largă.</em></h1><p>Un loc al tău, de la prima poveste până la ultima piesă din colecție.</p><ul><li><Check /> O pagină pe care o poți face a ta.</li><li><Check /> Produse și stocuri într-un singur loc.</li><li><Check /> Publicare după o verificare atentă.</li></ul><Link href="/studio">Ai deja un atelier? Intră în Studio →</Link></section>
    <section className="seller-application"><p className="eyebrow">Primul pas</p><h2>Fă-ne cunoștință.</h2>{loading ? <p role="status">Se verifică contul…</p> : !user ? <><p>Folosești același cont pentru a cumpăra și a crea.</p><Link className="primary-button" href="/cont?next=/sell">Intră sau creează cont <ArrowUpRight /></Link></> : <form onSubmit={submit}>
      <label>Numele atelierului<input name="name" required minLength={2} maxLength={100} placeholder="De exemplu, Studio de Lut" /></label>
      <label>Adresa atelierului<span className="slug-input"><span>/makers/</span><input name="slug" required minLength={4} maxLength={60} pattern="[a-z0-9][a-z0-9-]{2,58}[a-z0-9]" placeholder="studio-de-lut" /></span><small>Litere mici, cifre și cratime. Adresa rămâne stabilă după creare.</small></label>
      <div className="studio-form-row"><label>Oraș / regiune<input name="location" maxLength={100} placeholder="Brașov" /></label><label>Cod țară<input name="country" required defaultValue="RO" pattern="[A-Za-z]{2}" maxLength={2} /></label></div>
      <label className="studio-check"><input type="checkbox" required /><span>Accept <Link href="/sell/terms" target="_blank">condițiile pentru creatori</Link> și trimit atelierul pentru verificare.</span></label>
      <p className="form-notice">Listare gratuită. Comision de 5,5% doar pe produsele achitate, după reduceri și fără transport. Aprobarea atelierului și verificarea Stripe Connect sunt necesare înainte de încasări. Modul curent este Stripe test.</p>
      {error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? "Se trimite…" : <>Trimite atelierul <ArrowUpRight /></>}</button>
    </form>}</section>
  </main>;
}
