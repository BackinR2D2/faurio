"use client";

import { FormEvent, useCallback, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, LoaderCircle, Search, SlidersHorizontal, X } from "lucide-react";
import { categories, type CatalogFilters } from "@/lib/catalog";
import type { CatalogResult } from "@/lib/products";
import { ProductCard } from "@/components/product-card";
import { CatalogFiltersPanel } from "@/components/catalog-filters";

type Props = CatalogResult & { initialQuery: string; filters: CatalogFilters };

export function CatalogView({ products, total, page, pageCount, configured, intent, initialQuery, filters }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mobileFilters, setMobileFilters] = useState(false);
  const closeFilters = useCallback(() => setMobileFilters(false), []);
  const [displayFilters, setDisplayFilters] = useOptimistic(filters, (current, patch: Partial<CatalogFilters>) => ({ ...current, ...patch }));
  const discovery = intent?.queryMode === "discovery";
  const searchFailed = Boolean(intent?.failure);
  const priceLimit = intent?.filters.maxPrice ?? 1000;

  const href = (patch: Record<string, string | number | boolean | undefined>) => {
    const params = new URLSearchParams();
    const current: Record<string, string | number | boolean | undefined> = { q: initialQuery, categorie: displayFilters.category, material: displayFilters.material, pret: displayFilters.maxPrice, rating: displayFilters.minRating, rapid: displayFilters.ready, sort: displayFilters.sort, page };
    Object.entries(current).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== false && value !== "Toate" && (value !== 0 || key === "pret")) params.set(key, String(value));
    });
    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined || value === "" || value === false || value === "Toate" || (value === 0 && key !== "pret")) params.delete(key);
      else params.set(key, String(value));
    });
    if (!("page" in patch)) params.delete("page");
    const query = params.toString();
    return `/catalog${query ? `?${query}` : ""}`;
  };

  const navigate = (patch: Record<string, string | number | boolean | undefined>) => startTransition(() => {
    const next: Partial<CatalogFilters> = {};
    if ("categorie" in patch) next.category = String(patch.categorie || "Toate");
    if ("sort" in patch) next.sort = patch.sort as CatalogFilters["sort"];
    if ("pret" in patch) next.maxPrice = patch.pret === undefined ? undefined : Number(patch.pret);
    if ("material" in patch) next.material = patch.material as string | undefined;
    if ("rating" in patch) next.minRating = patch.rating === undefined ? undefined : Number(patch.rating);
    if ("rapid" in patch) next.ready = Boolean(patch.rapid);
    setDisplayFilters(next);
    router.push(href(patch), { scroll: false });
  });
  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    navigate({ q: String(data.get("q") || "").trim(), page: undefined });
  };
  const visiblePages = Array.from({ length: pageCount }, (_, index) => index + 1).filter((value) => value === 1 || value === pageCount || Math.abs(value - page) <= 2);

  return <main className={`page-main catalog-page${pending ? " is-loading" : ""}`}>
    <section className="catalog-head">
      <div><h1>{discovery ? "Alese pentru povestea ta" : intent ? "Potriviri precise" : "Catalog"}</h1></div>
      <form className="catalog-search" onSubmit={search}><Search /><input key={initialQuery} name="q" maxLength={1200} aria-label="Caută în catalog" defaultValue={initialQuery} placeholder="Ce cauți?" /><button disabled={pending}>Caută</button></form>
      {intent && !searchFailed && <div className="understanding"><span><strong>{discovery ? intent.explanation || "Recomandări pentru tine" : intent.summary.join(" · ") || initialQuery}</strong>{discovery && intent.summary.length > 0 && <span className="search-constraints">{intent.summary.join(" · ")}</span>}</span><Link prefetch={false} href="/catalog" aria-label="Șterge căutarea"><X /></Link></div>}
      {intent?.notice && !searchFailed && <p className="form-notice" role="status">{intent.notice}</p>}
    </section>

    <div className="category-row"><div className="category-tabs">{categories.map((item) => <button key={item} aria-pressed={(displayFilters.category || "Toate") === item} className={(displayFilters.category || "Toate") === item ? "active" : ""} onClick={() => navigate({ categorie: item })}>{item}</button>)}</div><button className="mobile-filter" aria-haspopup="dialog" aria-expanded={mobileFilters} onClick={() => setMobileFilters(true)}><SlidersHorizontal /> Filtre</button></div>
    <section className="catalog-body">
      <CatalogFiltersPanel key={JSON.stringify([initialQuery, filters.maxPrice, filters.material, filters.minRating, filters.ready])} filters={filters} priceLimit={Math.max(1, priceLimit)} queryBudget={intent?.filters.maxPrice} open={mobileFilters} pending={pending} resetHref={initialQuery ? `/catalog?q=${encodeURIComponent(initialQuery)}` : "/catalog"} onClose={closeFilters} onApply={draft => navigate({ pret: draft.maxPrice, material: draft.material, rating: draft.minRating, rapid: draft.ready })} />
      <div className="catalog-results" aria-busy={pending}>
        <div className="result-toolbar"><span aria-live="polite" aria-atomic="true">{pending ? <><LoaderCircle className="search-spinner" size={14} /> Se actualizează…</> : `${total} ${total === 1 ? "produs" : "produse"}`}</span><label>Ordonează <select value={displayFilters.sort || "relevanta"} onChange={(event) => navigate({ sort: event.target.value })}><option value="relevanta">Relevanță</option><option value="pret-mic">Preț crescător</option><option value="pret-mare">Preț descrescător</option><option value="rating">Rating</option><option value="nou">Cele mai noi</option></select></label></div>
        {searchFailed ? <div className="empty-state" role="alert"><Search /><h2>Nu am putut finaliza căutarea</h2><p>{intent?.notice}</p><button className="primary-button" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "Se reîncearcă…" : "Reîncearcă"}</button><Link className="reset-link" href="/catalog">Explorează catalogul</Link></div> : !configured ? <div className="empty-state"><Search /><h2>Catalog indisponibil momentan</h2><p>Te rugăm să încerci din nou în câteva momente.</p></div> : products.length ? <><div className="product-grid">{products.map((product, index) => {
          const reason = intent?.recommendations?.find(item => item.productType === product.productType)?.reason;
          return <ProductCard key={product.id} product={product} reasons={reason ? [reason] : undefined} priority={index < 3} />;
        })}</div>{pageCount > 1 && <nav className="catalog-pagination" aria-label="Pagini catalog"><Link prefetch={false} className={page <= 1 ? "disabled" : ""} href={href({ page: Math.max(1, page - 1) })} aria-label="Pagina anterioară"><ChevronLeft /></Link>{visiblePages.map((value, index) => <span key={value}>{index > 0 && value - visiblePages[index - 1] > 1 && <i>…</i>}<Link prefetch={false} className={value === page ? "active" : ""} href={href({ page: value })}>{value}</Link></span>)}<Link prefetch={false} className={page >= pageCount ? "disabled" : ""} href={href({ page: Math.min(pageCount, page + 1) })} aria-label="Pagina următoare"><ChevronRight /></Link></nav>}</> : <div className="empty-state"><Search /><h2>{discovery ? "Nicio recomandare potrivită" : "Nicio potrivire exactă"}</h2><p>Nu avem acum un produs care să respecte cererea. Reformulează căutarea sau elimină un filtru.</p><Link className="primary-button" href="/catalog">Vezi întregul catalog</Link></div>}
      </div>
    </section>
  </main>;
}
