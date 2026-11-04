"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { materials, money, type CatalogFilters } from "@/lib/catalog";

type Props = { filters: CatalogFilters; priceLimit: number; queryBudget?: number; open: boolean; pending: boolean; resetHref: string; onClose: () => void; onApply: (filters: CatalogFilters) => void };

export function CatalogFiltersPanel({ filters, priceLimit, queryBudget, open, pending, resetHref, onClose, onApply }: Props) {
  const [draft, setDraft] = useState(filters);
  const panel = useRef<HTMLElement>(null);
  const price = Math.min(draft.maxPrice ?? priceLimit, queryBudget ?? Infinity);
  const dirty = draft.maxPrice !== filters.maxPrice || (draft.material || "Toate") !== (filters.material || "Toate") || (draft.minRating || 0) !== (filters.minRating || 0) || Boolean(draft.ready) !== Boolean(filters.ready);
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
        <div className="range-filter"><label htmlFor="catalog-price">Preț maxim <b>{draft.maxPrice === undefined && queryBudget === undefined ? "Fără limită" : money.format(price)}</b></label><input id="catalog-price" type="range" min="0" max={priceLimit} step="1" value={Math.min(price, priceLimit)} aria-valuetext={draft.maxPrice === undefined && queryBudget === undefined ? "Fără limită" : `${price} lei`} onChange={event => setDraft({ ...draft, maxPrice: Number(event.target.value) === priceLimit ? undefined : Number(event.target.value) })} /><label className="price-number"><span>Buget în lei</span><input type="number" aria-label="Preț maxim în lei" min="0" max={queryBudget} step="1" value={draft.maxPrice ?? ""} placeholder={queryBudget === undefined ? "Orice preț" : String(queryBudget)} onChange={event => setDraft({ ...draft, maxPrice: event.target.value === "" ? undefined : Math.min(queryBudget ?? Infinity, Math.max(0, Number(event.target.value))) })} /></label></div>
        <fieldset><legend>Material</legend><select aria-label="Material" value={draft.material || "Toate"} onChange={event => setDraft({ ...draft, material: event.target.value === "Toate" ? undefined : event.target.value })}>{materials.map(item => <option key={item} value={item}>{item}</option>)}</select></fieldset>
        <fieldset><legend>Evaluare</legend><select aria-label="Rating minim" value={draft.minRating || 0} onChange={event => setDraft({ ...draft, minRating: Number(event.target.value) || undefined })}>{[0, 4.5, 4.7, 4.9].map(value => <option key={value} value={value}>{value ? `${value}+ stele` : "Orice evaluare"}</option>)}</select></fieldset>
        <label className="ready-filter"><input type="checkbox" checked={Boolean(draft.ready)} onChange={event => setDraft({ ...draft, ready: event.target.checked })} /><span>Expediere în maximum 2 zile</span></label>
        <div className="filter-submit"><button className="primary-button" disabled={pending || !dirty}>{pending ? "Se actualizează…" : "Aplică filtrele"}</button><Link prefetch={false} scroll={false} className="reset-link" href={resetHref} onClick={onClose}>Resetează</Link></div>
      </form>
    </aside>
  </>;
}
