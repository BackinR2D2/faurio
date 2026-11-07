"use client";

import Image from "next/image";
import { BrandMark } from "@/components/brand-mark";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Boxes, ChevronLeft, ChevronRight, ClipboardList, Minus, PackageCheck, Plus, Users } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { money, type Product } from "@/lib/catalog";

type Order = { code: string; date: string; total: number; customer: { name: string; email: string }; status: string };
type AdminProduct = Product & { active?: boolean };
type AdminData = { products: AdminProduct[]; page: number; pageCount: number; total: number; units: number; lowStock: number; users: number; orders: Order[] };

export function AdminDashboard() {
  const { user, loading: authLoading, accessToken } = useAuth();
  const [tab, setTab] = useState<"catalog" | "orders" | "users">("catalog");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const saving = useRef(new Set<string>());
  const [savingIds, setSavingIds] = useState<string[]>([]);

  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) { setData(null); setLoading(true); setError(""); } });
    void fetch(`/api/admin?page=${page}`, { signal: controller.signal, headers: { Authorization: `Bearer ${accessToken}` } }).then(async (response) => {
      const result = await response.json() as AdminData & { error?: string };
      if (!response.ok) throw new Error(result.error || "Datele nu au putut fi citite.");
      if (!controller.signal.aborted) setData(result);
    }).catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Eroare necunoscută."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accessToken, page]);

  const changeStock = async (product: AdminProduct, delta: number) => {
    if (!accessToken || !data || saving.current.has(product.id)) return;
    const stock = Math.max(0, product.stock + delta);
    saving.current.add(product.id); setSavingIds([...saving.current]); setError("");
    setData(current => current ? { ...current, products: current.products.map(item => item.id === product.id ? { ...item, stock } : item) } : current);
    try {
      const response = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ id: product.id, stock }) });
      if (!response.ok) throw new Error("STOCK_UPDATE_FAILED");
      const result = await response.json() as { updated?: boolean; stock?: number };
      if (!result.updated || !Number.isInteger(result.stock) || result.stock! < 0) throw new Error("STOCK_UPDATE_FAILED");
      const savedStock = result.stock!;
      setData(current => current ? { ...current,
        products: current.products.map(item => item.id === product.id ? { ...item, stock: savedStock } : item),
        units: current.units + (product.active === false ? 0 : savedStock - product.stock),
        lowStock: current.lowStock + (product.active === false ? 0 : Number(savedStock <= 3) - Number(product.stock <= 3)),
      } : current);
    } catch {
      setData(current => current ? { ...current, products: current.products.map(item => item.id === product.id ? { ...item, stock: product.stock } : item) } : current);
      setError("Stocul nu a putut fi salvat. Încearcă din nou.");
    } finally { saving.current.delete(product.id); setSavingIds([...saving.current]); }
  };

  if (authLoading) return <main className="page-main account-loading">Se încarcă…</main>;
  if (!user) return <main className="page-main empty-cart-page"><Users /><h1>Autentificare necesară</h1><Link className="primary-button" href="/cont">Intră în cont</Link></main>;

  return <main className="admin-page">
    <aside><div><BrandMark /><p><strong>Administrare</strong><small>{user.email}</small></p></div><button className={tab === "catalog" ? "active" : ""} onClick={() => setTab("catalog")}><Boxes /> Catalog</button><button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}><ClipboardList /> Comenzi <b>{data?.orders.length || 0}</b></button><button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}><Users /> Clienți</button></aside>
    <section><header><p className="eyebrow">Administrare DB</p><h1>{tab === "catalog" ? "Catalog" : tab === "orders" ? "Comenzi" : "Clienți"}</h1><Link href="/admin/marketplace">Moderare ateliere și produse →</Link></header>
      {error && <div className="form-error">{error}</div>}{loading && <div className="account-loading">Se încarcă…</div>}
      {!loading && data && tab === "catalog" && <><div className="admin-stats"><span><small>Produse</small><b>{data.total}</b></span><span><small>Unități</small><b>{data.units}</b></span><span><small>Stoc redus</small><b>{data.lowStock}</b></span></div><div className="admin-table"><div><span>Produs</span><span>Preț</span><span>Stoc</span><span>Status</span></div>{data.products.map((product) => <article key={product.id}><span><Image src={product.image} alt="" width={48} height={53} /><i><strong>{product.name}</strong><small>{product.category}</small></i></span><b>{money.format(product.price)}</b><span className="admin-qty"><button disabled={savingIds.includes(product.id) || product.stock === 0} aria-label={`Scade stocul pentru ${product.name}`} onClick={() => changeStock(product, -1)}><Minus /></button><b>{product.stock}</b><button disabled={savingIds.includes(product.id)} aria-label={`Crește stocul pentru ${product.name}`} onClick={() => changeStock(product, 1)}><Plus /></button></span><em className={product.stock <= 3 ? "low" : ""}>{product.stock === 0 ? "Epuizat" : product.stock <= 3 ? "Stoc redus" : "Activ"}</em></article>)}</div><nav className="catalog-pagination"><button disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft /></button><span>Pagina {page} din {data.pageCount}</span><button disabled={page >= data.pageCount} onClick={() => setPage(page + 1)}><ChevronRight /></button></nav></>}
      {!loading && data && tab === "orders" && (data.orders.length ? <div className="order-history">{data.orders.map((order) => <article key={order.code}><span><small>Comandă</small><strong>{order.code}</strong></span><span><small>Client</small><strong>{order.customer.name}</strong></span><span><small>Total</small><strong>{money.format(order.total)}</strong></span><b>{order.status}</b></article>)}</div> : <div className="account-empty"><ClipboardList /><h2>Nicio comandă</h2></div>)}
      {!loading && data && tab === "users" && <div className="admin-customer"><PackageCheck /><h2>{data.users} conturi de client</h2><p>Datele personale rămân protejate de politicile RLS.</p></div>}
    </section>
  </main>;
}
