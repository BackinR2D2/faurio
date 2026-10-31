"use client";
import Link from "next/link";
import { ArrowUpRight, Check, Circle, Palette, Package, ShieldCheck } from "lucide-react";
import { useStudio } from "@/components/studio-shell";
import { stateLabels } from "@/lib/marketplace/contracts";

export function StudioOverview() {
  const { shop } = useStudio();
  return <section className="studio-overview"><header className="studio-heading"><p className="eyebrow">Spațiul tău de lucru</p><h1>Bun venit în<br /><em>{shop.name}.</em></h1><p>O poveste atent spusă. O colecție atent făcută.</p></header><div className="studio-overview-grid">
    <article className="studio-action-card"><ShieldCheck /><p className="eyebrow">01 · Verificare</p><h2>{stateLabels[shop.status]}</h2><p>{shop.status === "active" ? "Atelierul este aprobat. Poți publica pagina și trimite produsele la verificare." : shop.status === "pending_review" ? "Cererea ta a ajuns la noi. Între timp, poți pregăti pagina și produsele." : "Contactează echipa pentru detalii despre starea atelierului."}</p><span className="studio-step-state">{shop.status === "active" ? <Check size={16} /> : <Circle size={16} />} {stateLabels[shop.status]}</span></article>
    <article className="studio-action-card"><Palette /><p className="eyebrow">02 · Identitate</p><h2>Fă-l al tău.</h2><p>Alege atmosfera, scrie povestea, aranjează secțiunile. Publici când ești pregătit.</p><Link href={`/studio/appearance?shop=${shop.id}`}>Deschide editorul <ArrowUpRight size={16} /></Link></article>
    <article className="studio-action-card"><Package /><p className="eyebrow">03 · Colecție</p><h2>Din mâinile tale.</h2><p>Adaugă piesele, materialele, prețul și timpul de pregătire. Fiecare listare trece prin moderare.</p><Link href={`/studio/products?shop=${shop.id}`}>Gestionează produsele <ArrowUpRight size={16} /></Link></article>
  </div><aside className="studio-finance-notice"><h2>Un comision clar: 5,5%.</h2><p>Fără taxă de listare sau abonament. Configurează Stripe Connect pentru încasări și urmărește comenzile în Studio. Modul curent folosește plăți de test.</p><Link href={`/studio/payments?shop=${shop.id}`}>Configurează încasările →</Link></aside></section>;
}
