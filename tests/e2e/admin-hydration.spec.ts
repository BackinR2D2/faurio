import { expect, test, type Page } from "@playwright/test";

function captureErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error" && /hydrat|server rendered|didn't match|validateDOMNesting|cannot be a descendant/i.test(message.text())) errors.push(message.text()); });
  return errors;
}

async function operatorFixture(page: Page) {
  test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, "Requires configured Auth browser client; all private transports are mocked.");
  const id = "10000000-0000-4000-8000-000000000001";
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
  const user = { id, aud: "authenticated", role: "authenticated", email: "operator@example.test", user_metadata: { full_name: "Operator Test" }, app_metadata: { provider: "email", providers: ["email"] }, created_at: "2026-01-01T00:00:00Z" };
  const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.fixture`;
  await page.addInitScript(({ ref, token, user }) => {
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({ access_token: token, refresh_token: "fixture-only", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user }));
    localStorage.setItem("fir-de-poveste-favorites", JSON.stringify(["fixture-product"]));
  }, { ref, token, user });
  await page.route("**/auth/v1/**", route => route.fulfill({ json: user }));
  await page.route("**/api/shop-state", route => route.fulfill({ json: { cart: [], favorites: ["fixture-product"] } }));
  await page.route("**/api/admin**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/admin/marketplace") return route.fulfill({ json: { records: [], total: 0, audit: [{ id: 1, created_at: "2026-01-01T09:00:00Z", action: "shop.reviewed", reason: "Fixture", subject_id: null }] } });
    if (path === "/api/admin/finance" || path === "/api/admin/feedback") return route.fulfill({ json: { records: [], total: 0 } });
    return route.fulfill({ json: { products: [], page: 1, pageCount: 1, total: 0, units: 0, lowStock: 0, users: 0, orders: [] } });
  });
}

test("admin cold entries and reloads hydrate without errors for anonymous visitors", async ({ page }) => {
  const errors = captureErrors(page);
  for (const path of ["/admin", "/admin/marketplace", "/admin/finance", "/admin/feedback"]) {
    await page.goto(path);
    await expect(page.locator("main h1").first()).toBeVisible();
    await expect(page.locator(".site-header .brand small")).toHaveCount(0);
    await page.reload();
    await expect(page.locator("main h1").first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("server-rendered footer remains consistent when the browser clock has a different year", async ({ page, request }) => {
  const html = await (await request.get("/admin")).text();
  const year = html.match(/©\s*(?:<!-- -->)?\s*(\d{4})/)?.[1];
  expect(year).toBeTruthy();
  const errors = captureErrors(page);
  await page.clock.setFixedTime(new Date("2040-01-01T00:00:00Z"));
  await page.goto("/admin");
  await expect(page.locator("main h1").first()).toBeVisible();
  await expect(page.locator(".footer-bottom")).toContainText(year!);
  expect(errors).toEqual([]);
});

test("MOCK operator: persisted authentication, small labels and client navigation hydrate consistently", async ({ page }) => {
  await operatorFixture(page);
  const errors = captureErrors(page);
  await page.goto("/admin");
  await expect(page.locator(".admin-page aside small")).toHaveText("operator@example.test");
  await expect(page.locator(".header-account")).toContainText("Operator");
  await page.reload();
  await expect(page.locator(".admin-stats")).toBeVisible();
  await page.getByRole("link", { name: "Moderare ateliere și produse →" }).click();
  await expect(page.getByRole("heading", { name: "Ateliere & colecții." })).toBeVisible();
  await page.getByRole("link", { name: "← Stocuri și comenzi" }).click();
  await expect(page.locator(".admin-stats")).toBeVisible();
  for (const path of ["/admin/marketplace", "/admin/finance", "/admin/feedback"]) {
    await page.goto(path);
    await expect(page.locator("main h1").first()).toBeVisible();
    await page.reload();
    await expect(page.locator("main h1").first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("MOCK operator: failed stock writes roll back and can be retried without duplicate requests", async ({ page }) => {
  await operatorFixture(page);
  let writes = 0;
  let stock = 3;
  await page.route(/\/api\/admin(?:\?|$)/, async route => {
    if (route.request().method() === "PATCH") {
      writes++;
      if (writes === 1) return route.fulfill({ status: 500, json: { error: "Fixture failure" } });
      stock = route.request().postDataJSON().stock;
      return route.fulfill({ json: { updated: true, stock } });
    }
    return route.fulfill({ json: { products: [{ id: "fixture-product", name: "Cană de test", category: "Ceramică", price: 90, stock, image: "/products/ceramica-luna.avif" }], page: 1, pageCount: 1, total: 1, units: 3, lowStock: 1, users: 1, orders: [] } });
  });
  await page.goto("/admin");
  const increase = page.getByRole("button", { name: "Crește stocul pentru Cană de test" });
  const quantity = page.locator(".admin-qty b");
  await expect(quantity).toHaveText("3");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await increase.click();
  await expect(page.locator(".form-error")).toContainText("Stocul nu a putut fi salvat");
  await expect(quantity).toHaveText("3");
  await increase.click();
  await expect(quantity).toHaveText("4");
  await expect(increase).toBeEnabled();
  await expect(page.locator(".admin-stats > span").nth(1).locator("b")).toHaveText("4");
  await expect(page.locator(".admin-stats > span").nth(2).locator("b")).toHaveText("0");
  expect(writes).toBe(2);
  await expect(page.locator(".form-error")).toHaveCount(0);
});
