"use client";

import { FormEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleCheck,
  ClipboardList,
  CreditCard,
  Heart,
  Leaf,
  Menu,
  Minus,
  PackageCheck,
  Plus,
  ReceiptText,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Truck,
  Users,
  X,
} from "lucide-react";
import { categories, products, type Product } from "@/lib/catalog";

const ArtisanOrbit = dynamic(
  () => import("@/components/artisan-orbit").then((module) => module.ArtisanOrbit),
  { ssr: false },
);

type CartLine = { product: Product; quantity: number };
type SearchResponse = {
  ids: string[];
  summary: string[];
  filters: { category?: string; maxPrice?: number; ready?: boolean; material?: string };
};
type Invoice = {
  code: string;
  paymentId: string;
  date: string;
  total: number;
  discount: number;
  shipping: number;
  items: CartLine[];
  customer: { name: string; email: string; address: string };
  persisted: boolean;
};

const money = new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 });
const quickSearches = [
  "Un cadou de casă nouă sub 150 lei",
  "Ceva din ceramică, livrare rapidă",
  "Un cadou cald pentru o prietenă",
];

export function Storefront() {
  const pageRef = useRef<HTMLDivElement>(null);
  const catalogRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [category, setCategory] = useState<string>("Toate");
  const [maxPrice, setMaxPrice] = useState(250);
  const [material, setMaterial] = useState("Toate");
  const [readyOnly, setReadyOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [notice, setNotice] = useState("");
  const [inventory, setInventory] = useState<Record<string, number>>(
    Object.fromEntries(products.map((product) => [product.id, product.stock])),
  );

  useLayoutEffect(() => {
    const context = gsap.context(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;
      gsap.from(".hero-copy > *", { y: 28, opacity: 0, duration: 0.8, stagger: 0.09, ease: "power3.out" });
      gsap.from(".hero-visual", { scale: 0.86, opacity: 0, rotate: 3, duration: 1.15, ease: "power3.out", delay: 0.15 });
      gsap.from(".trust-item", { y: 16, opacity: 0, duration: 0.65, stagger: 0.08, delay: 0.65, ease: "power2.out" });
    }, pageRef);
    return () => context.revert();
  }, []);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("fir-de-poveste-cart");
      const savedFavorites = localStorage.getItem("fir-de-poveste-favorites");
      if (savedCart) setCart(JSON.parse(savedCart) as CartLine[]);
      if (savedFavorites) setFavorites(JSON.parse(savedFavorites) as string[]);
    } catch {
      // The storefront remains fully usable when browser storage is unavailable.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("fir-de-poveste-cart", JSON.stringify(cart));
      localStorage.setItem("fir-de-poveste-favorites", JSON.stringify(favorites));
    } catch {
      // Ignore storage restrictions in private browsing contexts.
    }
  }, [cart, favorites]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const filteredProducts = useMemo(() => {
    const ranking = searchResult?.ids || products.map((product) => product.id);
    return products
      .filter((product) => ranking.includes(product.id))
      .filter((product) => category === "Toate" || product.category === category)
      .filter((product) => product.price <= maxPrice)
      .filter((product) => material === "Toate" || product.material.includes(material))
      .filter((product) => !readyOnly || product.days <= 2)
      .sort((a, b) => ranking.indexOf(a.id) - ranking.indexOf(b.id));
  }, [category, material, maxPrice, readyOnly, searchResult]);

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discount = couponApplied ? Math.round(subtotal * 0.1) : 0;
  const shipping = subtotal >= 250 || subtotal === 0 ? 0 : 19;
  const grandTotal = subtotal - discount + shipping;

  const scrollToCatalog = () => catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const submitSearch = async (event?: FormEvent, override?: string) => {
    event?.preventDefault();
    const nextQuery = (override ?? query).trim();
    if (!nextQuery) return;
    setQuery(nextQuery);
    setSearching(true);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: nextQuery }),
      });
      const result = (await response.json()) as SearchResponse;
      setSearchResult(result);
      if (result.filters.category) setCategory(result.filters.category);
      if (result.filters.maxPrice) setMaxPrice(Math.min(250, result.filters.maxPrice));
      if (result.filters.ready) setReadyOnly(true);
      if (result.filters.material) setMaterial(result.filters.material);
      window.setTimeout(scrollToCatalog, 80);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchResult(null);
    setQuery("");
    setCategory("Toate");
    setMaxPrice(250);
    setMaterial("Toate");
    setReadyOnly(false);
  };

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) => item.product.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, inventory[product.id]) } : item);
      }
      return [...current, { product, quantity: 1 }];
    });
    setNotice(`${product.name} este acum în coș.`);
  };

  const changeQuantity = (id: string, delta: number) => {
    setCart((current) => current
      .map((item) => item.product.id === id ? { ...item, quantity: Math.min(inventory[id], item.quantity + delta) } : item)
      .filter((item) => item.quantity > 0));
  };

  const applyCoupon = () => {
    const accepted = coupon.trim().toUpperCase() === "POVESTE10";
    setCouponApplied(accepted);
    setNotice(accepted ? "Codul POVESTE10 a fost aplicat." : "Codul nu este valid. Încearcă POVESTE10.");
  };

  const toggleFavorite = (id: string) => {
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  return (
    <div ref={pageRef} className="site-shell">
      <a className="skip-link" href="#catalog">Sari la catalog</a>
      <header className="site-header">
        <a className="brand" href="#acasa" aria-label="Fir de Poveste, pagina principală">
          <span className="brand-mark"><span /></span>
          <span className="brand-copy"><strong>Fir de Poveste</strong><small>făcut încet, ales cu sens</small></span>
        </a>
        <nav className={menuOpen ? "main-nav is-open" : "main-nav"} aria-label="Navigare principală">
          <a href="#catalog" onClick={() => setMenuOpen(false)}>Descoperă</a>
          <a href="#ateliere" onClick={() => setMenuOpen(false)}>Ateliere</a>
          <a href="#poveste" onClick={() => setMenuOpen(false)}>Povestea noastră</a>
        </nav>
        <div className="header-actions">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen((value) => !value)} aria-label="Deschide meniul"><Menu size={20} /></button>
          <button className="text-button saved-button" onClick={() => { setCategory("Toate"); setSearchResult({ ids: favorites, summary: ["produsele tale salvate"], filters: {} }); scrollToCatalog(); }}>
            <Heart size={18} /> <span>Salvate</span>{favorites.length > 0 && <b>{favorites.length}</b>}
          </button>
          <button className="cart-button" onClick={() => setCartOpen(true)}><ShoppingBag size={18} /> Coș <b>{itemCount}</b></button>
        </div>
      </header>

      <main>
        <section id="acasa" className="hero-section">
          <div className="hero-grain" />
          <div className="hero-copy">
            <p className="eyebrow"><Sparkles size={15} /> Piese mici, povești adevărate</p>
            <h1>Ce ai vrea să<br /><em>găsești astăzi?</em></h1>
            <p className="hero-intro">Spune-ne în cuvintele tale. Noi căutăm prin ateliere, materiale și povești — ca să ajungi mai repede la obiectul potrivit.</p>
            <form className="natural-search" onSubmit={submitSearch}>
              <Search size={22} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ex. un cadou pentru casă nouă, sub 150 lei"
                aria-label="Descrie produsul handmade pe care îl cauți"
              />
              <button type="submit" disabled={searching} aria-label="Caută">{searching ? <span className="loader" /> : <ArrowRight size={21} />}</button>
            </form>
            <div className="quick-searches" aria-label="Exemple de căutare">
              <span>Încearcă:</span>
              {quickSearches.map((item) => <button key={item} onClick={() => void submitSearch(undefined, item)}>{item}</button>)}
            </div>
          </div>
          <div className="hero-visual">
            <div className="orbit-halo" />
            <ArtisanOrbit />
            <div className="floating-note note-one"><span>01</span><strong>modelat</strong><small>cu mâna</small></div>
            <div className="floating-note note-two"><span>02</span><strong>ales</strong><small>pentru tine</small></div>
            <p className="drag-hint">mișcă ușor cursorul <span>↗</span></p>
          </div>
        </section>

        <section className="trust-strip" aria-label="Avantajele magazinului">
          <div className="trust-item"><Leaf /><span><strong>Creat local</strong><small>de artizani independenți</small></span></div>
          <div className="trust-item"><PackageCheck /><span><strong>Ambalat cu grijă</strong><small>materiale reciclabile</small></span></div>
          <div className="trust-item"><ShieldCheck /><span><strong>Plată sigură</strong><small>checkout protejat</small></span></div>
          <div className="trust-item"><Truck /><span><strong>Livrare urmărită</strong><small>1–4 zile lucrătoare</small></span></div>
        </section>

        <section ref={catalogRef} id="catalog" className="catalog-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Selecție curatorială</p>
              <h2>{searchResult ? "Potriviri pentru tine" : "Obiecte cu rost"}</h2>
              {searchResult ? (
                <p className="search-understanding"><Sparkles size={15} /> Am înțeles: {searchResult.summary.length ? searchResult.summary.join(" · ") : "o selecție handmade potrivită"}. <button onClick={clearSearch}>Resetează</button></p>
              ) : <p>Fiecare piesă este realizată în serie mică și verificată înainte de expediere.</p>}
            </div>
            <button className="filter-toggle" onClick={() => setFiltersOpen((value) => !value)}><SlidersHorizontal size={17} /> Filtre</button>
          </div>

          <div className="category-tabs" role="tablist" aria-label="Categorii produse">
            {categories.map((item) => (
              <button key={item} role="tab" aria-selected={category === item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>
            ))}
          </div>

          <div className="catalog-layout">
            <aside className={filtersOpen ? "filters-panel is-open" : "filters-panel"}>
              <div className="filters-title"><strong>Filtre precise</strong><button onClick={() => setFiltersOpen(false)} aria-label="Închide filtrele"><X size={18} /></button></div>
              <label className="range-label"><span>Preț maxim</span><strong>{money.format(maxPrice)}</strong></label>
              <input className="price-range" type="range" min="70" max="250" step="10" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} />
              <fieldset>
                <legend>Material</legend>
                {["Toate", "ceramică", "in", "ceară de soia", "compozit mineral"].map((item) => (
                  <label key={item} className="radio-filter"><input type="radio" name="material" checked={material === item} onChange={() => setMaterial(item)} /><span>{item}</span></label>
                ))}
              </fieldset>
              <label className="switch-filter"><span><strong>Gata de expediere</strong><small>livrare în maximum 2 zile</small></span><input type="checkbox" checked={readyOnly} onChange={(event) => setReadyOnly(event.target.checked)} /><i /></label>
              <button className="reset-filters" onClick={clearSearch}>Resetează toate filtrele</button>
            </aside>

            <div className="catalog-results">
              <div className="results-meta"><span>{filteredProducts.length} rezultate</span><span>ordonate după relevanță</span></div>
              {filteredProducts.length ? (
                <div className="product-grid">
                  {filteredProducts.map((product, index) => (
                    <article className="product-card" key={product.id} style={{ "--delay": `${index * 45}ms` } as React.CSSProperties}>
                      <div className="product-image-wrap">
                        {product.badge && <span className="product-badge">{product.badge}</span>}
                        <button className={favorites.includes(product.id) ? "favorite active" : "favorite"} onClick={() => toggleFavorite(product.id)} aria-label={favorites.includes(product.id) ? "Elimină de la favorite" : "Adaugă la favorite"}><Heart size={18} fill={favorites.includes(product.id) ? "currentColor" : "none"} /></button>
                        <button className="image-button" onClick={() => setSelected(product)} aria-label={`Vezi detalii pentru ${product.name}`}>
                          <img src={product.image} alt={`${product.name}, produs handmade demonstrativ`} loading="lazy" width="600" height="600" style={{ objectPosition: product.imagePosition || "center" }} />
                        </button>
                        <button className="quick-add" onClick={() => addToCart(product)}><Plus size={17} /> Adaugă rapid</button>
                      </div>
                      <div className="product-info">
                        <div className="product-maker">{product.category} · {product.maker}</div>
                        <button className="product-name" onClick={() => setSelected(product)}>{product.name}</button>
                        <div className="product-bottom">
                          <span className="price">{money.format(product.price)} {product.oldPrice && <del>{money.format(product.oldPrice)}</del>}</span>
                          <span className="rating"><Star size={14} fill="currentColor" /> {product.rating} <small>({product.reviews})</small></span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-results"><Search /><h3>N-am găsit o potrivire exactă</h3><p>Încearcă să mărești bugetul sau să elimini un filtru.</p><button onClick={clearSearch}>Arată tot catalogul</button></div>
              )}
            </div>
          </div>
        </section>

        <section id="poveste" className="story-section">
          <div className="story-visual">
            <div className="story-number">23</div>
            <p>de ateliere mici<br />adunate într-un singur loc</p>
            <div className="stitch-line" />
          </div>
          <div className="story-copy">
            <p className="eyebrow">De ce Fir de Poveste</p>
            <h2>Mai puține lucruri.<br /><em>Mai multă legătură.</em></h2>
            <p>Nu vrem să umplem rafturi. Vrem să te ajutăm să găsești un obiect făcut bine, de un om real, pe care să-l păstrezi mult timp.</p>
            <a href="#ateliere">Cum alegem atelierele <ArrowUpRight size={17} /></a>
          </div>
        </section>

        <section id="ateliere" className="makers-section">
          <div className="section-heading"><div><p className="eyebrow">Oamenii din spatele obiectelor</p><h2>Făcut de mâini, nu de fabrici</h2></div><button onClick={() => { setCategory("Toate"); scrollToCatalog(); }}>Vezi toate piesele <ArrowRight size={17} /></button></div>
          <div className="maker-list">
            <article><span>01</span><div><strong>Atelier Lut Bun</strong><small>Cluj-Napoca · ceramică</small></div><p>„Urmele mâinii nu sunt defecte. Sunt semnătura obiectului.”</p><ChevronRight /></article>
            <article><span>02</span><div><strong>Mâini de In</strong><small>Brașov · broderie</small></div><p>„Brodez plantele pe care le întâlnesc în drumurile mele.”</p><ChevronRight /></article>
            <article><span>03</span><div><strong>Foc Domol</strong><small>Sibiu · lumânări</small></div><p>„Parfumul trebuie să rămână în memorie, nu să ocupe camera.”</p><ChevronRight /></article>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-brand"><span className="brand-mark"><span /></span><div><strong>Fir de Poveste</strong><p>Marketplace B2C demonstrativ pentru produse handmade.</p></div></div>
        <div><strong>Magazin</strong><a href="#catalog">Catalog</a><a href="#ateliere">Ateliere</a><button onClick={() => setAdminOpen(true)}>Administrare demo</button></div>
        <div><strong>Ajutor</strong><a href="#livrare">Livrare și retur</a><a href="#plata">Plată sigură</a><a href="mailto:salut@firdepoveste.ro">Contact</a></div>
        <div className="footer-newsletter"><strong>Scrisori rare, obiecte frumoase</strong><form onSubmit={(event) => { event.preventDefault(); setNotice("Mulțumim! Te-am trecut pe listă."); }}><input type="email" required placeholder="adresa@email.ro" aria-label="Adresa de email" /><button aria-label="Abonează-te"><ArrowRight /></button></form><small>O dată pe lună. Fără zgomot.</small></div>
        <p className="footer-legal">© 2026 Fir de Poveste · Proiect academic · Produsele și tranzacțiile sunt demonstrative</p>
      </footer>

      {notice && <div className="toast" role="status"><CircleCheck size={18} />{notice}</div>}

      <div className={cartOpen ? "drawer-backdrop is-open" : "drawer-backdrop"} onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}>
        <aside className="cart-drawer" aria-label="Coș de cumpărături">
          <div className="drawer-head"><div><p>Coșul tău</p><small>{itemCount} {itemCount === 1 ? "produs" : "produse"}</small></div><button onClick={() => setCartOpen(false)} aria-label="Închide coșul"><X /></button></div>
          {cart.length ? <>
            <div className="cart-lines">{cart.map((item) => <div className="cart-line" key={item.product.id}><img src={item.product.image} alt="" style={{ objectPosition: item.product.imagePosition || "center" }} /><div><strong>{item.product.name}</strong><small>{item.product.maker}</small><span>{money.format(item.product.price)}</span><div className="quantity"><button onClick={() => changeQuantity(item.product.id, -1)} aria-label="Scade cantitatea"><Minus /></button><b>{item.quantity}</b><button onClick={() => changeQuantity(item.product.id, 1)} disabled={item.quantity >= inventory[item.product.id]} aria-label="Crește cantitatea"><Plus /></button></div></div></div>)}</div>
            <div className="coupon-row"><input value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="Cod promo: POVESTE10" /><button onClick={applyCoupon}>{couponApplied ? <Check /> : "Aplică"}</button></div>
            <div className="cart-totals"><p><span>Produse</span><strong>{money.format(subtotal)}</strong></p>{couponApplied && <p className="discount"><span>Reducere 10%</span><strong>− {money.format(discount)}</strong></p>}<p><span>Livrare</span><strong>{shipping ? money.format(shipping) : "Gratuit"}</strong></p><p className="grand"><span>Total</span><strong>{money.format(grandTotal)}</strong></p><small>TVA inclus. Livrare gratuită peste 250 lei.</small></div>
            <button className="primary-cta checkout-button" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}><CreditCard /> Continuă spre plată <ArrowRight /></button>
          </> : <div className="empty-cart"><ShoppingBag /><h3>Coșul așteaptă o poveste</h3><p>Adaugă o piesă lucrată manual, iar noi o păstrăm aici.</p><button onClick={() => { setCartOpen(false); scrollToCatalog(); }}>Descoperă catalogul</button></div>}
        </aside>
      </div>

      {selected && <ProductDialog product={selected} onClose={() => setSelected(null)} onAdd={() => { addToCart(selected); setSelected(null); }} inventory={inventory[selected.id]} favorite={favorites.includes(selected.id)} onFavorite={() => toggleFavorite(selected.id)} />}
      {checkoutOpen && <CheckoutDialog cart={cart} subtotal={subtotal} discount={discount} shipping={shipping} total={grandTotal} onClose={() => setCheckoutOpen(false)} onComplete={(result) => { setCheckoutOpen(false); setCart([]); setInvoice(result); }} />}
      {invoice && <InvoiceDialog invoice={invoice} onClose={() => setInvoice(null)} />}
      {adminOpen && <AdminDialog inventory={inventory} setInventory={setInventory} onClose={() => setAdminOpen(false)} />}
    </div>
  );
}

function ProductDialog({ product, onClose, onAdd, inventory, favorite, onFavorite }: { product: Product; onClose: () => void; onAdd: () => void; inventory: number; favorite: boolean; onFavorite: () => void }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="product-dialog" role="dialog" aria-modal="true" aria-label={`Detalii ${product.name}`}>
    <button className="modal-close" onClick={onClose} aria-label="Închide"><X /></button>
    <div className="dialog-image"><img src={product.image} alt={`${product.name}, imagine demonstrativă`} style={{ objectPosition: product.imagePosition || "center" }} /><span>Imagine de produs generată pentru demonstrație</span></div>
    <div className="dialog-copy"><p className="eyebrow">{product.category} · {product.maker}</p><h2>{product.name}</h2><div className="dialog-rating"><Star fill="currentColor" /> {product.rating} <span>din {product.reviews} recenzii demo</span></div><p className="dialog-description">{product.description}</p><ul>{product.details.map((detail) => <li key={detail}><Check />{detail}</li>)}</ul><div className="stock-line"><span className={inventory <= 3 ? "low" : ""}>{inventory <= 3 ? `Doar ${inventory} în stoc` : `${inventory} în stoc`}</span><span>expediere în {product.days} {product.days === 1 ? "zi" : "zile"}</span></div><div className="dialog-price">{money.format(product.price)} {product.oldPrice && <del>{money.format(product.oldPrice)}</del>}</div><div className="dialog-actions"><button className="favorite-large" onClick={onFavorite}><Heart fill={favorite ? "currentColor" : "none"} />{favorite ? "Salvat" : "Salvează"}</button><button className="primary-cta" onClick={onAdd} disabled={!inventory}><ShoppingBag /> Adaugă în coș</button></div><small className="secure-note"><ShieldCheck /> Plată sandbox securizată · retur demonstrativ 14 zile</small></div>
  </section></div>;
}

function CheckoutDialog({ cart, subtotal, discount, shipping, total, onClose, onComplete }: { cart: CartLine[]; subtotal: number; discount: number; shipping: number; total: number; onClose: () => void; onComplete: (invoice: Invoice) => void }) {
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [customer, setCustomer] = useState({ name: "", email: "", address: "" });
  const [card, setCard] = useState("4242 4242 4242 4242");

  const pay = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const cleanCard = card.replace(/\s/g, "");
    if (cleanCard !== "4242424242424242") {
      setError("În modul demonstrativ folosește cardul de test 4242 4242 4242 4242.");
      return;
    }
    setProcessing(true);
    try {
      const checkoutResponse = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart.map((item) => ({ id: item.product.id, quantity: item.quantity })), email: customer.email, origin: window.location.origin }),
      });
      const checkout = (await checkoutResponse.json()) as { mode?: string; url?: string; paymentId?: string; error?: string };
      if (!checkoutResponse.ok) throw new Error(checkout.error || "Plata nu a putut fi inițializată.");
      if (checkout.mode === "stripe" && checkout.url) {
        window.location.assign(checkout.url);
        return;
      }
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer, items: cart.map((item) => ({ id: item.product.id, name: item.product.name, quantity: item.quantity, price: item.product.price })), total, paymentId: checkout.paymentId }),
      });
      const order = (await orderResponse.json()) as { orderCode?: string; persisted?: boolean; error?: string };
      if (!orderResponse.ok) throw new Error(order.error || "Comanda nu a putut fi înregistrată.");
      const invoice: Invoice = { code: order.orderCode || "FDP-DEMO", paymentId: checkout.paymentId || "pi_test_demo", date: new Date().toLocaleString("ro-RO"), total, discount, shipping, items: cart, customer, persisted: Boolean(order.persisted) };
      try {
        const orders = JSON.parse(localStorage.getItem("fir-de-poveste-orders") || "[]") as Invoice[];
        localStorage.setItem("fir-de-poveste-orders", JSON.stringify([invoice, ...orders].slice(0, 20)));
      } catch { /* browser storage is optional */ }
      onComplete(invoice);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "A apărut o eroare.");
    } finally {
      setProcessing(false);
    }
  };

  return <div className="modal-backdrop"><section className="checkout-dialog" role="dialog" aria-modal="true" aria-label="Finalizare comandă">
    <button className="modal-close" onClick={onClose} aria-label="Închide"><X /></button>
    <div className="checkout-main"><div className="checkout-logo"><span className="brand-mark"><span /></span><strong>Finalizare comandă</strong></div><div className="checkout-steps"><span className={step >= 1 ? "active" : ""}>1 <b>Date</b></span><i /><span className={step >= 2 ? "active" : ""}>2 <b>Plată</b></span></div>
      {step === 1 ? <form className="checkout-form" onSubmit={(event) => { event.preventDefault(); setStep(2); }}><h2>Unde trimitem povestea?</h2><label>Nume complet<input required value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} placeholder="Ana Popescu" autoComplete="name" /></label><label>Email<input required type="email" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} placeholder="ana@email.ro" autoComplete="email" /></label><label>Adresa de livrare<textarea required value={customer.address} onChange={(event) => setCustomer({ ...customer, address: event.target.value })} placeholder="Stradă, număr, oraș, județ" /></label><button className="primary-cta" type="submit">Continuă la plată <ArrowRight /></button></form> : <form className="checkout-form" onSubmit={pay}><button type="button" className="back-step" onClick={() => setStep(1)}>← Înapoi la date</button><h2>Plată electronică de test</h2><div className="sandbox-banner"><ShieldCheck /><span><strong>Mod sandbox activ</strong><small>Nu se retrag bani și nu se stochează date bancare.</small></span></div><label>Numărul cardului<input required inputMode="numeric" value={card} onChange={(event) => setCard(event.target.value)} /></label><div className="split-fields"><label>Expiră<input required defaultValue="12/34" /></label><label>CVC<input required defaultValue="123" /></label></div><p className="test-hint">Card test: <button type="button" onClick={() => setCard("4242 4242 4242 4242")}>4242 4242 4242 4242</button></p>{error && <p className="form-error">{error}</p>}<button className="primary-cta" type="submit" disabled={processing}>{processing ? <><span className="loader" /> Se verifică plata…</> : <><CreditCard /> Plătește {money.format(total)}</>}</button></form>}
    </div>
    <aside className="checkout-summary"><h3>Comanda ta</h3>{cart.map((item) => <div className="summary-line" key={item.product.id}><div><img src={item.product.image} alt="" /><b>{item.quantity}</b></div><span><strong>{item.product.name}</strong><small>{item.product.maker}</small></span><em>{money.format(item.product.price * item.quantity)}</em></div>)}<div className="summary-totals"><p><span>Subtotal</span><strong>{money.format(subtotal)}</strong></p>{discount > 0 && <p className="discount"><span>Reducere</span><strong>− {money.format(discount)}</strong></p>}<p><span>Livrare</span><strong>{shipping ? money.format(shipping) : "Gratuit"}</strong></p><p className="grand"><span>Total</span><strong>{money.format(total)}</strong></p></div><small><Leaf /> Ambalaj fără plastic, pregătit cu grijă.</small></aside>
  </section></div>;
}

function InvoiceDialog({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const vat = invoice.total - invoice.total / 1.19;
  return <div className="modal-backdrop"><section className="invoice-dialog" role="dialog" aria-modal="true" aria-label="Factura comenzii"><div className="success-head"><CircleCheck /><div><p>Plată de test reușită</p><h2>Mulțumim, {invoice.customer.name.split(" ")[0]}!</h2><span>Comanda {invoice.code} a fost înregistrată.</span></div><button onClick={onClose} aria-label="Închide"><X /></button></div><div className="invoice-paper"><div className="invoice-title"><div><span className="brand-mark"><span /></span><strong>Fir de Poveste</strong></div><div><b>FACTURĂ</b><small>{invoice.code}<br />{invoice.date}</small></div></div><div className="invoice-parties"><p><small>FURNIZOR</small><strong>Fir de Poveste SRL — date demonstrative</strong><span>CUI RO-DEMO · Cluj-Napoca</span></p><p><small>CLIENT</small><strong>{invoice.customer.name}</strong><span>{invoice.customer.email}<br />{invoice.customer.address}</span></p></div><table><thead><tr><th>Articol</th><th>Cant.</th><th>Preț</th><th>Valoare</th></tr></thead><tbody>{invoice.items.map((item) => <tr key={item.product.id}><td>{item.product.name}</td><td>{item.quantity}</td><td>{money.format(item.product.price)}</td><td>{money.format(item.product.price * item.quantity)}</td></tr>)}{invoice.shipping > 0 && <tr><td>Livrare</td><td>1</td><td>{money.format(invoice.shipping)}</td><td>{money.format(invoice.shipping)}</td></tr>}{invoice.discount > 0 && <tr><td>Reducere POVESTE10</td><td>1</td><td>− {money.format(invoice.discount)}</td><td>− {money.format(invoice.discount)}</td></tr>}</tbody></table><div className="invoice-total"><p>Bază impozabilă <b>{money.format(invoice.total - vat)}</b></p><p>TVA 19% inclus <b>{money.format(vat)}</b></p><p>Total plătit <b>{money.format(invoice.total)}</b></p></div><div className="payment-proof"><CreditCard /><span>Plată electronică sandbox<br /><small>{invoice.paymentId}</small></span><b>ACHITAT</b></div><p className="persistence-note">{invoice.persisted ? "Comanda este salvată în Supabase." : "Mod demo: comanda este păstrată local în acest browser."}</p></div><div className="invoice-actions"><button onClick={() => window.print()}><ReceiptText /> Tipărește / salvează PDF</button><button className="primary-cta" onClick={onClose}>Continuă cumpărăturile</button></div></section></div>;
}

function AdminDialog({ inventory, setInventory, onClose }: { inventory: Record<string, number>; setInventory: React.Dispatch<React.SetStateAction<Record<string, number>>>; onClose: () => void }) {
  const [tab, setTab] = useState<"catalog" | "orders" | "users">("catalog");
  const [orders, setOrders] = useState<Invoice[]>([]);
  useEffect(() => {
    try { setOrders(JSON.parse(localStorage.getItem("fir-de-poveste-orders") || "[]") as Invoice[]); } catch { setOrders([]); }
  }, []);
  return <div className="modal-backdrop"><section className="admin-dialog" role="dialog" aria-modal="true" aria-label="Administrare magazin"><aside><div className="admin-brand"><span className="brand-mark"><span /></span><div><strong>Fir de Poveste</strong><small>administrare demo</small></div></div><button className={tab === "catalog" ? "active" : ""} onClick={() => setTab("catalog")}><Settings2 /> Catalog</button><button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}><ClipboardList /> Comenzi <b>{orders.length}</b></button><button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}><Users /> Utilizatori</button><small>Mod academic · modificările de stoc rămân în sesiunea curentă.</small></aside><main><div className="admin-head"><div><p>Panou administrativ</p><h2>{tab === "catalog" ? "Catalog și stocuri" : tab === "orders" ? "Comenzi înregistrate" : "Clienți"}</h2></div><button onClick={onClose}><X /></button></div>
    {tab === "catalog" && <div className="admin-products"><div className="admin-stats"><span><small>Produse active</small><strong>{products.length}</strong></span><span><small>Unități în stoc</small><strong>{Object.values(inventory).reduce((sum, value) => sum + value, 0)}</strong></span><span><small>Stoc redus</small><strong>{Object.values(inventory).filter((value) => value <= 3).length}</strong></span></div><div className="admin-table-head"><span>Produs</span><span>Preț</span><span>Stoc</span><span>Status</span></div>{products.map((product) => <div className="admin-product" key={product.id}><span><img src={product.image} alt="" /><i><strong>{product.name}</strong><small>{product.category}</small></i></span><span>{money.format(product.price)}</span><span className="admin-quantity"><button onClick={() => setInventory((current) => ({ ...current, [product.id]: Math.max(0, current[product.id] - 1) }))}><Minus /></button><b>{inventory[product.id]}</b><button onClick={() => setInventory((current) => ({ ...current, [product.id]: current[product.id] + 1 }))}><Plus /></button></span><span className={inventory[product.id] <= 3 ? "status low" : "status"}>{inventory[product.id] === 0 ? "Epuizat" : inventory[product.id] <= 3 ? "Stoc redus" : "Activ"}</span></div>)}</div>}
    {tab === "orders" && (orders.length ? <div className="orders-list">{orders.map((order) => <article key={order.code}><span><small>Comandă</small><strong>{order.code}</strong></span><span><small>Client</small><strong>{order.customer.name}</strong></span><span><small>Total</small><strong>{money.format(order.total)}</strong></span><b>Plătită</b></article>)}</div> : <div className="admin-empty"><ClipboardList /><h3>Nicio comandă încă</h3><p>Finalizează o plată sandbox pentru a vedea comanda aici.</p></div>)}
    {tab === "users" && <div className="users-demo"><article><span>AP</span><div><strong>Ana Popescu</strong><small>ana@example.ro · client demo</small></div><b>2 comenzi</b></article><article><span>MR</span><div><strong>Mihai Radu</strong><small>mihai@example.ro · client demo</small></div><b>1 comandă</b></article><p>Date ilustrative. În configurația completă, conturile și comenzile sunt gestionate prin Supabase Row Level Security.</p></div>}
  </main></section></div>;
}
