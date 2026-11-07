import type { Metadata } from "next";
import { CatalogView } from "@/components/catalog-view";
import { categories, materials } from "@/lib/catalog";
import { parseCatalogFilters, visibleCatalogFilters } from "@/lib/catalog-filters";
import { getCatalogProducts } from "@/lib/products";
import { getCatalogFilterOptions } from "@/lib/search/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Catalog handmade", description: "Catalog de produse handmade, paginat și filtrat direct din baza de date." };
export const dynamic = "force-dynamic";

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = (typeof params.q === "string" ? params.q : "").slice(0, 1200);
  const manualFilters = parseCatalogFilters(params);
  const admin = getSupabaseAdmin();
  const [result, inventory] = await Promise.all([
    getCatalogProducts({ query, page: Number(params.page) || 1, filters: manualFilters }),
    admin ? getCatalogFilterOptions(admin).catch(() => null) : null,
  ]);
  const options = {
    categories: [...new Set([...categories.slice(1), ...(inventory?.categories || [])])],
    materials: [...new Set([...materials.slice(1), ...(inventory?.materials || [])])],
    productTypes: inventory?.productTypes || [], typeCategories: inventory?.typeCategories || {},
  };
  const filters = visibleCatalogFilters(manualFilters, result.intent, options);
  return <CatalogView {...result} initialQuery={query} filters={filters} manualFilters={manualFilters} options={options} />;
}
