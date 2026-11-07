"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { money, type CatalogFilters } from "@/lib/catalog";
import { changedCatalogFilters, type CatalogFilterOptions } from "@/lib/catalog-filters";
import { CatalogMultiSelect } from "@/components/catalog-multi-select";

type Props = { filters: CatalogFilters; options: CatalogFilterOptions; priceLimit: number; queryBudget?: number; queryMinimum?: number; open: boolean; pending: boolean; resetHref: string; onClose: () => void; onApply: (filters: CatalogFilters) => void };

export function CatalogFiltersPanel({ filters, options, priceLimit, queryBudget, queryMinimum, open, pending, resetHref, onClose, onApply }: Props) {
  const [draft, setDraft] = useState(filters);
  const panel = useRef<HTMLElement>(null);
  const price = Math.min(draft.maxPrice ?? priceLimit, queryBudget ?? Infinity);
  const dirty = Object.keys(changedCatalogFilters(filters, draft)).length > 0;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const desktop = matchMedia("(min-width: 851px)");
    const resize = () => { if (desktop.matches) onClose(); };
    desktop.addEventListener("change", resize);
    return () => desktop.removeEventListener("change", resize);
  }, [open, onClose]);
  const keyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (!open) return;
    if (event.key === "Escape") { event.preventDefault(); onClose(); }
    if (event.key !== "Tab") return;
    const controls = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], summary');
    if (!controls?.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  const submit = (event: FormEvent) => { event.preventDefault(); if (!pending && dirty) { onApply(draft); onClose(); } };
  return <>
    {open && <button className="filter-backdrop" onClick={onClose} aria-label="Închide panoul de filtre" />}
    <aside ref={panel} className={`filter-panel${open ? " open" : ""}`} role={open ? "dialog" : undefined} aria-modal={open || undefined} aria-label="Filtre catalog" onKeyDown={keyboard}>
      <div className="filter-heading"><strong>Filtre</strong><button type="button" onClick={onClose} aria-label="Închide filtrele"><X /></button></div>
      <form className="catalog-filter-form" onSubmit={submit} inert={pending} aria-busy={pending}>
        <div className="range-filter"><label htmlFor="catalog-price">Preț maxim <b>{draft.maxPrice === undefined && queryBudget === undefined ? "Fără limită" : money.format(price)}</b></label><input id="catalog-price" type="range" min={queryMinimum ?? 0} max={priceLimit} step="0.01" value={Math.min(price, priceLimit)} aria-valuetext={draft.maxPrice === undefined && queryBudget === undefined ? "Fără limită" : `${price} lei`} onChange={event => setDraft({ ...draft, maxPrice: Number(event.target.value) === priceLimit ? undefined : Number(event.target.value) })} /><label className="price-number"><span>Buget în lei</span><input type="number" aria-label="Preț maxim în lei" min={draft.minPrice ?? queryMinimum ?? 0} max={queryBudget} step="0.01" value={draft.maxPrice ?? ""} placeholder={queryBudget === undefined ? "Orice preț" : String(queryBudget)} onChange={event => setDraft({ ...draft, maxPrice: event.target.value === "" ? undefined : Math.min(queryBudget ?? Infinity, Math.max(0, Number(event.target.value))) })} /></label></div>
        <label className="price-number"><span>Preț minim în lei</span><input type="number" aria-label="Preț minim în lei" min={queryMinimum ?? 0} max={draft.maxPrice} step="0.01" placeholder="Orice preț" value={draft.minPrice ?? ""} onChange={event => setDraft({ ...draft, minPrice: event.target.value === "" ? undefined : Math.max(queryMinimum ?? 0, Number(event.target.value)) })} /></label>
        <fieldset><legend>Categorie</legend><CatalogMultiSelect label="Categorie" options={options.categories} selected={draft.categories || []} onChange={categories => setDraft({ ...draft, categories })} /></fieldset>
        <fieldset><legend>Tip de produs</legend><CatalogMultiSelect label="Tip de produs" options={options.productTypes} selected={draft.productTypes || []} onChange={productTypes => setDraft({ ...draft, productTypes })} /></fieldset>
        <fieldset><legend>Material</legend><CatalogMultiSelect label="Material" options={options.materials} selected={draft.materials || []} onChange={materials => setDraft({ ...draft, materials })} /></fieldset>
        <fieldset><legend>Evaluare</legend><select aria-label="Rating minim" value={draft.minRating || 0} onChange={event => setDraft({ ...draft, minRating: Number(event.target.value) || undefined })}>{[0, 4.5, 4.7, 4.9].map(value => <option key={value} value={value}>{value ? `${value}+ stele` : "Orice evaluare"}</option>)}</select></fieldset>
        <label className="ready-filter"><input type="checkbox" checked={Boolean(draft.ready)} onChange={event => setDraft({ ...draft, ready: event.target.checked })} /><span>Expediere în maximum 2 zile</span></label>
        <div className="filter-submit"><button className="primary-button" disabled={pending || !dirty}>{pending ? "Se actualizează…" : "Aplică filtrele"}</button><Link prefetch={false} scroll={false} className="reset-link" href={resetHref} onClick={onClose}>Resetează</Link></div>
      </form>
    </aside>
  </>;
}
