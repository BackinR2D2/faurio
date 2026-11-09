"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, Heart, MapPin, Package, Save, ShieldCheck, Store, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useShop } from "@/components/shop-provider";
import { money } from "@/lib/catalog";
import { CustomerOrderActions, type OrderProgress } from "@/components/customer-order-actions";
import { AccountDeletion } from "@/components/account-deletion";

type Profile = { name: string; email: string; phone: string; address: string; city: string; county: string; postalCode: string; newsletter: boolean; gifts: boolean };
type StoredOrder = { code: string; date: string; total: number; paymentId: string; status?: string; items?: {id:string;name:string}[]; progress?: OrderProgress };

export function AccountProfile() {
  const router = useRouter();
  const { user, loading, accessToken, signOut } = useAuth();
  const { favorites } = useShop();
  const [tab, setTab] = useState<"profil" | "comenzi" | "adrese">("profil");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [ordersPage, setOrdersPage] = useState(1);
  const [orderCount, setOrderCount] = useState(0);
  const [isOperator, setIsOperator] = useState(false);
  const [dataOwner, setDataOwner] = useState("");
  const signingOut = useRef(false);
  const [profile, setProfile] = useState<Profile>({ name: "", email: "", phone: "", address: "", city: "", county: "", postalCode: "", newsletter: false, gifts: false });

  useEffect(() => {
    if (!loading && !user && !signingOut.current) router.replace("/cont");
    if (!user) return;
    queueMicrotask(() => setProfile((current) => ({ ...current, name: user.name, email: user.email })));
  }, [loading, router, user]);

  useEffect(() => {
    if (!accessToken || !user) return;
    const controller = new AbortController();
    void fetch(`/api/profile?page=${ordersPage}`, { signal: controller.signal, headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async (response) => { if (!response.ok) throw new Error("Contul nu a putut fi încărcat. Încearcă din nou."); return response.json(); })
      .then((result: { profile?: Partial<Profile>; orders?: StoredOrder[]; orderCount?: number; isOperator?: boolean } | null) => {
        if (controller.signal.aborted) return;
        if (result?.profile) setProfile({ name: user.name, email: user.email, phone: "", address: "", city: "", county: "", postalCode: "", newsletter: false, gifts: false, ...result.profile });
        if (result?.orders) setOrders(result.orders.map((order) => ({ ...order, date: new Date(order.date).toLocaleString("ro-RO") })));
        setOrderCount(result?.orderCount || result?.orders?.length || 0); setIsOperator(Boolean(result?.isOperator)); setDataOwner(user.id); setError("");
      }).catch((caught) => { if (!controller.signal.aborted) setError((caught as Error).message); });
    return () => controller.abort();
  }, [accessToken, user, ordersPage]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!accessToken) { setError("Sesiunea a expirat. Autentifică-te din nou."); return; }
    const response = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(profile) });
    if (!response.ok) { setError("Profilul nu a putut fi salvat."); return; }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  if (loading || !user || dataOwner !== user.id) return <main className="page-main account-loading">{error ? <><p role="alert">{error}</p><button onClick={() => window.location.reload()}>Reîncearcă</button></> : "Se încarcă…"}</main>;

  return <main className="page-main account-page">
    <section className="account-hero"><div><p className="eyebrow">Contul meu</p><h1>Bună, {profile.name.split(" ")[0]}.</h1></div><div className="account-avatar">{profile.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</div></section>
    <div className="account-layout"><aside className="account-nav"><button className={tab === "profil" ? "active" : ""} onClick={() => setTab("profil")}><UserRound /> Profil</button><button className={tab === "comenzi" ? "active" : ""} onClick={() => setTab("comenzi")}><Package /> Comenzi <b>{orderCount}</b></button><button className={tab === "adrese" ? "active" : ""} onClick={() => setTab("adrese")}><MapPin /> Adresă</button><Link href="/favorite"><Heart /> Favorite <b>{favorites.length}</b></Link><Link href="/studio"><Store /> Atelierul meu</Link>{isOperator && <Link href="/admin/marketplace"><ShieldCheck /> Administrare</Link>}<button className="sign-out" onClick={async () => { signingOut.current = true; await signOut(); router.push("/"); }}>Ieși din cont</button></aside>
      <section className="account-content">{tab === "profil" && <form onSubmit={save}><div className="account-content-head"><div><h2>Date personale</h2></div><button className="primary-button" type="submit">{saved ? <><Check /> Salvat</> : <><Save /> Salvează</>}</button></div>{error && <p className="form-error">{error}</p>}<div className="form-grid"><label>Nume<input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label><label>Email<input value={profile.email} disabled /></label><label>Telefon<input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="07xx xxx xxx" /></label></div><div className="preference-box"><h3>Preferințe</h3><label><input type="checkbox" checked={profile.newsletter} onChange={(event) => setProfile({ ...profile, newsletter: event.target.checked })} /> Noutăți din ateliere</label><label><input type="checkbox" checked={profile.gifts} onChange={(event) => setProfile({ ...profile, gifts: event.target.checked })} /> Idei de cadouri</label></div></form>}
        {tab === "comenzi" && <div><div className="account-content-head"><h2>Comenzi</h2></div>{orderCount > 25 && <nav className="maker-page-links" aria-label="Pagini comenzi personale"><button disabled={ordersPage === 1} onClick={() => setOrdersPage(ordersPage - 1)}>Înapoi</button><span>{ordersPage} / {Math.ceil(orderCount / 25)}</span><button disabled={ordersPage * 25 >= orderCount} onClick={() => setOrdersPage(ordersPage + 1)}>Înainte</button></nav>}{orders.length ? <div className="order-history">{orders.map((order) => <article key={order.code}><span><small>Comandă</small><strong>{order.code}</strong></span><span><small>Dată</small><strong>{order.date}</strong></span><span><small>Total</small><strong>{money.format(order.total)}</strong></span><b>{order.status === "paid" ? "Plătită" : order.status === "pending" ? "În așteptare" : order.status === "cancelled" ? "Anulată" : "Rambursată"}</b><CustomerOrderActions code={order.code} status={order.status} items={order.items} progress={order.progress} token={accessToken!} /></article>)}</div> : <div className="account-empty"><Package /><h3>Nicio comandă</h3><Link className="primary-button" href="/catalog">Vezi catalogul</Link></div>}</div>}
        {tab === "adrese" && <form onSubmit={save}><div className="account-content-head"><h2>Adresa implicită</h2><button className="primary-button" type="submit"><Save /> Salvează</button></div><div className="form-grid"><label className="wide">Adresă<input value={profile.address} onChange={(event) => setProfile({ ...profile, address: event.target.value })} /></label><label>Oraș<input value={profile.city} onChange={(event) => setProfile({ ...profile, city: event.target.value })} /></label><label>Județ<input value={profile.county} onChange={(event) => setProfile({ ...profile, county: event.target.value })} /></label><label>Cod poștal<input value={profile.postalCode} onChange={(event) => setProfile({ ...profile, postalCode: event.target.value })} /></label></div></form>}
        {tab === "profil" && <AccountDeletion onDeleting={() => { signingOut.current = true; }} />}
      </section>
    </div>
  </main>;
}
