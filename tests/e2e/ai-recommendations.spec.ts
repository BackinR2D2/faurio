import { expect, test } from "@playwright/test";

const story = "vreau sa cumpar un cadou unchiului meu care e profesor, in buget de 250 de lei maxim";
const unavailable = process.env.SEARCH_FAILURE_E2E === "1";

const preciseCases = [
  { query: "Caut un set de pahare sub 200 lei", types: ["Set de pahare"], max: 200 },
  { query: "O cană sau un jurnal, cel mult 200 de lei", types: ["Cană", "Jurnal"], max: 200 },
  { query: "O cană albă sau albastră, maxim 160 lei", types: ["Cană"], max: 160, colors: true },
  { query: "Pahare între 80,50 și 150,75 lei, în stoc", types: ["Pahar", "Set de pahare"], min: 80.5, max: 150.75 },
  { query: "Cadou pentru profesor, fără vaze sau căni, nu maro, buget maxim 250 lei", max: 250, exclusions: true },
  { query: "laptop maro sub 100 lei", max: 100, absent: true },
  { query: "O cană pentru unchiul meu care este profesor și are ochi albaștri, sub 180 lei", types: ["Cană"], max: 180, storyAttributes: true },
];
for (const fixture of preciseCases) {
  test(`LIVE precise search: ${fixture.query}`, async ({ request }) => {
    test.skip(unavailable || !process.env.GROQ_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY, "Requires real Groq and Supabase.");
    const response = await request.post("/api/search", { data: { query: fixture.query } });
    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.intent.engine).toBe("groq");
    expect(result.intent.filters.maxPrice).toBe(fixture.max);
    if (fixture.types) expect(new Set(result.intent.productTypes)).toEqual(new Set(fixture.types));
    if (fixture.min) expect(result.intent.filters.minPrice).toBe(fixture.min);
    if (fixture.colors) {
      expect(result.intent.filters.colorMatch).toBe("any");
      expect(new Set(result.intent.filters.colors)).toEqual(new Set(["alb", "albastru"]));
    }
    if (fixture.exclusions) {
      expect(result.intent.filters.excludedProductTypes).toEqual(expect.arrayContaining(["Vază", "Cană"]));
      expect(result.intent.filters.excludedColors).toContain("maro");
    }
    if (fixture.absent) expect(result.products).toEqual([]);
    else expect(result.products.length).toBeGreaterThan(0);
    if (fixture.storyAttributes) {
      expect(result.intent.filters.colors).toEqual([]);
      expect(result.intent.requiredTerms).toEqual([]);
    }
    for (const product of result.products) {
      expect(product.price).toBeLessThanOrEqual(fixture.max);
      if (fixture.min) expect(product.price).toBeGreaterThanOrEqual(fixture.min);
      if (fixture.types) expect(fixture.types).toContain(product.productType);
      if (fixture.exclusions) {
        expect(["Vază", "Cană"]).not.toContain(product.productType);
        expect(product.color).not.toMatch(/\bmaro\b/i);
      }
      if (fixture.colors) expect(product.color).toMatch(/\b(?:alb|albastru)\b/i);
    }
  });
}

test("LIVE AI gift story recommends grounded teaching and reading products within budget", async ({ page, request }, info) => {
  test.skip(unavailable || !process.env.GROQ_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY, "Requires real Groq and Supabase; no fake recommendations.");
  const response = await request.post("/api/search", { data: { query: story } });
  expect(response.status()).toBe(200);
  const result = await response.json();
  expect(result.intent.engine).toBe("groq");
  expect(result.intent.queryMode).toBe("discovery");
  expect(result.intent.filters.maxPrice).toBe(250);
  expect(result.intent.requiredTerms).toEqual([]);
  expect(result.intent.productTypes).toEqual(expect.arrayContaining(["Jurnal", "Semn de carte"]));
  expect(result.intent.productTypes).not.toContain("Bol");
  expect(result.products.length).toBeGreaterThan(1);
  for (const product of result.products) {
    expect(product.price).toBeLessThanOrEqual(250);
    expect(result.intent.productTypes).toContain(product.productType);
  }
  expect(new Set(result.products.slice(0, 3).map((product: { productType: string }) => product.productType)).size).toBeGreaterThan(1);
  await page.goto("/");
  await page.getByRole("textbox", { name: "Descrie în limbaj natural ce produs cauți" }).fill(story);
  await page.getByRole("textbox", { name: "Descrie în limbaj natural ce produs cauți" }).press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Alese pentru povestea ta");
  await expect(page.locator(".understanding")).toContainText("maximum 250 lei");
  await expect(page.locator(".product-card").first().locator(".match-reasons")).not.toBeEmpty();
  await expect(page.getByText(/AI nu este disponibil|filtrele exacte|Filtre exacte/)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: info.outputPath(`teacher-gift-${info.project.name}.png`), fullPage: false });
});

test("LIVE discovery pagination is stable and respects explicit price sorting", async ({ page }) => {
  test.skip(unavailable || !process.env.GROQ_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY, "Requires real cached AI interpretation and Supabase.");
  await page.goto(`/catalog?q=${encodeURIComponent(story)}`);
  await expect(page.locator(".product-card").first()).toBeVisible();
  const first = await page.locator(".product-title").evaluateAll(elements => elements.map(element => element.getAttribute("href")));
  await page.getByRole("link", { name: "Pagina următoare" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect.poll(async () => await page.locator(".product-title").first().getAttribute("href")).not.toBe(first[0]);
  const second = await page.locator(".product-title").evaluateAll(elements => elements.map(element => element.getAttribute("href")));
  expect(second.some(id => first.includes(id))).toBe(false);
  await page.getByLabel("Ordonează").selectOption("pret-mic");
  await expect(page).toHaveURL(/sort=pret-mic/);
  const prices = await page.locator(".product-price > b").allTextContents();
  const values = prices.map(price => Number(price.replace(/[^\d,]/g, "").replace(",", ".")));
  expect(values).toEqual([...values].sort((a, b) => a - b));
  expect(values.every(price => price <= 250)).toBe(true);
});

test("AI unavailable fails closed with retry instead of returning non-AI recommendations", async ({ page, request }) => {
  test.skip(!unavailable, "Run against the isolated SEARCH_AI_ENABLED=false QA server.");
  const response = await request.post("/api/search", { data: { query: story } });
  expect(response.status()).toBe(503);
  const result = await response.json();
  expect(result.code).toBe("AI_SEARCH_UNAVAILABLE");
  expect(result.products).toEqual([]);
  expect(result.intent.engine).toBeUndefined();
  expect(result.intent.failure).toBeTruthy();
  await page.goto(`/catalog?q=${encodeURIComponent(story)}`);
  await expect(page.locator(".empty-state[role=alert]")).toContainText("Nu am putut finaliza căutarea");
  await expect(page.getByRole("button", { name: "Reîncearcă", exact: true })).toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(0);
  await expect(page.getByText(/Filtre exacte|AI nu este disponibil|folosește filtrele/)).toHaveCount(0);
  await page.getByRole("link", { name: "Explorează catalogul", exact: true }).click();
  await expect(page.locator(".product-card").first()).toBeVisible();
});
