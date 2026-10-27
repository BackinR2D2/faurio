"use client";

import Link from "next/link";
import { ArrowUpRight, Heart, Plus, Star } from "lucide-react";
import { useShop } from "@/components/shop-provider";
import { money, type Product } from "@/lib/catalog";

export function ProductCard({ product, reasons = [], priority = false }: { product: Product; reasons?: string[]; priority?: boolean }) {
  const { addToCart, favorites, toggleFavorite } = useShop();
  const saved = favorites.includes(product.id);
  return <article className="product-card">
    <div className="product-media">
      {product.badge && <span className="product-badge">{product.badge}</span>}
      <button className={`favorite-button ${saved ? "saved" : ""}`} onClick={() => toggleFavorite(product.id)} aria-label={saved ? "Elimină din favorite" : "Adaugă la favorite"}><Heart fill={saved ? "currentColor" : "none"} /></button>
      <Link href={`/produs/${product.id}`} aria-label={`Vezi ${product.name}`}><img src={product.image} alt={`${product.name}, produs handmade`} width="720" height="780" loading={priority ? "eager" : "lazy"} style={{ objectPosition: product.imagePosition || "center" }} /></Link>
      <button className="quick-add" onClick={() => addToCart(product)}><Plus /> Adaugă în coș</button>
    </div>
    <div className="product-meta"><span>{product.category} · {product.maker}</span><span><Star fill="currentColor" /> {product.rating} <small>({product.reviews})</small></span></div>
    <Link className="product-title" href={`/produs/${product.id}`}><strong>{product.name}</strong><ArrowUpRight /></Link>
    <div className="product-price"><b>{money.format(product.price)}</b>{product.oldPrice && <del>{money.format(product.oldPrice)}</del>}</div>
    {reasons.length > 0 && <div className="match-reasons">{reasons.map((reason) => <span key={reason}>{reason}</span>)}</div>}
  </article>;
}
