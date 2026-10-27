import type { Metadata } from "next";
import { CatalogView } from "@/components/catalog-view";

export const metadata: Metadata = { title: "Catalog handmade", description: "Catalog de ceramică, textile, lumânări și obiecte handmade, cu filtre și căutare în limbaj natural." };
export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  return <CatalogView key={q} initialQuery={q.slice(0, 300)} />;
}
