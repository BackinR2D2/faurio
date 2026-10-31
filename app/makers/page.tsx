import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getPublicShops } from "@/lib/marketplace/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ateliere independente", description: "Descoperă atelierele și poveștile creatorilor de pe Faurio.", alternates: { canonical: "/makers" } };

export default async function MakersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.min(10000, Math.max(1, Math.trunc(Number((await searchParams).page) || 1)));
  const { shops, total, configured } = await getPublicShops(page);
  return <main className="page-main makers-directory"><header><p className="eyebrow">Oameni care fac</p><h1>Intră în atelier.</h1><p>Descoperă o perspectivă, un material, un fel de a crea.</p></header>
    {shops.length ? <div className="maker-directory-grid">{shops.map((shop) => <Link href={`/makers/${shop.slug}`} className={`maker-directory-card theme-${shop.layout.theme}`} key={shop.id}><div><Image src={shop.layout.cover} alt={`Coperta atelierului ${shop.name}`} fill sizes="(max-width: 700px) 100vw, 33vw" /></div><span>{shop.location || shop.country}</span><h2>{shop.name}<ArrowUpRight /></h2><p>{shop.layout.subtitle}</p></Link>)}</div> : <div className="maker-empty"><p>{configured ? "Nu există alte ateliere publicate pe această pagină." : "Pregătim spațiul pentru ateliere independente."}</p><Link href="/sell" className="primary-button">Deschide-ți atelierul</Link></div>}
    {(page > 1 || page * 24 < total) && <nav className="maker-page-links" aria-label="Pagini ateliere">{page > 1 && <Link href={`/makers?page=${page - 1}`}>← Înapoi</Link>}<span>Pagina {page}</span>{page * 24 < total && <Link href={`/makers?page=${page + 1}`}>Mai multe →</Link>}</nav>}
    <aside className="maker-invitation"><div><p className="eyebrow">Loc pentru povestea ta</p><h2>Tu ce creezi?</h2></div><Link className="primary-button" href="/sell">Deschide-ți atelierul <ArrowUpRight /></Link></aside>
  </main>;
}
