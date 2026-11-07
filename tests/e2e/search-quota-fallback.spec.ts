import { expect, test } from "@playwright/test";

const enabled = process.env.SEARCH_QUOTA_E2E === "1";
test("QUOTA exhausted search uses real keyword results, preserves filters and keeps the UI usable", async ({ page, request }) => {
  test.skip(!enabled, "Requires an isolated local server with exhausted quota or a simulated provider 429.");
  const query = "Jurnal Herbarium între 80,51 și 132,37 lei";
  const response = await request.post("/api/search", { data: { query } });
  expect(response.status()).toBe(200);
  const result = await response.json();
  expect(result.intent.engine).toBe("keywords");
  expect(result.intent.fallbackReason).toBe(process.env.SEARCH_QUOTA_REASON || "AI_SEARCH_BUDGET_EXHAUSTED");
  expect(result.intent.failure).toBeUndefined();
  expect(result.products.length).toBeGreaterThan(0);
  for (const product of result.products) {
    expect(product.productType).toBe("Jurnal");
    expect(product.name).toContain("Herbarium");
    expect(product.price).toBeGreaterThanOrEqual(80.51);
    expect(product.price).toBeLessThanOrEqual(132.37);
  }
  await page.goto(`/catalog?q=${encodeURIComponent(query)}`);
  await expect(page.locator(".product-card").first()).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Căutare după cuvinte-cheie");
  await expect(page.locator(".empty-state[role=alert]")).toHaveCount(0);
  const firstPage = await page.locator(".product-title").first().getAttribute("href");
  await page.getByRole("link", { name: "Pagina următoare" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator(".product-title").first()).not.toHaveAttribute("href", firstPage!);
  expect((await page.reload())?.status()).toBe(200);
  await expect(page.getByRole("status")).toContainText("Căutare după cuvinte-cheie");
  if ((page.viewportSize()?.width || 0) <= 850) await page.getByRole("button", { name: "Filtre", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Preț maxim în lei" })).toHaveValue("132.37");
  await expect(page.getByRole("spinbutton", { name: "Preț minim în lei" })).toHaveValue("80.51");
  await expect(page.locator('summary[aria-label="Tip de produs"]')).toContainText("Jurnal");
  await page.getByRole("spinbutton", { name: "Preț maxim în lei" }).fill("99.37");
  await page.getByRole("button", { name: "Aplică filtrele" }).click();
  await expect(page).toHaveURL(url => url.searchParams.get("pret") === "99.37" && !url.searchParams.has("page"));
  await expect(page.locator(".catalog-results")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".product-card").first()).toBeVisible();
  const prices = (await page.locator(".product-price b").allTextContents()).map(value => Number(value.replace(/[^\d,]/g, "").replace(",", ".")));
  expect(prices.every(value => value >= 80.51 && value <= 99.37)).toBe(true);
});

test("QUOTA keyword fallback never replaces absent products or stories with unrelated cheap items", async ({ request }) => {
  test.skip(!enabled, "Requires an isolated local quota-test server.");
  for (const query of ["tricou maro, buget de 99,37 lei maxim", "cadou pentru unchiul profesor, buget de 249,37 lei maxim"]) {
    const response = await request.post("/api/search", { data: { query } });
    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.intent.engine).toBe("keywords");
    expect(result.products).toEqual([]);
    expect(result.intent.recommendations).toEqual([]);
  }
});
