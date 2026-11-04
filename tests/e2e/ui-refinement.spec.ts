import { expect, test } from "@playwright/test";

for (const width of [390, 640, 1024, 1440]) {
  test(`seller and journal headings have breathing room at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/sell");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Atelierul tău, online.");
    await expect(page.getByText(/Pentru mâini|Primul pas|Fă-ne cunoștință/)).toHaveCount(0);
    const spacing = await page.locator(".seller-intro").evaluate(element => {
      const heading = element.querySelector("h1")!;
      const next = element.querySelector("p")!;
      const style = getComputedStyle(heading);
      return { gap: next.getBoundingClientRect().top - heading.getBoundingClientRect().bottom, ratio: parseFloat(style.lineHeight) / parseFloat(style.fontSize), overflow: document.documentElement.scrollWidth > innerWidth };
    });
    expect(spacing.gap).toBeGreaterThanOrEqual(20);
    expect(spacing.ratio).toBeGreaterThanOrEqual(1.2);
    expect(spacing.overflow).toBe(false);
    await page.screenshot({ path: info.outputPath(`seller-spaced-${width}.png`), fullPage: true });
    await page.goto("/blog");
    await expect(page.getByRole("heading", { name: "Jurnal", exact: true })).toBeVisible();
    await expect(page.locator(".post-grid article")).toHaveCount(7);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: info.outputPath(`journal-${width}.png`), fullPage: true });
  });
}

test("catalog batches filter changes into one navigation, preserves URLs and supports back", async ({ page }, info) => {
  await page.goto("/catalog");
  const mobile = (page.viewportSize()?.width || 0) <= 850;
  const open = page.getByRole("button", { name: "Filtre", exact: true });
  if (mobile) await open.click();
  const panel = page.locator(".filter-panel");
  await expect(panel).toBeVisible();
  const requests: string[] = [];
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.pathname === "/catalog" && url.searchParams.has("pret")) requests.push(url.href);
  });
  const original = page.url();
  const budget = page.getByRole("spinbutton", { name: "Preț maxim în lei" });
  await budget.fill("250");
  await budget.fill("150");
  await budget.fill("100");
  await page.getByRole("combobox", { name: "Material", exact: true }).selectOption("sticlă reciclată");
  expect(page.url()).toBe(original);
  expect(requests).toHaveLength(0);
  await page.getByRole("button", { name: "Aplică filtrele" }).click();
  await expect(page).toHaveURL(/pret=100/);
  expect(new URL(page.url()).searchParams.get("material")).toBe("sticlă reciclată");
  await expect(page.locator(".catalog-results")).toHaveAttribute("aria-busy", "false");
  expect(requests).toHaveLength(1);
  if (mobile) await expect(panel).not.toBeVisible();
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await expect(page.locator(".product-card").first()).toBeVisible();
    const prices = await page.locator(".product-price b").allTextContents();
    expect(prices.every(value => Number(value.replace(/[^\d,]/g, "").replace(",", ".")) <= 100)).toBe(true);
    expect(await page.locator(".product-meta").allTextContents()).toEqual(expect.arrayContaining([expect.stringContaining("Sticlărie")]));
  }
  await page.goBack();
  await expect(page).toHaveURL(original);
  if (mobile) {
    await open.click();
    await expect(page.getByRole("button", { name: "Închide filtrele", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(panel).not.toBeVisible();
    await expect(open).toBeFocused();
    await open.click();
  }
  await expect(budget).toHaveValue("");
  await budget.fill("0");
  await page.getByRole("button", { name: "Aplică filtrele" }).click();
  await expect(page).toHaveURL(/pret=0/);
  await page.screenshot({ path: info.outputPath(`catalog-filters-${info.project.name}.png`) });
});

test("product title never overlaps price, and card links do not prefetch detail pages", async ({ page }, info) => {
  test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, "Requires actual product data; no fabricated product page.");
  const prefetched: string[] = [];
  page.on("request", request => { const url = new URL(request.url()); if (url.pathname.startsWith("/produs/") && url.searchParams.has("_rsc")) prefetched.push(url.pathname); });
  await page.goto("/catalog");
  await expect(page.locator(".product-card").first()).toBeVisible();
  await page.locator(".product-card").last().scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  expect(prefetched).toEqual([]);
  await page.goto("/produs/farfurie-floare-004");
  await page.evaluate(() => document.fonts.ready);
  const spacing = await page.locator(".product-buy").evaluate(element => {
    const heading = element.querySelector("h1")!;
    const price = element.querySelector(".detail-price")!;
    const style = getComputedStyle(heading);
    return { gap: price.getBoundingClientRect().top - heading.getBoundingClientRect().bottom, ratio: parseFloat(style.lineHeight) / parseFloat(style.fontSize), overflow: document.documentElement.scrollWidth > innerWidth };
  });
  expect(spacing.gap).toBeGreaterThanOrEqual(20);
  expect(spacing.ratio).toBeGreaterThanOrEqual(1.2);
  expect(spacing.overflow).toBe(false);
  await expect(page.getByText(/Făcut de mână/)).toHaveCount(0);
  await page.screenshot({ path: info.outputPath(`product-spacing-${info.project.name}.png`), fullPage: true });
});

test("lighter catalog cards still add actual products to the cart", async ({ page }) => {
  test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, "Requires real inventory; no fabricated cart items.");
  await page.goto("/catalog?categorie=Sticl%C4%83rie");
  const card = page.locator(".product-card").filter({ has: page.getByRole("button", { name: "Adaugă în coș", exact: true }) }).first();
  await expect(card).toBeVisible();
  const name = await card.locator(".product-title strong").textContent();
  await card.hover();
  await card.getByRole("button", { name: "Adaugă în coș", exact: true }).click();
  await expect(page.locator(".header-cart b")).toHaveText("1");
  await page.locator(".header-cart").click();
  await expect(page).toHaveURL(/\/cos$/);
  await expect(page.locator(".cart-list")).toContainText(name!);
});

test("all journal articles open and lead back to the index", async ({ page, request }) => {
  await page.goto("/blog");
  const links = await page.locator(".featured-post h2 a, .post-grid h2 a").evaluateAll(elements => elements.map(element => element.getAttribute("href")!));
  expect(new Set(links).size).toBe(8);
  for (const href of links) expect((await request.get(href)).status()).toBe(200);
  await page.locator(".post-grid h2 a").first().click();
  await expect(page.locator(".article-page article section")).toHaveCount(4);
  await page.getByRole("link", { name: "Înapoi la jurnal" }).click();
  await expect(page.getByRole("heading", { name: "Jurnal", exact: true })).toBeVisible();
});
