"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export function CatalogMultiSelect({ label, options, selected, onChange }: { label: string; options: string[]; selected: string[]; onChange: (value: string[]) => void }) {
  const root = useRef<HTMLDetailsElement>(null);
  const [term, setTerm] = useState("");
  const choices = [...new Set([...selected, ...options])];
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node) && root.current) root.current.open = false; };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  return <details ref={root} className="catalog-multi-select" onKeyDown={event => {
    if (event.key === "Escape" && root.current?.open) { event.stopPropagation(); root.current.open = false; root.current.querySelector("summary")?.focus(); }
  }}>
    <summary aria-label={label} title={selected.join(", ")}><span>{selected.length ? selected.join(", ") : "Toate"}</span><ChevronDown size={16} aria-hidden="true" /></summary>
    <div className="multi-select-options">
      {choices.length > 8 && <input type="search" aria-label={`Caută opțiuni: ${label}`} placeholder="Caută…" value={term} onChange={event => setTerm(event.target.value)} />}
      <div className="multi-select-choices" role="group" aria-label={`Opțiuni: ${label}`}>
        {choices.filter(item => normalize(item).includes(normalize(term))).map(item => <label key={item}><input type="checkbox" checked={selected.includes(item)} onChange={event => onChange(event.target.checked ? [...selected, item] : selected.filter(value => value !== item))} /><span>{item}</span></label>)}
        {!choices.some(item => normalize(item).includes(normalize(term))) && <p>Nicio opțiune</p>}
      </div>
      {selected.length > 0 && <button type="button" className="multi-select-clear" onClick={() => onChange([])}>Deselectează</button>}
    </div>
  </details>;
}
