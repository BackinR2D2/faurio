"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Plus, Archive, Copy, Pencil, X } from "lucide-react";
import { ShopImageUpload } from "@/components/shop-image-upload";
import { useStudio } from "@/components/studio-shell";
import { artwork, productInputSchema, type StudioProduct, type StudioProductInput } from "@/lib/marketplace/contracts";
import productMedia from "@/lib/product-media.json";
import { studioRequest } from "@/lib/marketplace/client";
import { categories, money } from "@/lib/catalog";

const emptyProduct: StudioProductInput = { name: "", product_type: "Produs", category: "Ceramică", price: 80, stock: 1, shipping_days: 3, material: "", color: "", description: "", image: productMedia[0].src };
const labels = { draft: "Ciornă", pending_review: "În verificare", published: "Publicat", archived: "Arhivat" };

export function StudioProducts() {
  const { shop, token } = useStudio();
  const [products, setProducts] = useState<StudioProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id: string | null; product: StudioProductInput } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    return studioRequest<{ products: StudioProduct[]; total: number }>(`/api/studio/products?shop=${shop.id}&page=${page}`, token, { signal });
  }, [page, shop.id, token]);
  function display(result: { products: StudioProduct[]; total: number }) {
    setProducts(result.products); setTotal(result.total); setLoading(false);
  }
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(display).catch((caught) => { if (!controller.signal.aborted) { setError(caught.message); setLoading(false); } });
    return () => controller.abort();
  }, [load]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const product = productInputSchema.safeParse({ ...Object.fromEntries(form), price: Number(form.get("price")), stock: Number(form.get("stock")), shipping_days: Number(form.get("shipping_days")) });
    if (!product.success) { setError(product.error.issues[0]?.message || "Verifică datele produsului."); return; }
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    setBusy(true); setError(""); setNotice("");
    try {
      await studioRequest("/api/studio/products", token, { method: "POST", body: JSON.stringify({ shopId: shop.id, productId: editing.id, product: product.data, submit: submitter?.value === "submit" }) });
      setEditing(null); display(await load()); setNotice("Produs salvat. Modificările unei piese publicate necesită o nouă verificare.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Salvarea a eșuat."); }
    finally { setBusy(false); }
  }
  async function archive(product: StudioProduct) {
    setBusy(true); setError("");
    try { await studioRequest("/api/studio/products", token, { method: "DELETE", body: JSON.stringify({ shopId: shop.id, productId: product.id }) }); display(await load()); setNotice("Produs arhivat. Nu mai poate fi cumpărat."); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Arhivarea a eșuat."); }
    finally { setBusy(false); }
  }
  const restricted = ["suspended", "closed"].includes(shop.status);
  return <section><header className="studio-heading studio-heading-row"><div><p className="eyebrow">Colecția ta</p><h1>Produse.</h1><p>{total} {total === 1 ? "piesă" : "piese"} în atelier</p></div><button className="primary-button" disabled={restricted} onClick={() => { setEditing({ id: null, product: emptyProduct }); setError(""); }}><Plus size={18} />Adaugă o piesă</button></header>
    {error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="form-success" role="status">{notice}</p>}
    {editing && <form onSubmit={save} className="studio-product-form" key={editing.id || "new"}><div className="studio-panel-heading"><h2>{editing.id ? "Editează piesa" : "O piesă nouă"}</h2><button type="button" onClick={() => setEditing(null)} aria-label="Închide formularul"><X /></button></div>
      <div className="studio-form-row"><label>Nume<input name="name" required minLength={2} maxLength={140} defaultValue={editing.product.name} /></label><label>Tip produs<input name="product_type" required maxLength={80} defaultValue={editing.product.product_type} /></label></div>
      <div className="studio-form-row"><label>Categorie<select name="category" defaultValue={editing.product.category}>{categories.filter((category) => category !== "Toate").map((category) => <option key={category}>{category}</option>)}</select></label><label>Imagine de prezentare<select name="image" value={editing.product.image} onChange={(event) => setEditing({ ...editing, product: { ...editing.product, image: event.target.value } })}>{editing.product.image.startsWith("/media/") && <option value={editing.product.image}>Fotografia ta</option>}{productMedia.map((item) => <option key={item.src} value={item.src}>{item.label}</option>)}{artwork.includes(editing.product.image as typeof artwork[number]) && <option value={editing.product.image}>Imagine anterioară</option>}</select><small>Imagini ilustrative pentru catalogul demonstrativ.</small></label></div>
      <ShopImageUpload onUpload={(src) => setEditing({ ...editing, product: { ...editing.product, image: src } })} /><div className="studio-form-row three"><label>Preț (RON)<input name="price" type="number" required min={1} max={100000} step={1} defaultValue={editing.product.price} /></label><label>Stoc<input name="stock" type="number" required min={0} max={9999} defaultValue={editing.product.stock} /></label><label>Pregătire (zile lucrătoare)<input name="shipping_days" type="number" required min={1} max={90} defaultValue={editing.product.shipping_days} /></label></div>
      <div className="studio-form-row"><label>Material<input name="material" required minLength={2} maxLength={160} defaultValue={editing.product.material} /></label><label>Culoare<input name="color" required minLength={2} maxLength={100} defaultValue={editing.product.color} /></label></div><label>Descriere<textarea name="description" required minLength={20} maxLength={4000} rows={5} defaultValue={editing.product.description} /></label>
      <div className="studio-form-actions"><button type="submit" name="action" value="draft" className="studio-secondary" disabled={busy}>Salvează ciorna</button><button type="submit" name="action" value="submit" className="primary-button" disabled={busy}>{busy ? "Se salvează…" : "Trimite la verificare"}</button></div>
    </form>}
    {loading ? <p role="status">Se citesc piesele…</p> : !products.length ? <div className="studio-empty-inline"><h2>Prima piesă dă tonul.</h2><p>Adaugă o descriere sinceră, materialele și timpul de lucru.</p></div> : <div className="studio-products-list">{products.map((product) => <article key={product.id}><div><span className="studio-listing-state">{labels[product.listing_status]}</span><h2>{product.name}</h2><p>{product.material} · {money.format(product.price)} · stoc {product.stock}</p></div><div className="studio-row-actions"><button disabled={busy || restricted} onClick={() => setEditing({ id: product.id, product: productInputSchema.parse({ name: product.name, product_type: product.product_type, category: product.category, price: product.price, stock: product.stock, shipping_days: product.shipping_days, material: product.material, color: product.color, description: product.description, image: product.image }) })}><Pencil size={16} />Editează</button><button disabled={busy || restricted} onClick={() => setEditing({ id: null, product: { ...product, name: `${product.name} · copie` } })}><Copy size={16} />Duplică</button><button disabled={busy || restricted || product.listing_status === "archived"} onClick={() => archive(product)}><Archive size={16} />Arhivează</button></div></article>)}</div>}
    {total > 20 && <nav className="maker-page-links" aria-label="Pagini produse Studio"><button disabled={page <= 1} onClick={() => setPage(page - 1)}><ArrowLeft size={16} />Înapoi</button><span>{page} / {Math.ceil(total / 20)}</span><button disabled={page * 20 >= total} onClick={() => setPage(page + 1)}>Mai multe<ArrowRight size={16} /></button></nav>}
  </section>;
}
