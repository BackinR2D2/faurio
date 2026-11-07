import { expect, test, type Page } from "@playwright/test";

async function openFilters(page: Page) {
  if ((page.viewportSize()?.width || 0) <= 850) await page.getByRole("button", { name: "Filtre", exact: true }).click();
}
async function choose(page: Page, label: string, choices: string[]) {
  await page.locator(`summary[aria-label="${label}"]`).click();
  for (const choice of choices) await page.getByRole("checkbox", { name: choice, exact: true }).check();
  await page.keyboard.press("Escape");
}

test("multiple categories and materials persist through apply, reload, pagination and history", async ({ page }) => {
  await page.goto("/catalog");
  await openFilters(page);
  await choose(page, "Categorie", ["Ceramică", "Sticlărie"]);
  await choose(page, "Material", ["ceramică glazurată", "sticlă reciclată"]);
  await page.getByRole("button", { name: "Aplică filtrele" }).click();
  await expect(page.locator(".catalog-results")).toHaveAttribute("aria-busy", "false");
  await expect.poll(() => new URL(page.url()).searchParams.getAll("categorie")).toEqual(["Ceramică", "Sticlărie"]);
  expect(new URL(page.url()).searchParams.getAll("material")).toEqual(["ceramică glazurată", "sticlă reciclată"]);
  await expect(page.locator(".category-tabs button.active")).toHaveText(["Ceramică", "Sticlărie"]);
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await expect(page.locator(".product-card").first()).toBeVisible();
    const categories = await page.locator(".product-meta").allTextContents();
    expect(categories.every(value => /Ceramică|Sticlărie/.test(value))).toBe(true);
    const first = await page.locator(".product-title").first().textContent();
    await page.getByRole("link", { name: "Pagina următoare" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.locator(".product-title").first()).not.toHaveText(first!);
    expect(new URL(page.url()).searchParams.getAll("material")).toHaveLength(2);
    await page.goBack();
    await expect(page).not.toHaveURL(/page=2/);
  }
  await page.reload();
  await openFilters(page);
  await page.locator('summary[aria-label="Material"]').click();
  await expect(page.getByRole("checkbox", { name: "ceramică glazurată", exact: true })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "sticlă reciclată", exact: true })).toBeChecked();
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Resetează", exact: true }).click();
  await expect(page).toHaveURL(/\/catalog$/);
});

test("literal filter values cannot broaden results and linen does not match silver", async ({ page }) => {
  test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, "Checks the actual public catalog without adding fixture products.");
  await page.goto("/catalog?material=in");
  await expect(page.locator(".product-card").first()).toBeVisible();
  expect((await page.locator(".product-meta").allTextContents()).every(value => value.includes("Textile"))).toBe(true);
  for (const [key, value] of [["material", 'x"),stock.gt.0'], ["tip", 'Unknown "(product)"'], ["categorie", "Unknown, category"]]) {
    const response = await page.goto(`/catalog?${new URLSearchParams({ [key]: value })}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator(".product-card")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Nicio potrivire exactă" })).toBeVisible();
  }
});

test("LIVE interpreted search populates real controls and fresh searches clear stale manual filters", async ({ page }, info) => {
  test.skip(!process.env.GROQ_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY, "Uses actual Groq and Supabase, not fabricated search results.");
  const query = "Pahare între 80,50 și 150,75 lei, în stoc";
  await page.goto(`/catalog?q=${encodeURIComponent(query)}`);
  await expect(page.locator(".product-card").first()).toBeVisible();
  await openFilters(page);
  await expect(page.getByRole("spinbutton", { name: "Preț maxim în lei" })).toHaveValue("150.75");
  await expect(page.getByRole("spinbutton", { name: "Preț minim în lei" })).toHaveValue("80.5");
  await expect(page.locator('summary[aria-label="Categorie"]')).toContainText("Sticlărie");
  await expect(page.locator('summary[aria-label="Tip de produs"]')).toContainText("Pahar");
  await expect(page.locator('summary[aria-label="Tip de produs"]')).toContainText("Set de pahare");
  await choose(page, "Material", ["sticlă reciclată"]);
  await page.getByRole("button", { name: "Aplică filtrele" }).click();
  await expect(page).toHaveURL(/material=/);
  await expect(page.locator(".product-card").first()).toBeVisible();
  await page.screenshot({ path: info.outputPath(`catalog-prefill-${info.project.name}.png`) });
  await page.getByRole("textbox", { name: "Caută în catalog" }).fill("O cană sau un jurnal, cel mult 200 de lei");
  await page.getByRole("button", { name: "Caută", exact: true }).click();
  await expect(page).toHaveURL(url => url.searchParams.get("q") === "O cană sau un jurnal, cel mult 200 de lei" && !url.searchParams.has("material"));
  await expect(page.locator(".product-card").first()).toBeVisible();
  expect(new URL(page.url()).searchParams.has("material")).toBe(false);
  await openFilters(page);
  await expect(page.getByRole("spinbutton", { name: "Preț maxim în lei" })).toHaveValue("200");
  await expect(page.getByRole("spinbutton", { name: "Preț minim în lei" })).toHaveValue("");
  await expect(page.locator('summary[aria-label="Categorie"]')).toContainText("Ceramică");
  await expect(page.locator('summary[aria-label="Categorie"]')).toContainText("Papetărie");
  await expect(page.locator('summary[aria-label="Tip de produs"]')).toContainText("Jurnal");
  if ((page.viewportSize()?.width || 0) <= 850) await page.getByRole("button", { name: "Închide filtrele", exact: true }).click();
  await page.getByRole("textbox", { name: "Caută în catalog" }).fill("O cană din ceramică sub 180 lei");
  await page.getByRole("button", { name: "Caută", exact: true }).click();
  await expect(page).toHaveURL(url => url.searchParams.get("q") === "O cană din ceramică sub 180 lei");
  await expect(page.locator(".product-card").first()).toBeVisible();
  await openFilters(page);
  await expect(page.locator('summary[aria-label="Material"]')).toContainText("ceramică");
  await expect(page.getByRole("spinbutton", { name: "Preț maxim în lei" })).toHaveValue("180");
});
