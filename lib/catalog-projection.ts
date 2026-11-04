import type { Product } from "./catalog";

export const catalogCardColumns = "id,name,product_type,maker,maker_location,category,price,old_price,material,color,image,image_position,stock,rating,reviews,rating_source,shipping_days,badge,shop_id,shop_slug,checkout_eligible";
export const legacyCatalogCardColumns = catalogCardColumns.split(",").filter(column => !["shop_id", "shop_slug", "checkout_eligible", "rating_source"].includes(column)).join(",");

export function catalogCardProduct(product: Product): Product {
  return { ...product, description: "", details: [], care: "", story: "", occasion: [], recipients: [], moods: [] };
}
