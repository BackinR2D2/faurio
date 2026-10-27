"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useState } from "react";
import { useShop } from "@/components/shop-provider";

export function Brand() {
  return <Link className="brand" href="/" aria-label="Fir de Poveste, pagina principală"><span className="brand-mark"><i /><b /></span><span><strong>FIR DE POVESTE</strong><small>HANDMADE · ROMÂNIA</small></span></Link>;
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { itemCount, favorites } = useShop();
  const home = pathname === "/";
  return <header className={`site-header ${home ? "home-header" : ""}`}>
    <Brand />
    {!home && <nav className={open ? "main-nav open" : "main-nav"} aria-label="Navigare principală">
      <Link href="/catalog" onClick={() => setOpen(false)}>Catalog</Link>
      <Link href="/despre" onClick={() => setOpen(false)}>Poveste</Link>
      <Link href="/blog" onClick={() => setOpen(false)}>Jurnal</Link>
      <Link href="/contact" onClick={() => setOpen(false)}>Contact</Link>
    </nav>}
    <div className="header-actions">
      {!home && <Link className="header-icon desktop-only" href="/catalog" aria-label="Caută"><Search /></Link>}
      {!home && <Link className="header-icon desktop-only" href="/favorite" aria-label={`Favorite, ${favorites.length}`}><Heart /><b>{favorites.length}</b></Link>}
      <Link className="header-account" href="/cont"><UserRound /><span>Cont</span></Link>
      <Link className="header-cart" href="/cos"><ShoppingBag /><span>Coș</span><b>{itemCount}</b></Link>
      {!home && <button className="menu-button" onClick={() => setOpen(!open)} aria-label={open ? "Închide meniul" : "Deschide meniul"}>{open ? <X /> : <Menu />}</button>}
    </div>
  </header>;
}

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <footer className="site-footer">
    <div className="footer-intro"><Brand /><p>Obiecte în serie mică, alese din ateliere locale. Cumpărături lente, făcute simplu.</p></div>
    <div><strong>Descoperă</strong><Link href="/catalog">Catalog</Link><Link href="/favorite">Favorite</Link><Link href="/blog">Jurnal</Link><Link href="/despre">Despre noi</Link></div>
    <div><strong>Ajutor</strong><Link href="/contact">Contact</Link><Link href="/livrare-retur">Livrare & retur</Link><Link href="/termeni">Termeni</Link><Link href="/confidentialitate">Confidențialitate</Link></div>
    <div className="footer-news"><strong>Scrisori din atelier</strong><p>Noutăți rare, obiecte frumoase și povești despre cei care le fac.</p><form onSubmit={(event) => event.preventDefault()}><input type="email" aria-label="Email newsletter" placeholder="email@exemplu.ro" /><button>Înscrie-mă</button></form></div>
    <p className="footer-bottom">© 2026 Fir de Poveste · Proiect academic B2C · Plățile pot rula în Stripe test sau sandbox demonstrativ.</p>
  </footer>;
}
