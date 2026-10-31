"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, Boxes, LayoutTemplate, Store, CreditCard, Package } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { stateLabels, type StudioShop } from "@/lib/marketplace/contracts";
import { studioRequest } from "@/lib/marketplace/client";

type StudioContextValue = { shop: StudioShop; token: string };
const StudioContext = createContext<StudioContextValue | null>(null);
export function useStudio() {
  const context = useContext(StudioContext);
  if (!context) throw new Error("Studio context unavailable");
  return context;
}

export function StudioShell({ children }: { children: ReactNode }) {
  const { user, accessToken, loading } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const [shops, setShops] = useState<StudioShop[] | null>(null);
  const [dataOwner, setDataOwner] = useState<string | null>(null);
  const [shopId, setShopId] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!accessToken || !user) return;
    const controller = new AbortController();
    studioRequest<{ shops: StudioShop[] }>("/api/studio", accessToken, { signal: controller.signal }).then((result) => {
      if (controller.signal.aborted) return;
      setShops(result.shops);
      setDataOwner(user.id);
      const requested = new URLSearchParams(window.location.search).get("shop");
      setShopId(result.shops.some((shop) => shop.id === requested) ? requested! : result.shops[0]?.id || "");
      setError("");
    }).catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Studio indisponibil."); });
    return () => controller.abort();
  }, [accessToken, user]);
  if (loading) return <main className="page-main studio-loading" role="status">Se deschide atelierul…</main>;
  if (!user || !accessToken) return <main className="page-main studio-empty"><Store size={38} /><h1>Intră în atelier.</h1><p>Autentifică-te cu contul tău de creator.</p><Link className="primary-button" href="/cont?next=/studio">Intră în cont</Link></main>;
  if (error) return <main className="page-main studio-empty"><h1>Studio indisponibil</h1><p role="alert">{error}</p><button className="primary-button" onClick={() => window.location.reload()}>Reîncearcă</button></main>;
  if (!shops || dataOwner !== user.id) return <main className="page-main studio-loading" role="status">Se citesc atelierele tale…</main>;
  const shop = shops.find((item) => item.id === shopId);
  if (!shop) return <main className="page-main studio-empty"><p className="eyebrow">Un spațiu pentru ideile tale</p><h1>Prima ta colecție<br />începe aici.</h1><p>Deschide un atelier, apoi adaugă-i povestea și produsele.</p><Link className="primary-button" href="/sell">Creează un atelier <ArrowUpRight /></Link></main>;
  const links = [{ href: "/studio", label: "Atelier", icon: Store }, { href: "/studio/orders", label: "Comenzi", icon: Package }, { href: "/studio/payments", label: "Încasări", icon: CreditCard }, { href: "/studio/products", label: "Produse", icon: Boxes }, { href: "/studio/appearance", label: "Aspect & poveste", icon: LayoutTemplate }];
  return <main className="page-main studio-workspace"><aside className="studio-sidebar"><Link href="/studio" className="studio-wordmark">Studio<span>Faurio</span></Link><label className="studio-shop-select">Atelierul curent<select value={shopId} onChange={(event) => { setShopId(event.target.value); router.replace(`${path}?shop=${event.target.value}`); }}>{shops.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><span className={`studio-status status-${shop.status}`}>{stateLabels[shop.status]}</span><nav aria-label="Studio">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={`${href}?shop=${shopId}`} aria-current={path === href ? "page" : undefined}><Icon size={18} />{label}</Link>)}</nav><Link href={`/makers/${shop.slug}`} className="studio-public-link">Pagina publică <ArrowUpRight size={16} /></Link><Link href="/sell" className="studio-public-link">Adaugă un atelier</Link></aside><div className="studio-content"><StudioContext.Provider key={`${user.id}:${shop.id}`} value={{ shop, token: accessToken }}>{children}</StudioContext.Provider></div></main>;
}
