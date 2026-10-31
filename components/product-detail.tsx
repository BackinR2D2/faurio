"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, ChevronRight, Heart, Minus, PackageCheck, Plus, RotateCcw, ShieldCheck, ShoppingBag, Star, Truck } from "lucide-react";
import { useShop } from "@/components/shop-provider";
import { money, type Product } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import productMedia from "@/lib/product-media.json";

export function ProductDetail({ product, related }: { product: Product; related: Product[] }) {
  const { addToCart, favorites, toggleFavorite } = useShop();
  const [quantity, setQuantity] = useState(1);
  const saved = favorites.includes(product.id);
  const illustrative = productMedia.some((item) => item.src === product.image);
  return <main className="page-main product-page">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Acasă</Link><ChevronRight /><Link href="/catalog">Catalog</Link><ChevronRight /><span>{product.name}</span></nav>
    <section className="product-detail">
      <div className="product-gallery">
        <div className="gallery-main"><Image src={product.image} alt={`${product.name}, vedere principală`} fill priority sizes="(max-width: 850px) 100vw, 60vw" style={{ objectPosition: product.imagePosition || "center" }} /><span>{illustrative ? "Imagine ilustrativă · colecție demonstrativă" : "Fiecare piesă are variații naturale"}</span></div>
      </div>
      <div className="product-buy">
        <p className="eyebrow">{product.category} · {product.shopSlug ? <Link href={`/makers/${product.shopSlug}`}>{product.maker}</Link> : product.maker}, {product.makerLocation}</p>
        <h1>{product.name}</h1>
        {product.reviews > 0 && <div className="detail-rating"><span><Star fill="currentColor" /> {product.rating}</span><a href="#recenzii">{product.reviews} recenzii</a></div>}
        <div className="detail-price">{money.format(product.price)} {product.oldPrice && <del>{money.format(product.oldPrice)}</del>}<small>Preț / bucată</small></div>
        <p className="detail-description">{product.description}</p>
        <ul className="detail-highlights">{product.details.map((detail) => <li key={detail}><Check /> {detail}</li>)}</ul>
        <div className="stock-status"><i /><span><strong>{product.stock < 1 ? "Stoc epuizat" : product.stock <= 3 ? `Doar ${product.stock} bucăți în stoc` : "În stoc"}</strong><small>{product.stock > 0 ? `Expediere în ${product.days} ${product.days === 1 ? "zi lucrătoare" : "zile lucrătoare"}` : "Poți salva produsul pentru mai târziu"}</small></span></div>
        {product.checkoutEligible === false && <p className="form-notice">Poți descoperi și salva această piesă. Atelierul își pregătește plățile online.</p>}
        <div className="buy-row"><div className="quantity-control"><button aria-label="Scade cantitatea" disabled={product.stock < 1} onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus /></button><b>{product.stock > 0 ? quantity : 0}</b><button aria-label="Crește cantitatea" disabled={product.stock < 1} onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}><Plus /></button></div><button className="primary-button" disabled={product.stock < 1 || product.checkoutEligible === false} onClick={() => addToCart(product, quantity)}><ShoppingBag /> {product.checkoutEligible === false ? "Plăți încă neactivate" : product.stock > 0 ? `Adaugă · ${money.format(product.price * quantity)}` : "Indisponibil"}</button><button className={`save-big ${saved ? "saved" : ""}`} onClick={() => toggleFavorite(product.id)} aria-label="Salvează produsul"><Heart fill={saved ? "currentColor" : "none"} /></button></div>
        <div className="buy-assurances"><span><ShieldCheck /><b>Plată securizată</b></span><span><RotateCcw /><b>Retur 14 zile</b></span><span><PackageCheck /><b>Ambalat cu grijă</b></span></div>
        <div className="delivery-check"><Truck /><p>Pregătire în {product.days} {product.days === 1 ? "zi lucrătoare" : "zile lucrătoare"}. Timpul de transport se confirmă separat, în funcție de destinație și curier.</p></div>
        <div className="product-accordions"><details open><summary>Materiale & dimensiuni</summary><p>{product.material}. {product.details.join(" · ")}.</p></details><details><summary>Îngrijire</summary><p>{product.care}</p></details><details><summary>Livrare & retur</summary><p>Livrare urmărită prin curier. Poți solicita returul în 14 zile pentru piesele nepersonalizate.</p></details></div>
      </div>
    </section>

    <section className="maker-story"><div><p className="eyebrow">Din atelier</p><h2>Făcut de mână.</h2></div><blockquote>„{product.story}”<cite>{product.maker} · {product.makerLocation}</cite></blockquote></section>
    <section className="related-section"><div className="section-title"><p className="eyebrow">Continuă să descoperi</p><h2>Poate îți plac</h2></div><div className="product-grid related-grid">{related.map((item) => <ProductCard key={item.id} product={item} />)}</div></section>
  </main>;
}
