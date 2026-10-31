import { expect, test } from "@playwright/test";
import { buildOrderEmail } from "../../lib/email/order-template";

test("MOCK email preview: paid-order content fits desktop and mobile", async ({ page }, info) => {
  const email = buildOrderEmail({ code: "FAU-PREVIEW", customer_name: "Alex", customer_email: "fixture@example.test", shipping_address: "Strada Exemplu 1, Brașov", items: [{ name: "Vază Pământ · Ediția 01", quantity: 1, unit_price: 194 }, { name: "Semn de carte Tei", quantity: 1, unit_price: 39 }], subtotal: 233, discount: 0, shipping: 19, total: 252, invoice_url: null, test_mode: true }, { apiKey: "re_fixture", fromEmail: "orders@example.test", siteUrl: "https://example.test" });
  await page.setContent(email.html);
  await expect(page.getByRole("heading", { name: "Plata este confirmată." })).toBeVisible();
  await expect(page.getByText("Comandă demonstrativă", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: `docs/evidence/MOCK-order-email-${info.project.name}.png`, fullPage: true });
});

test("Faurio branding is consistent and recovery does not accept an anonymous password change", async ({ page, request }, info) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Faurio/);
  await expect(page.getByRole("link", { name: "Faurio, pagina principală" })).toBeVisible();
  await expect(page.locator(".brand strong").first()).toHaveText("faurio");
  expect((await request.get("/favicon.svg")).ok()).toBeTruthy();
  await page.screenshot({ path: `docs/evidence/faurio-home-${info.project.name}.png` });
  await page.goto("/cont/parola");
  await expect(page.getByRole("link", { name: "Solicită un link nou" })).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  for (const method of ["get", "post"] as const) {
    const response = await request[method]("/api/internal/order-emails");
    expect(response.status()).toBe(401);
  }
});

test("MOCK Auth: reported confirmation email error is explained without falsely claiming delivery", async ({ page }) => {
  test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, "Requires configured Auth browser client, transport is mocked.");
  await page.route("**/auth/v1/signup**", (route) => route.fulfill({ status: 500, json: { code: "unexpected_failure", message: "Error sending confirmation email" } }));
  await page.goto("/cont");
  await page.getByRole("button", { name: "Creează unul" }).click();
  await page.getByLabel("Nume", { exact: true }).fill("Test local");
  await page.getByLabel("Email", { exact: true }).fill("test@example.test");
  await page.locator('form input[type="password"]').fill("Long-fixture-password123");
  await page.getByRole("button", { name: "Creează cont", exact: true }).click();
  await expect(page.locator(".form-error")).toContainText("Emailul nu a putut fi trimis");
  await expect(page.locator(".form-success")).toHaveCount(0);
});

test("MOCK Auth: recovery validates matching passwords, updates the authenticated user and signs out", async ({ page }, info) => {
  test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, "Requires configured Auth browser client, transport is mocked.");
  const id = "10000000-0000-4000-8000-000000000001";
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
  const user = { id, aud: "authenticated", role: "authenticated", email: "fixture@example.test", user_metadata: {}, app_metadata: { provider: "email", providers: ["email"] }, created_at: "2026-01-01T00:00:00Z" };
  const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.fixture`;
  await page.addInitScript(({ ref, token, user }) => {
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({ access_token: token, refresh_token: "fixture-only", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user }));
  }, { ref, token, user });
  let updates = 0;
  let loggedOut = false;
  await page.route("**/auth/v1/**", (route) => {
    if (route.request().method() === "PUT") {
      expect(route.request().postDataJSON().password).toBe("New-fixture-password123"); updates++;
    }
    if (route.request().url().includes("/logout")) { loggedOut = true; return route.fulfill({ status: 204 }); }
    return route.fulfill({ json: user });
  });
  await page.route("**/api/shop-state", (route) => route.fulfill({ json: { cart: [], favorites: [] } }));
  await page.goto("/cont/parola");
  await page.getByLabel("Parolă nouă", { exact: true }).fill("New-fixture-password123");
  await page.getByLabel("Confirmă parola", { exact: true }).fill("Wrong-fixture-password123");
  await page.getByRole("button", { name: "Salvează parola" }).click();
  await expect(page.locator(".recovery-page .form-error[role=alert]")).toContainText("Parolele nu coincid");
  expect(updates).toBe(0);
  await page.getByLabel("Confirmă parola", { exact: true }).fill("New-fixture-password123");
  await page.getByRole("button", { name: "Salvează parola" }).click();
  await expect(page.getByRole("heading", { name: "Parolă actualizată." })).toBeVisible();
  await expect.poll(() => loggedOut).toBeTruthy();
  expect(updates).toBe(1);
  await page.screenshot({ path: `docs/evidence/MOCK-recovery-${info.project.name}.png` });
});
