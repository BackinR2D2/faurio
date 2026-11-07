import type { CatalogFilters } from "./catalog";
import type { ResolvedIntent } from "./search/ai";

export type CatalogFilterOptions = { categories: string[]; materials: string[]; productTypes: string[]; typeCategories: Record<string, string[]> };
type Params = Record<string, string | string[] | undefined>;
const values = (value: string | string[] | undefined) => [...new Set((Array.isArray(value) ? value : value ? [value] : []).map(item => item.trim()).filter(item => item !== "Toate" && /^[^\u0000-\u001f\u007f]{1,160}$/u.test(item)))].slice(0, 32);
const number = (value: string | string[] | undefined) => typeof value === "string" && value.trim() && Number.isFinite(Number(value)) && Number(value) >= 0 ? Math.min(100000, Number(value)) : undefined;
export const selectedCategories = (filters: CatalogFilters) => filters.categories ?? values(filters.category);
export const selectedMaterials = (filters: CatalogFilters) => filters.materials ?? values(filters.material);
export const catalogStringList = (items: string[]) => `(${items.map(item => JSON.stringify(item)).join(",")})`;
export const catalogMaterialOr = (items: string[]) => items.map(item => {
  const pattern = item === "in" ? "(^|[^[:alnum:]])in([^[:alnum:]]|$)" : item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return `material.imatch.${JSON.stringify(pattern)}`;
}).join(",");

export function parseCatalogFilters(params: Params): CatalogFilters {
  return {
    categories: values(params.categorie), materials: values(params.material), productTypes: values(params.tip),
    minPrice: number(params.pretMin), maxPrice: number(params.pret), minRating: number(params.rating),
    ready: params.rapid === "true", sort: (["relevanta", "pret-mic", "pret-mare", "rating", "nou"] as const).find(value => value === params.sort),
  };
}

export function visibleCatalogFilters(manual: CatalogFilters, intent: ResolvedIntent | null, options: CatalogFilterOptions): CatalogFilters {
  const detected = intent && !intent.failure && !intent.unsupported ? intent : null;
  const types = manual.productTypes?.length ? manual.productTypes : detected?.productTypes || [];
  const categories = selectedCategories(manual);
  const materials = selectedMaterials(manual);
  const maximums = [manual.maxPrice, detected?.filters.maxPrice].filter((value): value is number => value !== undefined);
  const minimums = [manual.minPrice, detected?.filters.minPrice].filter((value): value is number => value !== undefined);
  return { ...manual, categories: categories.length ? categories : detected?.filters.category ? [detected.filters.category] : [...new Set(types.flatMap(type => options.typeCategories[type] || []))],
    materials: materials.length ? materials : detected?.filters.materials || [], productTypes: types,
    maxPrice: maximums.length ? Math.min(...maximums) : undefined, minPrice: minimums.length ? Math.max(...minimums) : undefined,
    ready: manual.ready || detected?.filters.ready || false };
}

export function catalogHref(query: string, filters: CatalogFilters, page?: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  for (const item of selectedCategories(filters)) params.append("categorie", item);
  for (const item of selectedMaterials(filters)) params.append("material", item);
  for (const item of filters.productTypes || []) params.append("tip", item);
  for (const [key, value] of [["pretMin", filters.minPrice], ["pret", filters.maxPrice], ["rating", filters.minRating]] as const) if (value !== undefined) params.set(key, String(value));
  if (filters.ready) params.set("rapid", "true");
  if (filters.sort && filters.sort !== "relevanta") params.set("sort", filters.sort);
  if (page && page > 1) params.set("page", String(page));
  return `/catalog${params.size ? `?${params}` : ""}`;
}

export function changedCatalogFilters(previous: CatalogFilters, next: CatalogFilters): Partial<CatalogFilters> {
  const patch: Partial<CatalogFilters> = {};
  for (const key of ["categories", "materials", "productTypes", "minPrice", "maxPrice", "minRating", "ready"] as const) {
    if (JSON.stringify(previous[key]) !== JSON.stringify(next[key])) Object.assign(patch, { [key]: next[key] });
  }
  return patch;
}
