import { expect, test } from "@playwright/test";

const enabled = process.env.LIVE_PILOT_E2E === "1";
if (enabled) process.loadEnvFile(".env.e2e.local");
test.use({ trace: "off", video: "off", screenshot: "off" });

test("LIVE confirmed account signs in, reviews its QA listing and closes a disposable workshop", async ({ page, baseURL }, info) => {
  test.skip(!enabled, "Opt-in only: uses the confirmed QA account and hosted database; never run in CI.");
  test.setTimeout(90000);
  expect(new URL(baseURL!).hostname).toBe("127.0.0.1");
  await page.goto("/cont");
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_TEST_EMAIL!);
  await page.getByLabel("Parolă", { exact: true }).fill(process.env.E2E_TEST_PASSWORD!);
  await page.getByRole("button", { name: "Intră în cont", exact: true }).click();
  await expect(page).toHaveURL(/\/cont\/profil/);
  await expect(page.getByRole("heading", { name: /Bună,/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Atelierul meu", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Administrare", exact: true })).toBeVisible();
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
  const token = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).access_token, `sb-${ref}-auth-token`);
  const headers = { Authorization: `Bearer ${token}` };
  await page.getByRole("link", { name: "Administrare", exact: true }).click();
  const ownShop = page.locator(".moderation-list article").filter({ has: page.getByRole("heading", { name: "Faurio · atelier QA TEST", exact: true }) });
  await ownShop.getByText("Detalii pentru verificare", { exact: true }).click();
  await expect(ownShop).toContainText("Atelier fictiv pentru verificarea pilotului public");
  await page.screenshot({ path: info.outputPath(`live-review-${info.project.name}.png`), fullPage: false });
  const existing = (await (await page.request.get("/api/studio", { headers })).json()).shops.find((shop: { name: string; status: string }) => shop.name === "QA TEST · închidere" && shop.status !== "closed");
  const slug = existing?.slug || `qa-close-${crypto.randomUUID().slice(0, 18)}`;
  let shopId = existing?.id;
  if (!shopId) {
    const created = await page.request.post("/api/shops", { headers, data: { name: "QA TEST · închidere", slug, country: "RO", location: "Date fictive QA", termsVersion: "seller-2026-10" } });
    expect(created.status()).toBe(201);
    shopId = (await created.json()).shopId;
  }
  await page.goto(`/studio?shop=${shopId}`);
  await page.getByText("Setările atelierului", { exact: true }).click();
  const close = page.getByRole("button", { name: "Închide atelierul", exact: true });
  await expect(close).toBeDisabled();
  await page.getByLabel("Confirmă adresa atelierului").fill("wrong-address");
  await page.getByRole("checkbox", { name: "Înțeleg că atelierul nu va mai putea primi comenzi." }).check();
  await expect(close).toBeDisabled();
  await page.getByLabel("Confirmă adresa atelierului").fill(slug);
  await close.click();
  await expect(page.getByText(/Atelierul este închis\. Pagina și produsele/)).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Studio", exact: true }).getByRole("link", { name: "Produse", exact: true })).toHaveCount(0);
  const studio = await page.request.get("/api/studio", { headers });
  expect((await studio.json()).shops.find((shop: { id: string }) => shop.id === shopId).status).toBe("closed");
  expect((await page.request.get(`/makers/${slug}`)).status()).toBe(404);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: info.outputPath(`live-closure-${info.project.name}.png`), fullPage: false });
});
