export const categories = ["Toate", "Ceramică", "Sticlărie", "Textile", "Lumânări", "Bijuterii", "Lemn", "Decorațiuni", "Papetărie"] as const;
export const materials = ["Toate", "ceramică glazurată", "sticlă reciclată", "in", "bumbac", "ceară de soia", "alamă", "argint", "lemn de nuc", "hârtie reciclată"] as const;

export type Product = {
  id: string;
  name: string;
  productType: string;
  maker: string;
  makerLocation: string;
  category: string;
  price: number;
  oldPrice?: number;
  material: string;
  color: string;
  occasion: string[];
  recipients: string[];
  moods: string[];
  image: string;
  imagePosition?: string;
  stock: number;
  rating: number;
  reviews: number;
  days: number;
  badge?: string;
  description: string;
  details: string[];
  care: string;
  story: string;
  shopId?: string;
  shopSlug?: string;
  checkoutEligible?: boolean;
};

export type CatalogFilters = {
  category?: string;
  material?: string;
  categories?: string[];
  materials?: string[];
  productTypes?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  ready?: boolean;
  shopId?: string;
  sort?: "relevanta" | "pret-mic" | "pret-mare" | "rating" | "nou";
};

export const money = new Intl.NumberFormat("ro-RO", {
  style: "currency",
  currency: "RON",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
