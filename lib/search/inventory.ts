import { createHash } from "node:crypto";

export type InventoryRow = {
  id: string; name: string; product_type: string; category: string; description: string;
  material: string; color: string; price: number; stock: number;
};
export type InventoryContext = {
  productType: string; category: string; count: number; minPrice: number; maxPrice: number; inStock: number;
  examples: { name: string; description: string }[];
};

export function summarizeInventory(rows: InventoryRow[]): InventoryContext[] {
  const groups = new Map<string, InventoryContext>();
  for (const row of rows) {
    let group = groups.get(row.product_type);
    if (!group) {
      group = { productType: row.product_type, category: row.category, count: 0, minPrice: Number(row.price), maxPrice: Number(row.price), inStock: 0, examples: [] };
      groups.set(row.product_type, group);
    }
    group.count++;
    group.minPrice = Math.min(group.minPrice, Number(row.price));
    group.maxPrice = Math.max(group.maxPrice, Number(row.price));
    if (row.stock > 0) group.inStock++;
    const name = row.name.replace(/\s*[·–-]\s*edi[tț]ia\s+\d+\s*$/iu, "");
    if (group.examples.length < 4 && !group.examples.some(example => example.name === name)) {
      group.examples.push({ name: name.slice(0, 100), description: row.description.slice(0, 180) });
    }
  }
  return [...groups.values()].sort((a, b) => a.productType.localeCompare(b.productType, "ro"));
}

export function inventoryFingerprint(rows: InventoryRow[]) {
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

export function diversifyRecommendations<T extends { id: string; name: string; productType: string; shopId?: string; stock: number }>(products: T[], preferredTypes: string[]): T[] {
  const rank = new Map(preferredTypes.map((type, index) => [type, index]));
  const groups = new Map<string, T[]>();
  for (const product of products) {
    const name = product.name.replace(/\s*[·–-]\s*edi[tț]ia\s+\d+\s*$/iu, "");
    const family = JSON.stringify([product.shopId, product.productType, name]);
    const group = groups.get(family) || [];
    group.push(product);
    groups.set(family, group);
  }
  const families = [...groups.values()].sort((a, b) => (rank.get(a[0].productType) ?? 999) - (rank.get(b[0].productType) ?? 999));
  for (const group of families) group.sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0));
  const result: T[] = [];
  for (let index = 0; result.length < products.length; index++) {
    for (const family of families) if (family[index]) result.push(family[index]);
  }
  return result;
}
