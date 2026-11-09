import { expect, test, type Page } from "@playwright/test";

async function accountFixture(page: Page) {
  test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, "Requires browser auth configuration; all account transports are mocked.");
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
  const id = "20000000-0000-4000-8000-000000000001";
  const user = { id, aud: "authenticated", role: "authenticated", email: "delete-fixture@example.test", user_metadata: { full_name: "Client test" }, app_metadata: { provider: "email", providers: ["email"] }, created_at: "2026-01-01T00:00:00Z" };
  const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.fixture`;
  await page.addInitScript(({ ref, token, user }) => {
    if (!sessionStorage.getItem("fixture-loaded")) {
      localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({ access_token: token, refresh_token: "fixture-only", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user }));
      sessionStorage.setItem("fixture-loaded", "true");
    }
  }, { ref, token, user });
  await page.route("**/auth/v1/**", route => route.fulfill({ json: route.request().url().includes("logout") ? {} : user }));
  await page.route("**/api/shop-state", route => route.fulfill({ json: { cart: [], favorites: [] } }));
  await page.route("**/api/profile**", route => route.fulfill({ json: { profile: { name: "Client test", email: user.email }, orders: [], orderCount: 0 } }));
  await page.goto("/cont/profil");
  await page.getByRole("button", { name: "Șterge contul meu", exact: true }).click();
}

test("MOCK account deletion requires confirmation, handles blockers and allows cancellation", async ({ page }, info) => {
  await accountFixture(page);
  let calls = 0;
  await page.route("**/api/account", async route => {
    calls++;
    expect(route.request().method()).toBe("DELETE");
    expect(route.request().postDataJSON()).toEqual({ confirmation: "STERGE", password: "fixture-password" });
    await route.fulfill({ status: 409, json: { error: "Închide mai întâi atelierele tale din Studio." } });
  });
  const submit = page.getByRole("button", { name: "Șterge definitiv contul", exact: true });
  await expect(submit).toBeDisabled();
  await page.getByLabel("Parola contului", { exact: true }).fill("fixture-password");
  await page.getByLabel("Scrie STERGE pentru confirmare").fill("sterge");
  await expect(submit).toBeDisabled();
  expect(calls).toBe(0);
  await page.getByLabel("Scrie STERGE pentru confirmare").fill("STERGE");
  await submit.click();
  await expect(page.locator(".account-deletion").getByRole("alert")).toContainText("Închide mai întâi");
  await expect(page.getByLabel("Parola contului", { exact: true })).toHaveValue("");
  await expect(page).toHaveURL(/\/cont\/profil$/);
  await page.screenshot({ path: info.outputPath("account-deletion-blocked.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Renunță", exact: true }).click();
  await expect(page.getByRole("form", { name: "Confirmă ștergerea contului" })).toHaveCount(0);
  expect(calls).toBe(1);
});

test("MOCK successful account deletion signs out and shows a confirmation", async ({ page }) => {
  await accountFixture(page);
  await page.route("**/api/account", route => route.fulfill({ json: { deleted: true } }));
  await page.getByLabel("Parola contului", { exact: true }).fill("fixture-password");
  await page.getByLabel("Scrie STERGE pentru confirmare").fill("STERGE");
  await page.getByRole("button", { name: "Șterge definitiv contul", exact: true }).click();
  await expect(page).toHaveURL(/\/cont\?deleted=1$/);
  await expect(page.getByText("Contul tău a fost șters.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Intră în cont", exact: true })).toBeVisible();
});

test("account deletion endpoint rejects anonymous requests", async ({ request }) => {
  const response = await request.delete("/api/account", { data: { confirmation: "STERGE", password: "fixture-password" } });
  expect(response.status()).toBe(401);
  expect((await response.json()).code).toBe("AUTH_REQUIRED");
});
