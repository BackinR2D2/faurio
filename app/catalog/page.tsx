import type { Metadata } from "next";
import { CatalogView } from "@/components/catalog-view";
import type { CatalogFilters } from "@/lib/catalog";
import { getCatalogProducts } from "@/lib/products";

export const metadata: Metadata = { title: "Catalog handmade", description: "Catalog de produse handmade, paginat și filtrat direct din baza de date." };
export const dynamic = "force-dynamic";

const number = (value: string | undefined) => value && Number.isFinite(Number(value)) ? Number(value) : undefined;

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const query = String(params.q || "").slice(0, 1200);
  const filters: CatalogFilters = {
    category: params.categorie, material: params.material, maxPrice: number(params.pret), minRating: number(params.rating),
    ready: params.rapid === "true", sort: (["relevanta", "pret-mic", "pret-mare", "rating", "nou"] as const).find((value) => value === params.sort),
  };
  const result = await getCatalogProducts({ query, page: number(params.page) || 1, filters });
  return <CatalogView {...result} initialQuery={query} filters={filters} />;
}
