import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeInventory, inventoryFingerprint, diversifyRecommendations, type InventoryRow } from "../../lib/search/inventory.ts";

const row = (id: string, type = "Cană", price = 90): InventoryRow => ({ id, name: `${type} Atelier · Ediția ${id}`, product_type: type, category: "Ceramică", description: "Lucrat manual.", material: "ceramică", color: "crem", price, stock: 2 });

test("inventory summaries include late catalog types and collapse editions without losing prices or counts", () => {
  const rows = [...Array.from({ length: 1000 }, (_, i) => row(String(i + 1))), row("1001", "Jurnal", 89)];
  const summary = summarizeInventory(rows);
  assert.equal(summary.find(group => group.productType === "Cană")?.count, 1000);
  assert.equal(summary.find(group => group.productType === "Cană")?.examples.length, 1);
  assert.equal(summary.find(group => group.productType === "Jurnal")?.count, 1);
  assert.notEqual(inventoryFingerprint(rows), inventoryFingerprint([...rows, row("1002")]));
  assert.notEqual(inventoryFingerprint(rows), inventoryFingerprint(rows.map(item => item.id === "1001" ? { ...item, price: 120 } : item)));
});

test("discovery balances product families before pagination and respects the AI order", () => {
  const products = [
    ...Array.from({ length: 30 }, (_, i) => ({ id: `j-${i}`, name: `Jurnal · Ediția ${i}`, productType: "Jurnal", stock: i === 0 ? 0 : 2 })),
    ...Array.from({ length: 30 }, (_, i) => ({ id: `s-${i}`, name: `Semn Tei · Ediția ${i}`, productType: "Semn de carte", stock: 3 })),
  ];
  const ranked = diversifyRecommendations(products, ["Semn de carte", "Jurnal"]);
  assert.deepEqual(ranked.slice(0, 4).map(product => product.productType), ["Semn de carte", "Jurnal", "Semn de carte", "Jurnal"]);
  assert.equal(ranked[1].stock, 2);
  assert.equal(new Set(ranked.map(product => product.id)).size, products.length);
  assert.equal(diversifyRecommendations([], []).length, 0);
});
