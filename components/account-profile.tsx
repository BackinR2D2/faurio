"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Heart, MapPin, Package, Save, UserRound } from "lucide-react";
import { useShop } from "@/components/shop-provider";
import { money } from "@/lib/catalog";

type Profile = { name: string; email: string; phone: string; address: string; city: string; county: string; postalCode: string; newsletter: boolean; gifts: boolean };
type StoredOrder = { code: string; date: string; total: number; paymentId: string };

export function AccountProfile({ user, signOutPath }: { user: { displayName: string; email: string }; signOutPath: string }) {
  const { favorites } = useShop();
  const [tab, setTab] = useState<"profil" | "comenzi" | "adrese">("profil");
  const [saved, setSaved] = useState(false);
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [profile, setProfile] = useState<Profile>({ name: user.displayName, email: user.email, phone: "", address: "", city: "", county: "", postalCode: "", newsletter: true, gifts: false });

  useEffect(() => {
    try {
      const local = localStorage.getItem("fir-de-poveste-profile");
      if (local) setProfile((current) => ({ ...current, ...(JSON.parse(local) as Profile), email: user.email }));
      setOrders(JSON.parse(localStorage.getItem("fir-de-poveste-orders") || "[]") as StoredOrder[]);
    } catch { /* optional */ }
    void fetch("/api/profile").then(async (response) => response.ok ? response.json() : null).then((result: { profile?: Partial<Profile> } | null) => { if (result?.profile) setProfile((current) => ({ ...current, ...result.profile, email: user.email })); }).catch(() => undefined);
  }, [user.email]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    try { localStorage.setItem("fir-de-poveste-profile", JSON.stringify(profile)); } catch { /* optional */ }
    await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) }).catch(() => undefined);
    setSaved(true); window.setTimeout(() => setSaved(false), 2200);
  };

  return <main className="page-main account-page"><section className="account-hero"><div><p className="eyebrow">Contul meu</p><h1>Bine ai revenit, {profile.name.split(" ")[0]}.</h1><p>Aici găsești comenzile, favoritele și datele de livrare.</p></div><div className="account-avatar">{profile.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</div></section>
    <div className="account-layout"><aside className="account-nav"><button className={tab === "profil" ? "active" : ""} onClick={() => setTab("profil")}><UserRound /> Profil</button><button className={tab === "comenzi" ? "active" : ""} onClick={() => setTab("comenzi")}><Package /> Comenzi <b>{orders.length}</b></button><button className={tab === "adrese" ? "active" : ""} onClick={() => setTab("adrese")}><MapPin /> Adrese</button><Link href="/favorite"><Heart /> Favorite <b>{favorites.length}</b></Link><a className="sign-out" href={signOutPath} target="_top">Ieși din cont</a></aside>
      <section className="account-content">{tab === "profil" && <form onSubmit={save}><div className="account-content-head"><div><h2>Date personale</h2><p>Folosim aceste date doar pentru cont și comenzile tale.</p></div><button className="primary-button" type="submit">{saved ? <><Check /> Salvat</> : <><Save /> Salvează</>}</button></div><div className="form-grid"><label>Nume complet<input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label><label>Email<input value={profile.email} disabled /></label><label>Telefon<input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="07xx xxx xxx" /></label></div><div className="preference-box"><h3>Preferințe</h3><label><input type="checkbox" checked={profile.newsletter} onChange={(event) => setProfile({ ...profile, newsletter: event.target.checked })} /> Vreau să primesc noutăți rare din ateliere.</label><label><input type="checkbox" checked={profile.gifts} onChange={(event) => setProfile({ ...profile, gifts: event.target.checked })} /> Amintește-mi idei de cadouri înainte de ocazii.</label></div></form>}
        {tab === "comenzi" && <div><div className="account-content-head"><div><h2>Comenzile mele</h2><p>Istoricul plăților și starea livrărilor.</p></div></div>{orders.length ? <div className="order-history">{orders.map((order) => <article key={order.code}><span><small>Comandă</small><strong>{order.code}</strong></span><span><small>Dată</small><strong>{order.date}</strong></span><span><small>Total</small><strong>{money.format(order.total)}</strong></span><b>Plătită</b></article>)}</div> : <div className="account-empty"><Package /><h3>Nu ai nicio comandă încă</h3><p>Prima piesă cu poveste te așteaptă în catalog.</p><Link className="primary-button" href="/catalog">Vezi catalogul</Link></div>}</div>}
        {tab === "adrese" && <form onSubmit={save}><div className="account-content-head"><div><h2>Adresa implicită</h2><p>Va fi precompletată la următoarea comandă.</p></div><button className="primary-button" type="submit"><Save /> Salvează</button></div><div className="form-grid"><label className="wide">Adresă<input value={profile.address} onChange={(event) => setProfile({ ...profile, address: event.target.value })} placeholder="Stradă, număr, bloc, apartament" /></label><label>Oraș<input value={profile.city} onChange={(event) => setProfile({ ...profile, city: event.target.value })} /></label><label>Județ<input value={profile.county} onChange={(event) => setProfile({ ...profile, county: event.target.value })} /></label><label>Cod poștal<input value={profile.postalCode} onChange={(event) => setProfile({ ...profile, postalCode: event.target.value })} /></label></div></form>}
      </section>
    </div>
  </main>;
}
