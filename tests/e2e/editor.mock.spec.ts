import { expect, test } from "@playwright/test";
import { defaultLayout, type ShopLayout } from "../../lib/marketplace/contracts";

test("MOCK transport: Studio theme preview, autosave, reload, undo and accessible reorder", async ({ page }, info) => {
  test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "UI auth fixture requires the Supabase browser client to be configured.");
  const id = "10000000-0000-4000-8000-000000000001";
  let layout: ShopLayout = defaultLayout("Atelier de test UI");
  let revision = 1;
  let published: ShopLayout | null = null;
  const user = { id, aud: "authenticated", role: "authenticated", email: "fixture@example.test", user_metadata: { full_name: "UI fixture" }, app_metadata: { provider: "email", providers: ["email"] }, created_at: "2026-01-01T00:00:00Z" };
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
  const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.fixture`;
  await page.addInitScript(({ ref, token, user }) => {
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({ access_token: token, refresh_token: "fixture-only", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user }));
  }, { ref, token, user });
  await page.route("**/auth/v1/**", (route) => route.fulfill({ json: { user } }));
  await page.route("**/api/shop-state", (route) => route.fulfill({ json: { cart: [], favorites: [] } }));
  await page.route("**/api/studio**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/studio") return route.fulfill({ json: { shops: [{ id, slug: "atelier-test-ui", name: "Atelier de test UI", country: "RO", location: "Brașov", status: "active", role: "owner", is_legacy: false }] } });
    if (path === "/api/studio/products") return route.fulfill({ json: { products: [], previewProducts: [], total: 0 } });
    if (request.method() === "PUT") { const body = request.postDataJSON(); expect(body.revision).toBe(revision); layout = body.layout; revision++; return route.fulfill({ json: { revision } }); }
    if (request.method() === "POST") { const body = request.postDataJSON(); expect(body.revision).toBe(revision); published = body.publish ? structuredClone(layout) : null; revision++; return route.fulfill({ json: { revision, published: Boolean(published) } }); }
    return route.fulfill({ json: { page: { shop_id: id, draft: layout, published, revision, published_at: null, updated_at: "2026-10-30T09:00:00Z" }, versions: [] } });
  });
  await page.goto(`/studio/appearance?shop=${id}`);
  await expect(page.getByRole("heading", { name: "Fă-l al tău." })).toBeVisible();
  await page.getByRole("button", { name: "Studio de lut", exact: true }).click();
  await expect(page.locator(".preview-frame .maker-storefront")).toHaveClass(/theme-clay/);
  await expect(page.getByText("Ciornă salvată", { exact: true }).first()).toBeVisible();
  await expect.poll(() => layout.theme).toBe("clay");
  await page.reload();
  await expect(page.locator(".preview-frame .maker-storefront")).toHaveClass(/theme-clay/);
  await page.getByRole("button", { name: "Mută Poveste în sus", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => layout.blocks[1].type).toBe("story");
  if (info.project.name === "desktop-chrome") {
    await page.locator(".block-order li").filter({ hasText: "Galerie" }).dragTo(page.locator(".block-order li").filter({ hasText: "Copertă" }));
    await expect.poll(() => layout.blocks[0].type).toBe("gallery");
  }
  await page.getByRole("button", { name: "Publică pagina", exact: true }).click();
  await expect(page.getByText("Pagina este publicată.")).toBeVisible();
  expect((published as ShopLayout | null)?.theme).toBe("clay");
  await page.screenshot({ path: `docs/evidence/MOCK-editor-${info.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Grădină botanică", exact: true }).click();
  await expect(page.locator(".preview-frame .maker-storefront")).toHaveClass(/theme-botanical/);
  await page.getByRole("button", { name: "Anulează ultima modificare" }).click();
  await expect(page.locator(".preview-frame .maker-storefront")).toHaveClass(/theme-clay/);
});
