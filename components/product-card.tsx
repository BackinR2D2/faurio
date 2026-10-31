"use client";

import Link from "next/link";
import Image from "next/image";
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
      <Link href={`/produs/${product.id}`} aria-label={`Vezi ${product.name}`}><Image src={product.image} alt={`${product.name}, produs handmade`} fill sizes="(max-width: 560px) 100vw, (max-width: 1100px) 50vw, 33vw" priority={priority} style={{ objectPosition: product.imagePosition || "center" }} /></Link>
      <button className="quick-add" disabled={product.stock < 1 || product.checkoutEligible === false} onClick={() => addToCart(product)}>{product.stock > 0 && product.checkoutEligible !== false && <Plus />} {product.checkoutEligible === false ? "Plăți încă neactivate" : product.stock > 0 ? "Adaugă în coș" : "Stoc epuizat"}</button>
    </div>
    <div className="product-meta"><span>{product.category} · {product.shopSlug ? <Link href={`/makers/${product.shopSlug}`}>{product.maker}</Link> : product.maker}</span>{product.reviews > 0 && <span><Star fill="currentColor" /> {product.rating} <small>({product.reviews})</small></span>}</div>
    <Link className="product-title" href={`/produs/${product.id}`}><strong>{product.name}</strong><ArrowUpRight /></Link>
    <div className="product-price"><b>{money.format(product.price)}</b>{product.oldPrice && <del>{money.format(product.oldPrice)}</del>}</div>
    {reasons.length > 0 && <div className="match-reasons">{reasons.map((reason) => <span key={reason}>{reason}</span>)}</div>}
  </article>;
}
