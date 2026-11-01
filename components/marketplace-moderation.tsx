"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/auth-provider";
import { studioRequest } from "@/lib/marketplace/client";

type RecordRow = { id: string; name: string; status?: string; listing_status?: string; slug?: string; shop_id?: string; location?: string; description?: string; image?: string; product_type?: string; category?: string; price?: number; stock?: number; material?: string; color?: string; shop_pages?: { draft: { title: string; subtitle: string; story: string; cover: string } } | null };
type Audit = { id: number; action: string; reason: string; created_at: string; subject_id: string | null };
type Data = { records: RecordRow[]; total: number; audit: Audit[] };

export function MarketplaceModeration() {
  const { accessToken, loading } = useAuth();
  const [kind, setKind] = useState<"shops" | "products">("shops");
  const [page, setPage] = useState(1);
  const [listingStatus, setListingStatus] = useState("pending_review");
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    if (!accessToken) return;
    return studioRequest<Data>(`/api/admin/marketplace?kind=${kind}&page=${page}&status=${listingStatus}`, accessToken, { signal });
  }, [accessToken, kind, page, listingStatus]);
  useEffect(() => { const controller = new AbortController(); load(controller.signal).then((result) => { if (result) setData(result); }).catch((caught) => { if (!controller.signal.aborted) setError(caught.message); }); return () => controller.abort(); }, [load]);
  async function moderate(event: FormEvent<HTMLFormElement>, row: RecordRow) {
    event.preventDefault();
    if (!accessToken) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError(""); setNotice("");
    try { await studioRequest("/api/admin/marketplace", accessToken, { method: "PATCH", body: JSON.stringify({ kind: kind === "shops" ? "shop" : "product", id: row.id, status: form.get("status"), reason: form.get("reason") }) }); const result = await load(); if (result) setData(result); setNotice("Decizie salvată în jurnalul de audit."); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Moderarea a eșuat."); }
    finally { setBusy(false); }
  }
  if (loading) return <main className="page-main studio-loading">Se verifică accesul…</main>;
  if (!accessToken) return <main className="page-main studio-empty"><h1>Administrare marketplace</h1><Link href="/cont">Autentifică-te</Link></main>;
  return <main className="page-main marketplace-admin"><header className="studio-heading"><p className="eyebrow">Administrare · decizii urmărite</p><h1>Ateliere & colecții.</h1><Link href="/admin">← Stocuri și comenzi</Link> · <Link href="/admin/finance">Comisioane & rambursări →</Link> · <Link href="/admin/feedback">Recenzii, retururi & mesaje →</Link></header><div className="studio-tabs"><button aria-pressed={kind === "shops"} onClick={() => { setKind("shops"); setPage(1); }}>Ateliere</button><button aria-pressed={kind === "products"} onClick={() => { setKind("products"); setPage(1); }}>Produse</button></div>{kind === "products" && <label className="moderation-filter">Starea listării<select value={listingStatus} onChange={(event) => { setListingStatus(event.target.value); setPage(1); }}><option value="pending_review">În verificare</option><option value="published">Publicate</option><option value="draft">Ciorne</option><option value="archived">Arhivate</option></select></label>}{error && <p role="alert" className="form-error">{error}</p>}{notice && <p role="status" className="form-success">{notice}</p>}{data && <><p>{data.total} înregistrări</p><div className="moderation-list">{data.records.map((row) => <article key={row.id}><div><h2>{row.name}</h2><p>{row.status || row.listing_status} · {row.slug || row.shop_id}</p><details className="moderation-preview"><summary>Detalii pentru verificare</summary>{kind === "products" ? <>{row.image && <Image src={row.image} alt={row.name} width={320} height={240} />}<p>{row.product_type} · {row.category} · {row.price} RON · stoc {row.stock}</p><p>{row.material} · {row.color}</p><p>{row.description}</p></> : <><p>{row.location}</p>{row.shop_pages?.draft && <>{row.shop_pages.draft.cover && <Image src={row.shop_pages.draft.cover} alt="Coperta atelierului" width={320} height={240} />}<h3>{row.shop_pages.draft.title}</h3><p>{row.shop_pages.draft.subtitle}</p><p>{row.shop_pages.draft.story || "Povestea atelierului nu a fost completată."}</p></>}</>}</details></div><form onSubmit={(event) => moderate(event, row)}><label>Decizie<select name="status">{(kind === "shops" ? [["active", "Aprobă / reactivează"], ["restricted", "Restricționează"], ["suspended", "Suspendă"]] : [["published", "Aprobă publicarea"], ["draft", "Returnează în ciornă"], ["archived", "Arhivează"]]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Motiv<input name="reason" required minLength={5} maxLength={1000} placeholder="Motivul deciziei, vizibil în audit" /></label><button className="primary-button" disabled={busy}>Salvează decizia</button></form></article>)}</div>{!data.records.length && <p className="studio-empty-inline">Nu există înregistrări de verificat pe această pagină.</p>}<nav className="maker-page-links"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Înapoi</button><span>Pagina {page}</span><button disabled={page * 20 >= data.total} onClick={() => setPage(page + 1)}>Mai multe</button></nav><details className="moderation-audit" open><summary>Jurnal de audit · ultimele 30 de acțiuni</summary>{data.audit.map((entry) => <div key={entry.id}><time>{new Date(entry.created_at).toLocaleString("ro-RO")}</time><strong>{entry.action}</strong><span>{entry.reason || entry.subject_id || "—"}</span></div>)}</details></>}</main>;
}
