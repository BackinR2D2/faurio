"use client";

import { FormEvent, useCallback, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, LoaderCircle, Search, SlidersHorizontal, X } from "lucide-react";
import { type CatalogFilters } from "@/lib/catalog";
import { catalogHref, changedCatalogFilters, type CatalogFilterOptions } from "@/lib/catalog-filters";
import type { CatalogResult } from "@/lib/products";
import { ProductCard } from "@/components/product-card";
import { CatalogFiltersPanel } from "@/components/catalog-filters";

type Props = CatalogResult & { initialQuery: string; filters: CatalogFilters; manualFilters: CatalogFilters; options: CatalogFilterOptions };

export function CatalogView({ products, total, page, pageCount, configured, intent, initialQuery, filters, manualFilters, options }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mobileFilters, setMobileFilters] = useState(false);
  const closeFilters = useCallback(() => setMobileFilters(false), []);
  const [displayFilters, setDisplayFilters] = useOptimistic(filters, (current, patch: Partial<CatalogFilters>) => ({ ...current, ...patch }));
  const discovery = intent?.queryMode === "discovery";
  const searchFailed = Boolean(intent?.failure);
  const priceLimit = intent?.filters.maxPrice ?? Math.max(1000, filters.maxPrice || 0, filters.minPrice || 0);

  const href = ({ page }: { page: number }) => catalogHref(initialQuery, manualFilters, page);
  const navigate = (patch: Partial<CatalogFilters>) => startTransition(() => {
    setDisplayFilters(patch);
    router.push(catalogHref(initialQuery, { ...manualFilters, ...patch }), { scroll: false });
  });
  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => router.push(catalogHref(String(data.get("q") || "").trim(), { sort: manualFilters.sort }), { scroll: false }));
  };
  const visiblePages = Array.from({ length: pageCount }, (_, index) => index + 1).filter((value) => value === 1 || value === pageCount || Math.abs(value - page) <= 2);

  return <main className={`page-main catalog-page${pending ? " is-loading" : ""}`}>
    <section className="catalog-head">
      <div><h1>{discovery ? "Alese pentru povestea ta" : intent ? "Potriviri precise" : "Catalog"}</h1></div>
      <form className="catalog-search" onSubmit={search}><Search /><input key={initialQuery} name="q" maxLength={1200} aria-label="Caută în catalog" defaultValue={initialQuery} placeholder="Ce cauți?" /><button disabled={pending}>Caută</button></form>
      {intent && !searchFailed && <div className="understanding"><span><strong>{discovery ? intent.explanation || "Recomandări pentru tine" : intent.summary.join(" · ") || initialQuery}</strong>{discovery && intent.summary.length > 0 && <span className="search-constraints">{intent.summary.join(" · ")}</span>}</span><Link prefetch={false} href="/catalog" aria-label="Șterge căutarea"><X /></Link></div>}
      {intent?.notice && !searchFailed && <p className="form-notice" role="status">{intent.notice}</p>}
    </section>

    <div className="category-row"><div className="category-tabs">{["Toate", ...options.categories].map((item) => {
      const selected = item === "Toate" ? !displayFilters.categories?.length : Boolean(displayFilters.categories?.includes(item));
      return <button key={item} disabled={pending} aria-pressed={selected} className={selected ? "active" : ""} onClick={() => navigate({ categories: item === "Toate" ? [] : selected ? displayFilters.categories?.filter(value => value !== item) : [...(displayFilters.categories || []), item] })}>{item}</button>;
    })}</div><button className="mobile-filter" aria-haspopup="dialog" aria-expanded={mobileFilters} onClick={() => setMobileFilters(true)}><SlidersHorizontal /> Filtre</button></div>
    <section className="catalog-body">
      <CatalogFiltersPanel key={JSON.stringify([initialQuery, filters])} filters={filters} options={options} priceLimit={Math.max(1, priceLimit)} queryBudget={intent?.filters.maxPrice} queryMinimum={intent?.filters.minPrice} open={mobileFilters} pending={pending} resetHref={catalogHref(initialQuery, {})} onClose={closeFilters} onApply={draft => navigate(changedCatalogFilters(filters, draft))} />
      <div className="catalog-results" aria-busy={pending}>
        <div className="result-toolbar"><span aria-live="polite" aria-atomic="true">{pending ? <><LoaderCircle className="search-spinner" size={14} /> Se actualizează…</> : `${total} ${total === 1 ? "produs" : "produse"}`}</span><label>Ordonează <select value={displayFilters.sort || "relevanta"} disabled={pending} onChange={(event) => navigate({ sort: event.target.value as CatalogFilters["sort"] })}><option value="relevanta">Relevanță</option><option value="pret-mic">Preț crescător</option><option value="pret-mare">Preț descrescător</option><option value="rating">Rating</option><option value="nou">Cele mai noi</option></select></label></div>
        {searchFailed ? <div className="empty-state" role="alert"><Search /><h2>Nu am putut finaliza căutarea</h2><p>{intent?.notice}</p><button className="primary-button" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "Se reîncearcă…" : "Reîncearcă"}</button><Link className="reset-link" href="/catalog">Explorează catalogul</Link></div> : !configured ? <div className="empty-state"><Search /><h2>Catalog indisponibil momentan</h2><p>Te rugăm să încerci din nou în câteva momente.</p></div> : products.length ? <><div className="product-grid">{products.map((product, index) => {
          const reason = intent?.recommendations?.find(item => item.productType === product.productType)?.reason;
          return <ProductCard key={product.id} product={product} reasons={reason ? [reason] : undefined} priority={index < 3} />;
        })}</div>{pageCount > 1 && <nav className="catalog-pagination" aria-label="Pagini catalog"><Link prefetch={false} className={page <= 1 ? "disabled" : ""} href={href({ page: Math.max(1, page - 1) })} aria-label="Pagina anterioară"><ChevronLeft /></Link>{visiblePages.map((value, index) => <span key={value}>{index > 0 && value - visiblePages[index - 1] > 1 && <i>…</i>}<Link prefetch={false} className={value === page ? "active" : ""} href={href({ page: value })}>{value}</Link></span>)}<Link prefetch={false} className={page >= pageCount ? "disabled" : ""} href={href({ page: Math.min(pageCount, page + 1) })} aria-label="Pagina următoare"><ChevronRight /></Link></nav>}</> : <div className="empty-state"><Search /><h2>{discovery ? "Nicio recomandare potrivită" : "Nicio potrivire exactă"}</h2><p>Nu avem acum un produs care să respecte cererea. Reformulează căutarea sau elimină un filtru.</p><Link className="primary-button" href="/catalog">Vezi întregul catalog</Link></div>}
      </div>
    </section>
  </main>;
}
