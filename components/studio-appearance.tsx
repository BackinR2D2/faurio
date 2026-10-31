"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, ExternalLink, Eye, Monitor, Smartphone, Undo2 } from "lucide-react";
import { ShopImageUpload } from "@/components/shop-image-upload";
import { useStudio } from "@/components/studio-shell";
import { MakerStorefront } from "@/components/maker-storefront";
import { artwork, blockLabels, layoutSchema, moveBlock, moveBlockTo, themeLabels, themes, type ShopLayout, type ShopPage } from "@/lib/marketplace/contracts";
import { studioRequest } from "@/lib/marketplace/client";
import type { Product } from "@/lib/catalog";

type Version = { revision: number; content: ShopLayout; created_at: string };

export function StudioAppearance() {
  const { shop, token } = useStudio();
  const [draft, setDraft] = useState<ShopLayout | null>(null);
  const [saved, setSaved] = useState("");
  const [revision, setRevision] = useState(0);
  const [published, setPublished] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [mobile, setMobile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState<ShopLayout[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      studioRequest<{ page: ShopPage; versions: Version[] }>(`/api/studio/appearance?shop=${shop.id}`, token, { signal: controller.signal }),
      studioRequest<{ previewProducts: Product[]; total: number }>(`/api/studio/products?shop=${shop.id}`, token, { signal: controller.signal }),
    ]).then(([appearance, catalog]) => {
      const layout = layoutSchema.parse(appearance.page.draft);
      setDraft(layout); setSaved(JSON.stringify(layout)); setRevision(appearance.page.revision); setPublished(Boolean(appearance.page.published)); setVersions(appearance.versions); setProducts(catalog.previewProducts || []); setTotal(catalog.total);
    }).catch((caught) => { if (!controller.signal.aborted) setError(caught.message); });
    return () => controller.abort();
  }, [shop.id, token]);
  const dirty = Boolean(draft && JSON.stringify(draft) !== saved);
  useEffect(() => {
    if (!draft || !dirty || busy || error) return;
    const snapshot = draft;
    const timer = setTimeout(async () => {
      const checked = layoutSchema.safeParse(snapshot);
      if (!checked.success) { setError(checked.error.issues[0]?.message || "Verifică datele paginii."); return; }
      setBusy(true);
      try {
        const result = await studioRequest<{ revision: number }>("/api/studio/appearance", token, { method: "PUT", body: JSON.stringify({ shopId: shop.id, revision, layout: checked.data }) });
        setRevision(result.revision); setSaved(JSON.stringify(snapshot)); setNotice("Ciornă salvată");
      } catch (caught) { setError(caught instanceof Error ? caught.message : "Salvarea a eșuat."); }
      finally { setBusy(false); }
    }, 1000);
    return () => clearTimeout(timer);
  }, [draft, dirty, busy, error, revision, shop.id, token]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function edit(update: (value: ShopLayout) => ShopLayout) {
    if (!draft) return;
    setHistory((previous) => [...previous.slice(-29), draft]);
    setDraft(update(draft)); setError(""); setNotice("");
  }
  async function publish(value: boolean) {
    if (busy || dirty || !draft) return;
    setBusy(true); setError("");
    try {
      const result = await studioRequest<{ revision: number }>("/api/studio/appearance", token, { method: "POST", body: JSON.stringify({ shopId: shop.id, revision, publish: value }) });
      if (value) setVersions((previous) => [{ revision, content: draft, created_at: new Date().toISOString() }, ...previous].slice(0, 10));
      setRevision(result.revision); setPublished(value); setNotice(value ? "Pagina este publicată." : "Pagina nu mai este publică.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Publicarea a eșuat."); }
    finally { setBusy(false); }
  }
  if (!draft) return <section className="studio-heading"><h1>Aspect & poveste.</h1>{error ? <p className="form-error" role="alert">{error}</p> : <p role="status">Se pregătește editorul…</p>}</section>;
  const restricted = ["suspended", "closed"].includes(shop.status);
  return <section className="appearance-studio"><header className="studio-heading studio-heading-row"><div><p className="eyebrow">Fiecare atelier, altfel</p><h1>Fă-l al tău.</h1><p>Modificările rămân în ciornă până le publici.</p></div><div className="appearance-publish"><span role="status">{busy ? "Se salvează…" : dirty ? "Modificări nesalvate" : <><Check size={14} /> Ciornă salvată</>}</span><button className="primary-button" disabled={busy || dirty || Boolean(error) || shop.status !== "active"} onClick={() => publish(true)}>Publică pagina</button></div></header>
    {shop.status !== "active" && <p className="form-notice">Poți pregăti ciorna. Publicarea devine disponibilă după aprobarea atelierului.</p>}
    <a className="studio-preview-jump" href="#previzualizare">Vezi previzualizarea ↓</a>
    {error && <div role="alert" className="form-error">{error} <button onClick={() => window.location.reload()}>Reîncarcă ciorna</button></div>}{notice && <p role="status" className="studio-save-notice">{notice}</p>}
    <div className="appearance-grid"><div className="appearance-controls"><fieldset disabled={restricted}>
      <div className="studio-panel-heading"><h2>Atmosferă</h2><button type="button" className="studio-icon-button" disabled={!history.length || busy} aria-label="Anulează ultima modificare" onClick={() => { const value = history.at(-1); if (value) { setDraft(value); setHistory(history.slice(0, -1)); setError(""); } }}><Undo2 size={18} /></button></div>
      <div className="theme-choices">{themes.map((theme) => <button key={theme} type="button" className={`theme-choice theme-${theme}`} aria-pressed={draft.theme === theme} onClick={() => edit((value) => ({ ...value, theme }))}><span className="theme-swatch" /><span>{themeLabels[theme]}</span>{draft.theme === theme && <Check size={14} />}</button>)}</div>
      <label>Tipografie<select value={draft.font} onChange={(event) => edit((value) => ({ ...value, font: event.target.value as ShopLayout["font"] }))}><option value="sans">Modernă · sans serif</option><option value="serif">Editorială · serif</option><option value="oswald">Expresivă · Oswald</option></select></label>
      <h2>Identitate</h2><label>Titlu<input value={draft.title} maxLength={100} onChange={(event) => edit((value) => ({ ...value, title: event.target.value }))} /></label><label>O propoziție despre tine<textarea rows={2} value={draft.subtitle} maxLength={240} onChange={(event) => edit((value) => ({ ...value, subtitle: event.target.value }))} /></label>
      <label>Copertă<select value={draft.cover} onChange={(event) => edit((value) => ({ ...value, cover: event.target.value as ShopLayout["cover"] }))}>{draft.cover.startsWith("/media/") && <option value={draft.cover}>Coperta ta</option>}{artwork.map((src, index) => <option key={src} value={src}>{["Lut & ceramică", "Fire & flori", "Lumină & forme"][index]}</option>)}</select><small>Bibliotecă de compoziții pentru previzualizare.</small></label>
      <ShopImageUpload label="Încarcă o copertă proprie" onUpload={(src) => edit((value) => ({ ...value, cover: src }))} /><h2>Secțiuni</h2><p className="studio-help">Trage secțiunile sau folosește săgețile. Catalogul rămâne vizibil.</p><ol className="block-order">{draft.blocks.map((block, index) => <li key={block.type} draggable={!restricted} onDragStart={(event) => { event.dataTransfer.setData("text/plain", block.type); event.dataTransfer.effectAllowed = "move"; }} onDragOver={(event) => { if (!restricted) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); if (!restricted) { const type = event.dataTransfer.getData("text/plain"); edit((value) => moveBlockTo(value, value.blocks.findIndex((item) => item.type === type), index)); } }}><label><input type="checkbox" checked={block.visible} disabled={block.type === "products"} onChange={(event) => edit((value) => ({ ...value, blocks: value.blocks.map((item) => item.type === block.type ? { ...item, visible: event.target.checked } : item) }))} />{blockLabels[block.type]}</label><button type="button" disabled={index === 0} aria-label={`Mută ${blockLabels[block.type]} în sus`} onClick={() => edit((value) => moveBlock(value, index, -1))}><ArrowUp size={15} /></button><button type="button" disabled={index === 5} aria-label={`Mută ${blockLabels[block.type]} în jos`} onClick={() => edit((value) => moveBlock(value, index, 1))}><ArrowDown size={15} /></button></li>)}</ol>
      <label>Povestea atelierului<textarea rows={7} value={draft.story} maxLength={6000} placeholder="Cum a început totul? Ce te face să revii la masa de lucru?" onChange={(event) => edit((value) => ({ ...value, story: event.target.value }))} /></label>
      <label>Notă pentru vizitatori<textarea rows={3} value={draft.announcement} maxLength={400} onChange={(event) => edit((value) => ({ ...value, announcement: event.target.value }))} /></label>
      <h2>Galerie</h2><p className="studio-help">Selectează compozițiile, apoi activează secțiunea Galerie.</p>{artwork.map((src, index) => <label className="studio-check" key={src}><input type="checkbox" checked={draft.gallery.includes(src)} onChange={(event) => edit((value) => ({ ...value, gallery: event.target.checked ? [...value.gallery, src] : value.gallery.filter((image) => image !== src) }))} />{["Ceramică", "Textile", "Obiecte decorative"][index]}</label>)}
      {draft.gallery.filter((src) => src.startsWith("/media/")).map((src, index) => <label className="studio-check" key={src}><input type="checkbox" checked onChange={() => edit((value) => ({ ...value, gallery: value.gallery.filter((image) => image !== src) }))} />Fotografia ta {index + 1}</label>)}{draft.gallery.length < 3 && <ShopImageUpload label="Adaugă o fotografie în galerie" onUpload={(src) => edit((value) => ({ ...value, gallery: [...value.gallery, src].slice(0, 3) }))} />}<h2>Întrebări frecvente</h2>{draft.faq.map((faq, index) => <div key={index} className="studio-faq-item"><label>Întrebare {index + 1}<input maxLength={160} value={faq.question} onChange={(event) => edit((value) => ({ ...value, faq: value.faq.map((item, i) => i === index ? { ...item, question: event.target.value } : item) }))} /></label><label>Răspuns<textarea rows={3} maxLength={800} value={faq.answer} onChange={(event) => edit((value) => ({ ...value, faq: value.faq.map((item, i) => i === index ? { ...item, answer: event.target.value } : item) }))} /></label><button className="studio-text-button" type="button" onClick={() => edit((value) => ({ ...value, faq: value.faq.filter((_, i) => i !== index) }))}>Elimină întrebarea</button></div>)}<button type="button" className="studio-secondary" disabled={draft.faq.length >= 5} onClick={() => edit((value) => ({ ...value, faq: [...value.faq, { question: "Cum pregătim piesele?", answer: "Fiecare comandă este pregătită cu grijă în atelier." }] }))}>Adaugă o întrebare</button>
    </fieldset>{versions.length > 0 && <details className="studio-versions"><summary>Versiuni publicate ({versions.length})</summary>{versions.map((version) => <button disabled={busy} type="button" key={version.revision} onClick={() => edit(() => version.content)}>Restaurează în ciornă · v{version.revision} · {new Date(version.created_at).toLocaleDateString("ro-RO")}</button>)}</details>}{published && <div className="appearance-unpublish"><a href={`/makers/${shop.slug}`} target="_blank" rel="noreferrer">Vezi pagina publică <ExternalLink size={14} /></a><button type="button" className="studio-text-button" disabled={busy || dirty} onClick={() => publish(false)}>Retrage pagina publică</button></div>}</div>
      <div className="appearance-preview" id="previzualizare"><div className="preview-toolbar"><span><Eye size={15} />Previzualizare ciornă</span><div><button aria-label="Previzualizare desktop" aria-pressed={!mobile} onClick={() => setMobile(false)}><Monitor size={17} /></button><button aria-label="Previzualizare mobil" aria-pressed={mobile} onClick={() => setMobile(true)}><Smartphone size={17} /></button></div></div><div className={`preview-frame${mobile ? " is-mobile" : ""}`} inert><MakerStorefront layout={draft} name={shop.name} location={shop.location} country={shop.country} products={products.slice(0, 6)} total={total} preview /></div></div>
    </div>
  </section>;
}
