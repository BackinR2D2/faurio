import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicShop } from "@/lib/marketplace/server";
import { getCatalogProducts } from "@/lib/products";
import { MakerStorefront } from "@/components/maker-storefront";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const shop = await getPublicShop((await params).slug);
  return shop ? { title: shop.name, description: shop.layout.subtitle, alternates: { canonical: `/makers/${shop.slug}` } } : { title: "Atelier indisponibil" };
}

export default async function MakerPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> }) {
  const shop = await getPublicShop((await params).slug);
  if (!shop) notFound();
  const page = Math.min(10000, Math.max(1, Math.trunc(Number((await searchParams).page) || 1)));
  const result = await getCatalogProducts({ page, filters: { shopId: shop.id } });
  return <main className="page-main"><MakerStorefront layout={shop.layout} name={shop.name} location={shop.location} country={shop.country} products={result.products} total={result.total} />{result.pageCount > 1 && <nav className="maker-page-links" aria-label="Piesele atelierului">{result.page > 1 && <Link href={`/makers/${shop.slug}?page=${result.page - 1}`}>← Înapoi</Link>}<span>{result.page} / {result.pageCount}</span>{result.page < result.pageCount && <Link href={`/makers/${shop.slug}?page=${result.page + 1}`}>Mai multe piese →</Link>}</nav>}</main>;
}
