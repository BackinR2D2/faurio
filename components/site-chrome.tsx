"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useState } from "react";
import { useShop } from "@/components/shop-provider";
import { useAuth } from "@/components/auth-provider";
import { BrandMark } from "@/components/brand-mark";
import { brand } from "@/lib/brand";

export function Brand() {
  return (
    <Link
      className="brand"
      href="/"
      aria-label={`${brand.name}, pagina principală`}
    >
      <BrandMark />
      <span>
        <strong>{brand.wordmark}</strong>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { itemCount, favorites } = useShop();
  const { user } = useAuth();
  const home = pathname === "/";
  return (
    <header className={`site-header ${home ? "home-header" : ""}`}>
      <Brand />
      {
        <nav
          className={open ? "main-nav open" : "main-nav"}
          aria-label="Navigare principală"
        >
          <Link href="/catalog" onClick={() => setOpen(false)}>
            Catalog
          </Link>
          <Link href="/makers" onClick={() => setOpen(false)}>
            Ateliere
          </Link>
          <Link href="/blog" onClick={() => setOpen(false)}>
            Jurnal
          </Link>
          <Link href="/sell" onClick={() => setOpen(false)}>
            Vinde cu noi
          </Link>
        </nav>
      }
      <div className="header-actions">
        {!home && (
          <Link
            className="header-icon desktop-only"
            href="/catalog"
            aria-label="Caută"
          >
            <Search />
          </Link>
        )}
        {!home && (
          <Link
            className="header-icon desktop-only"
            href="/favorite"
            aria-label={`Favorite, ${favorites.length}`}
          >
            <Heart />
            <b>{favorites.length}</b>
          </Link>
        )}
        <Link
          className="header-account"
          aria-label="Contul meu"
          href={user ? "/cont/profil" : "/cont"}
        >
          <UserRound />
          <span>{user ? user.name.split(" ")[0] : "Cont"}</span>
        </Link>
        <Link className="header-cart" href="/cos">
          <ShoppingBag />
          <span>Coș</span>
          <b>{itemCount}</b>
        </Link>
        {
          <button
            className="menu-button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? "Închide meniul" : "Deschide meniul"}
          >
            {open ? <X /> : <Menu />}
          </button>
        }
      </div>
    </header>
  );
}

export function SiteFooter() {
  const pathname = usePathname();
  const [subscribed, setSubscribed] = useState(false);
  const [newsletterError, setNewsletterError] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  async function subscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNewsletterError("");
    const element = event.currentTarget;
    const form = new FormData(element);
    const email = String(form.get("email") || "");
    setSubscribing(true);
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json()) as {
        error?: string;
        persisted?: boolean;
      };
      if (!response.ok || !result.persisted)
        throw new Error(result.error || "Înscrierea nu a putut fi salvată.");
      setSubscribed(true);
      element.reset();
    } catch (caught) {
      setNewsletterError(
        caught instanceof Error
          ? caught.message
          : "Conexiune indisponibilă. Încearcă din nou."
      );
    } finally {
      setSubscribing(false);
    }
  }
  if (pathname === "/") return null;
  return (
    <footer className="site-footer">
      <div className="footer-intro">
        <Brand />
        <p>Obiecte în serie mică, din ateliere locale.</p>
      </div>
      <div>
        <strong>Descoperă</strong>
        <Link href="/catalog">Catalog</Link>
        <Link href="/makers">Ateliere</Link>
        <Link href="/studio">Studio pentru creatori</Link>
        <Link href="/favorite">Favorite</Link>
        <Link href="/blog">Jurnal</Link>
        <Link href="/despre">Despre noi</Link>
      </div>
      <div>
        <strong>Ajutor</strong>
        <Link href="/contact">Contact</Link>
        <Link href="/livrare-retur">Livrare & retur</Link>
        <Link href="/termeni">Termeni</Link>
        <Link href="/confidentialitate">Confidențialitate</Link>
      </div>
      <div className="footer-news">
        <strong>Scrisori din atelier</strong>
        {subscribed ? (
          <p>Te-ai înscris. Mulțumim.</p>
        ) : (
          <form onSubmit={subscribe}>
            <input
              required
              name="email"
              type="email"
              aria-label="Email newsletter"
              placeholder="email@exemplu.ro"
            />
            <button disabled={subscribing}>
              {subscribing ? "Se salvează…" : "Înscrie-mă"}
            </button>
          </form>
        )}
        {newsletterError && <small>{newsletterError}</small>}
      </div>
      <p className="footer-bottom">
        © {new Date().getFullYear()} {brand.name}
      </p>
    </footer>
  );
}
