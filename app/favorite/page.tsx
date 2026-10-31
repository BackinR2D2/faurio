"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { useShop } from "@/components/shop-provider";
import type { Product } from "@/lib/catalog";

export default function FavoritesPage() {
  const { favorites } = useShop();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!favorites.length) { queueMicrotask(() => { setProducts([]); setLoading(false); }); return; }
    queueMicrotask(() => setLoading(true));
    void fetch(`/api/products?ids=${encodeURIComponent(favorites.join(","))}`).then((response) => response.json()).then((data: { products?: Product[] }) => setProducts(data.products || [])).finally(() => setLoading(false));
  }, [favorites]);
  return <main className="page-main simple-list-page"><div className="page-heading"><p className="eyebrow">Lista ta</p><h1>Produse favorite</h1><p>Păstrează aici ideile la care vrei să revii.</p></div>{loading ? <div className="account-loading">Se încarcă…</div> : products.length ? <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><Heart /><h2>Nu ai salvat nimic încă</h2><p>Apasă inima de pe orice produs pentru a-l găsi rapid aici.</p><Link className="primary-button" href="/catalog">Vezi catalogul</Link></div>}</main>;
}
