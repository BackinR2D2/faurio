"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { categories, interpretNaturalQuery, money, products } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";

export function CatalogView({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const semantic = useMemo(() => initialQuery ? interpretNaturalQuery(initialQuery) : null, [initialQuery]);
  const [draft, setDraft] = useState(initialQuery);
  const [category, setCategory] = useState(semantic?.filters.category || "Toate");
  const [maxPrice, setMaxPrice] = useState(Math.min(250, semantic?.filters.maxPrice || 250));
  const [material, setMaterial] = useState("Toate");
  const [ready, setReady] = useState(Boolean(semantic?.filters.ready));
  const [rating, setRating] = useState(0);
  const [sort, setSort] = useState("relevanta");
  const [mobileFilters, setMobileFilters] = useState(false);

  const result = useMemo(() => {
    const rank = semantic?.ids || products.map((product) => product.id);
    return products.filter((product) => rank.includes(product.id))
      .filter((product) => category === "Toate" || product.category === category)
      .filter((product) => product.price <= maxPrice)
      .filter((product) => material === "Toate" || product.material.includes(material))
      .filter((product) => !ready || product.days <= 2)
      .filter((product) => product.rating >= rating)
      .sort((a, b) => sort === "pret-mic" ? a.price - b.price : sort === "pret-mare" ? b.price - a.price : sort === "rating" ? b.rating - a.rating : rank.indexOf(a.id) - rank.indexOf(b.id));
  }, [category, material, maxPrice, rating, ready, semantic, sort]);

  const search = (event: FormEvent) => { event.preventDefault(); if (draft.trim()) router.push(`/catalog?q=${encodeURIComponent(draft.trim())}`); };
  const reset = () => { setCategory("Toate"); setMaxPrice(250); setMaterial("Toate"); setReady(false); setRating(0); router.push("/catalog"); };

  return <main className="page-main catalog-page">
    <section className="catalog-head">
      <div><p className="eyebrow">Catalog curatorial</p><h1>{semantic ? "Am găsit câteva potriviri" : "Obiecte cu rost"}</h1><p>{semantic ? "Am citit întreaga descriere și am ordonat produsele după intenție, buget, stil și timp de livrare." : "Piese lucrate încet, în loturi mici, de ateliere din România."}</p></div>
      <form className="catalog-search" onSubmit={search}><Search /><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Descrie din nou ce cauți..." /><button>Caută</button></form>
      {semantic && <div className="understanding"><Sparkles /><span><small>Am înțeles</small><strong>{semantic.summary.length ? semantic.summary.join(" · ") : "un obiect handmade cu personalitate"}</strong></span><button onClick={reset} aria-label="Șterge căutarea"><X /></button></div>}
    </section>

    <div className="category-row">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}<button className="mobile-filter" onClick={() => setMobileFilters(true)}><SlidersHorizontal /> Filtre</button></div>
    <section className="catalog-body">
      <aside className={`filter-panel ${mobileFilters ? "open" : ""}`}>
        <div className="filter-heading"><strong>Filtre precise</strong><button onClick={() => setMobileFilters(false)}><X /></button></div>
        <label className="range-filter"><span>Preț maxim <b>{money.format(maxPrice)}</b></span><input type="range" min="70" max="250" step="10" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} /></label>
        <fieldset><legend>Material</legend>{["Toate", "ceramică", "in", "ceară de soia", "compozit mineral"].map((item) => <label key={item}><input type="radio" name="material" checked={material === item} onChange={() => setMaterial(item)} /><span>{item}</span></label>)}</fieldset>
        <fieldset><legend>Rating minim</legend>{[0, 4.8, 4.9].map((value) => <label key={value}><input type="radio" name="rating" checked={rating === value} onChange={() => setRating(value)} /><span>{value ? `${value}+ stele` : "Orice rating"}</span></label>)}</fieldset>
        <label className="check-filter"><input type="checkbox" checked={ready} onChange={(event) => setReady(event.target.checked)} /><i>{ready && <Check />}</i><span><strong>Livrare rapidă</strong><small>expediere în maximum 2 zile</small></span></label>
        <button className="reset-link" onClick={reset}>Resetează toate filtrele</button>
      </aside>
      <div className="catalog-results">
        <div className="result-toolbar"><span>{result.length} {result.length === 1 ? "produs" : "produse"}</span><label>Ordonează <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="relevanta">Relevanță</option><option value="pret-mic">Preț crescător</option><option value="pret-mare">Preț descrescător</option><option value="rating">Rating</option></select></label></div>
        {result.length ? <div className="product-grid">{result.map((product, index) => <ProductCard key={product.id} product={product} reasons={semantic?.reasons[product.id]} priority={index < 3} />)}</div> : <div className="empty-state"><Search /><h2>Nicio potrivire exactă</h2><p>Mărește bugetul sau elimină un filtru pentru a vedea mai multe obiecte.</p><button onClick={reset}>Arată tot catalogul</button></div>}
      </div>
    </section>
  </main>;
}
