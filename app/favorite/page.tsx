"use client";
import Link from "next/link";
import { Heart } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { useShop } from "@/components/shop-provider";
import { products } from "@/lib/catalog";
export default function FavoritesPage() { const { favorites } = useShop(); const saved = products.filter((product) => favorites.includes(product.id)); return <main className="page-main simple-list-page"><div className="page-heading"><p className="eyebrow">Lista ta</p><h1>Produse favorite</h1><p>Păstrează aici ideile la care vrei să revii.</p></div>{saved.length ? <div className="product-grid">{saved.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><Heart /><h2>Nu ai salvat nimic încă</h2><p>Apasă inima de pe orice produs pentru a-l găsi rapid aici.</p><Link className="primary-button" href="/catalog">Vezi catalogul</Link></div>}</main>; }
