"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Heart, Minus, PackageCheck, Plus, RotateCcw, ShieldCheck, ShoppingBag, Star, Truck } from "lucide-react";
import { useShop } from "@/components/shop-provider";
import { money, type Product } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";

export function ProductDetail({ product, related }: { product: Product; related: Product[] }) {
  const { addToCart, favorites, toggleFavorite } = useShop();
  const [quantity, setQuantity] = useState(1);
  const [postcode, setPostcode] = useState("");
  const [delivery, setDelivery] = useState("");
  const saved = favorites.includes(product.id);
  return <main className="page-main product-page">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Acasă</Link><ChevronRight /><Link href="/catalog">Catalog</Link><ChevronRight /><span>{product.name}</span></nav>
    <section className="product-detail">
      <div className="product-gallery">
        <div className="gallery-main"><img src={product.image} alt={`${product.name}, vedere principală`} style={{ objectPosition: product.imagePosition || "center" }} /><span>Fiecare piesă are variații naturale</span></div>
        <div className="gallery-pair"><div><img src={product.image} alt={`${product.name}, detaliu material`} style={{ objectPosition: "20% center" }} /></div><div><img src={product.image} alt={`${product.name}, detaliu finisaj`} style={{ objectPosition: "80% center" }} /></div></div>
      </div>
      <div className="product-buy">
        <p className="eyebrow">{product.category} · {product.maker}, {product.makerLocation}</p>
        <h1>{product.name}</h1>
        <div className="detail-rating"><span><Star fill="currentColor" /> {product.rating}</span><a href="#recenzii">{product.reviews} recenzii verificate</a></div>
        <div className="detail-price">{money.format(product.price)} {product.oldPrice && <del>{money.format(product.oldPrice)}</del>}<small>TVA inclus</small></div>
        <p className="detail-description">{product.description}</p>
        <ul className="detail-highlights">{product.details.map((detail) => <li key={detail}><Check /> {detail}</li>)}</ul>
        <div className="stock-status"><i /><span><strong>{product.stock <= 3 ? `Doar ${product.stock} bucăți în stoc` : "În stoc"}</strong><small>Expediere în {product.days} {product.days === 1 ? "zi lucrătoare" : "zile lucrătoare"}</small></span></div>
        <div className="buy-row"><div className="quantity-control"><button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus /></button><b>{quantity}</b><button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}><Plus /></button></div><button className="primary-button" onClick={() => addToCart(product, quantity)}><ShoppingBag /> Adaugă · {money.format(product.price * quantity)}</button><button className={`save-big ${saved ? "saved" : ""}`} onClick={() => toggleFavorite(product.id)} aria-label="Salvează produsul"><Heart fill={saved ? "currentColor" : "none"} /></button></div>
        <div className="buy-assurances"><span><ShieldCheck /><b>Plată securizată</b><small>Stripe test / sandbox</small></span><span><RotateCcw /><b>Retur 14 zile</b><small>simplu și transparent</small></span><span><PackageCheck /><b>Ambalat cadou</b><small>fără plastic</small></span></div>
        <form className="delivery-check" onSubmit={(event) => { event.preventDefault(); setDelivery(postcode.length >= 4 ? `Estimare: ${product.days + 1}–${product.days + 2} zile lucrătoare` : "Introdu un cod poștal valid."); }}><Truck /><label><span>Verifică livrarea</span><input value={postcode} onChange={(event) => setPostcode(event.target.value)} inputMode="numeric" placeholder="Cod poștal" /></label><button>Calculează</button>{delivery && <small>{delivery}</small>}</form>
        <div className="product-accordions"><details open><summary>Materiale & dimensiuni</summary><p>{product.material}. {product.details.join(" · ")}.</p></details><details><summary>Îngrijire</summary><p>{product.care}</p></details><details><summary>Livrare & retur</summary><p>Livrare urmărită prin curier. Poți solicita returul în 14 zile pentru piesele nepersonalizate.</p></details></div>
      </div>
    </section>

    <section className="maker-story"><div><p className="eyebrow">Din atelier</p><h2>Urmele mâinii fac parte din obiect.</h2></div><blockquote>„{product.story}”<cite>{product.maker} · {product.makerLocation}</cite></blockquote></section>
    <section id="recenzii" className="reviews-section"><div className="review-score"><strong>{product.rating}</strong><span><i>{[1,2,3,4,5].map((item) => <Star key={item} fill="currentColor" />)}</i><b>Excelent</b><small>{product.reviews} recenzii ilustrative</small></span></div><article><div><b>AM</b><span><strong>Ana M.</strong><small>Achiziție verificată · acum 2 săptămâni</small></span></div><p>Obiectul arată atent lucrat, iar ambalajul a fost foarte frumos. Micile variații îl fac să pară cu adevărat personal.</p></article><article><div><b>IR</b><span><strong>Ioana R.</strong><small>Achiziție verificată · luna trecută</small></span></div><p>A ajuns la timp și a fost exact cadoul cald pe care îl căutam.</p></article></section>
    <section className="related-section"><div className="section-title"><p className="eyebrow">Poate îți plac și</p><h2>Din aceeași poveste</h2></div><div className="product-grid related-grid">{related.map((item) => <ProductCard key={item.id} product={item} />)}</div></section>
  </main>;
}
