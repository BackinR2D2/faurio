"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { categories, materials, money, type CatalogFilters } from "@/lib/catalog";
import type { CatalogResult } from "@/lib/products";
import { ProductCard } from "@/components/product-card";

type Props = CatalogResult & { initialQuery: string; filters: CatalogFilters };

export function CatalogView({ products, total, page, pageCount, configured, intent, initialQuery, filters }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mobileFilters, setMobileFilters] = useState(false);
  const discovery = intent?.queryMode === "discovery";
  const searchFailed = Boolean(intent?.failure);
  const priceLimit = intent?.filters.maxPrice ?? 400;
  const selectedPrice = Math.min(filters.maxPrice ?? priceLimit, priceLimit);

  const href = (patch: Record<string, string | number | boolean | undefined>) => {
    const params = new URLSearchParams();
    const current: Record<string, string | number | boolean | undefined> = { q: initialQuery, categorie: filters.category, material: filters.material, pret: filters.maxPrice, rating: filters.minRating, rapid: filters.ready, sort: filters.sort, page };
    Object.entries(current).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== false && value !== "Toate" && value !== 0) params.set(key, String(value));
    });
    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined || value === "" || value === false || value === "Toate" || value === 0) params.delete(key);
      else params.set(key, String(value));
    });
    if (!("page" in patch)) params.delete("page");
    const query = params.toString();
    return `/catalog${query ? `?${query}` : ""}`;
  };

  const navigate = (patch: Record<string, string | number | boolean | undefined>) => startTransition(() => router.push(href(patch)));
  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    navigate({ q: String(data.get("q") || "").trim(), page: undefined });
  };
  const visiblePages = Array.from({ length: pageCount }, (_, index) => index + 1).filter((value) => value === 1 || value === pageCount || Math.abs(value - page) <= 2);

  return <main className={`page-main catalog-page${pending ? " is-loading" : ""}`}>
    <section className="catalog-head">
      <div><p className="eyebrow">Catalog</p><h1>{discovery ? "Alese pentru povestea ta" : intent ? "Potriviri precise" : "Obiecte cu rost"}</h1><p>{discovery ? "Idei cu sens, din atelierele noastre." : intent ? "Produse care respectă cererea ta." : "Serii mici, făcute local."}</p></div>
      <form className="catalog-search" onSubmit={search}><Search /><input name="q" maxLength={1200} aria-label="Caută în catalog" defaultValue={initialQuery} placeholder="Ce cauți? Poți scrie o propoziție." /><button>Caută</button></form>
      {intent && !searchFailed && <div className="understanding"><Sparkles /><span><strong>{discovery ? intent.explanation || "Idei pentru povestea ta" : intent.summary.join(" · ") || initialQuery}</strong>{discovery && intent.summary.length > 0 && <span className="search-constraints">{intent.summary.join(" · ")}</span>}</span><Link href="/catalog" aria-label="Șterge căutarea"><X /></Link></div>}
      {intent?.notice && !searchFailed && <p className="form-notice" role="status">{intent.notice}</p>}
    </section>

    <div className="category-row">{categories.map((item) => <button key={item} className={(filters.category || "Toate") === item ? "active" : ""} onClick={() => navigate({ categorie: item })}>{item}</button>)}<button className="mobile-filter" onClick={() => setMobileFilters(true)}><SlidersHorizontal /> Filtre</button></div>
    <section className="catalog-body">
      <aside className={`filter-panel${mobileFilters ? " open" : ""}`}>
        <div className="filter-heading"><strong>Filtre precise</strong><button onClick={() => setMobileFilters(false)} aria-label="Închide filtrele"><X /></button></div>
        <label className="range-filter"><span>Preț maxim <b>{money.format(selectedPrice)}</b></span><input type="range" min="0" max={Math.max(1, priceLimit)} step="1" value={selectedPrice} onChange={(event) => navigate({ pret: Number(event.target.value) === priceLimit ? undefined : event.target.value })} /></label>
        <fieldset><legend>Material</legend>{materials.map((item) => <label key={item}><input type="radio" name="material" checked={(filters.material || "Toate") === item} onChange={() => navigate({ material: item })} /><span>{item}</span></label>)}</fieldset>
        <fieldset><legend>Rating minim</legend>{[0, 4.5, 4.7, 4.9].map((value) => <label key={value}><input type="radio" name="rating" checked={(filters.minRating || 0) === value} onChange={() => navigate({ rating: value })} /><span>{value ? `${value}+ stele` : "Orice rating"}</span></label>)}</fieldset>
        <label className="check-filter"><input type="checkbox" checked={Boolean(filters.ready)} onChange={(event) => navigate({ rapid: event.target.checked })} /><i>{filters.ready && <Check />}</i><span><strong>Livrare rapidă</strong><small>expediere în maximum 2 zile</small></span></label>
        <Link className="reset-link" href={initialQuery ? `/catalog?q=${encodeURIComponent(initialQuery)}` : "/catalog"}>Resetează filtrele</Link>
      </aside>
      <div className="catalog-results">
        <div className="result-toolbar"><span>{total} {total === 1 ? "produs" : "produse"}</span><label>Ordonează <select value={filters.sort || "relevanta"} onChange={(event) => navigate({ sort: event.target.value })}><option value="relevanta">Relevanță</option><option value="pret-mic">Preț crescător</option><option value="pret-mare">Preț descrescător</option><option value="rating">Rating</option><option value="nou">Cele mai noi</option></select></label></div>
        {searchFailed ? <div className="empty-state" role="alert"><Search /><h2>Nu am putut finaliza căutarea</h2><p>{intent?.notice}</p><button className="primary-button" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "Se reîncearcă…" : "Reîncearcă"}</button><Link className="reset-link" href="/catalog">Explorează catalogul</Link></div> : !configured ? <div className="empty-state"><Search /><h2>Conectează baza de date</h2><p>Configurează variabilele Supabase și rulează schema plus seed-ul pentru a încărca cele 720 de produse.</p></div> : products.length ? <><div className="product-grid">{products.map((product, index) => {
          const reason = intent?.recommendations?.find(item => item.productType === product.productType)?.reason;
          return <ProductCard key={product.id} product={product} reasons={reason ? [reason] : undefined} priority={index < 3} />;
        })}</div>{pageCount > 1 && <nav className="catalog-pagination" aria-label="Pagini catalog"><Link className={page <= 1 ? "disabled" : ""} href={href({ page: Math.max(1, page - 1) })} aria-label="Pagina anterioară"><ChevronLeft /></Link>{visiblePages.map((value, index) => <span key={value}>{index > 0 && value - visiblePages[index - 1] > 1 && <i>…</i>}<Link className={value === page ? "active" : ""} href={href({ page: value })}>{value}</Link></span>)}<Link className={page >= pageCount ? "disabled" : ""} href={href({ page: Math.min(pageCount, page + 1) })} aria-label="Pagina următoare"><ChevronRight /></Link></nav>}</> : <div className="empty-state"><Search /><h2>{discovery ? "Nicio recomandare potrivită" : "Nicio potrivire exactă"}</h2><p>Nu avem acum un produs care să respecte cererea. Reformulează căutarea sau elimină un filtru.</p><Link className="primary-button" href="/catalog">Vezi întregul catalog</Link></div>}
      </div>
    </section>
  </main>;
}
