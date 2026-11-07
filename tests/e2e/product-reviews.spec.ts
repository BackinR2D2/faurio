import { expect, test, type Page } from "@playwright/test";

const productId = "cana-luna-001";
const productPath = `/produs/${productId}`;
async function signInFixture(page: Page) {
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
  const user = { id: "10000000-0000-4000-8000-000000000001", aud: "authenticated", role: "authenticated", email: "fixture@example.test", email_confirmed_at: "2026-01-01T00:00:00Z", user_metadata: { full_name: "Client de test" }, app_metadata: { provider: "email", providers: ["email"] }, created_at: "2026-01-01T00:00:00Z" };
  const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: user.id, aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.fixture`;
  await page.addInitScript(({ ref, user, token }) => localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({ access_token: token, refresh_token: "fixture-only", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user })), { ref, user, token });
  await page.route("**/auth/v1/**", route => route.fulfill({ json: user }));
  await page.route("**/api/shop-state", route => route.fulfill({ json: { cart: [], favorites: [] } }));
}
test.beforeEach(() => test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, "Uses a real catalog product; only stated browser transports are mocked."));
test("catalog always exposes five stars and the review count linked to the product",async({page})=>{
  await page.goto('/catalog');
  const link=page.locator('.product-rating-link').first();
  await expect(link.locator('.product-rating-star')).toHaveCount(5);
  await expect(link).toContainText(/0 recenzii|\(\d+\)/);
  await expect(link).toHaveAttribute('href',/\/produs\/[^/]+#recenzii$/);
  await link.click();
  await expect(page.getByRole('heading',{name:'Recenzii și comentarii'})).toBeVisible();
});

test("every real product exposes its review section and anonymous visitors return there after sign-in", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(productPath);
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Scrie prima recenzie" })).toBeVisible();
  await page.getByRole("link", { name: "Scrie prima recenzie" }).click();
  await expect(page.getByRole("heading", { name: "Recenzii și comentarii" })).toBeVisible();
  await page.locator("#recenzii").getByRole("link", { name: "Autentifică-te", exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === "/cont" && url.searchParams.get("next") === `${productPath}#recenzii`);
  await expect(page.getByRole("heading", { name: "Bine ai revenit" })).toBeVisible();
  expect((await request.get(`/api/reviews?productId=${productId}`)).status()).toBe(200);
  expect((await request.get(`/api/reviews?productId=${productId}&mode=eligibility`)).status()).toBe(401);
  expect((await request.get("/api/reviews?productId=missing-product" )).status()).toBe(404);
  expect((await request.post("/api/reviews", { data: {} })).status()).toBe(401);
  expect(errors).toEqual([]);
});

test("MOCK eligible buyer selects stars, comments, retries a rejected submission and sees moderation status", async ({ page }, info) => {
  await signInFixture(page);
  let calls = 0;
  await page.route("**/api/reviews**", route => {
    if (route.request().method() === "GET") return route.fulfill({ json: { verifiedPurchase: false, hasReview: false, ownProduct: false } });
    const body = route.request().postDataJSON();
    expect(body).toEqual({ productId, rating: 4, body: "Finisaj frumos, ambalare atentă și un produs bine realizat." });
    calls++;
    return calls === 1 ? route.fulfill({ status: 503, json: { error: "Trimitere indisponibilă momentan." } }) : route.fulfill({ status: 201, json: { submitted: true, moderationRequired: true } });
  });
  await page.goto(`${productPath}#recenzii`);
  const form = page.locator(".feedback-form");
  await expect(form).toBeVisible();
  await expect(form.getByRole("button", { name: "Trimite recenzia" })).toBeDisabled();
  await page.getByRole("radio", { name: "4 stele", exact: true }).check();
  await page.getByRole("textbox", { name: "Comentariul tău" }).fill("Finisaj frumos, ambalare atentă și un produs bine realizat.");
  await expect(form.getByRole("button", { name: "Trimite recenzia" })).toBeEnabled();
  await expect(page.getByRole("radio", { name: "4 stele", exact: true })).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator("#recenzii").screenshot({ path: info.outputPath(`MOCK-review-form-${info.project.name}.png`) });
  await form.getByRole("button", { name: "Trimite recenzia" }).click();
  await expect(page.locator("#recenzii").getByRole("alert")).toHaveText("Trimitere indisponibilă momentan.");
  await expect(page.getByRole("textbox", { name: "Comentariul tău" })).toHaveValue("Finisaj frumos, ambalare atentă și un produs bine realizat.");
  await form.getByRole("button", { name: "Trimite recenzia" }).click();
  await expect(page.getByRole("status")).toContainText("trimise la moderare");
  await expect(form).toHaveCount(0);
  expect(calls).toBe(2);
});

test("MOCK published reviews paginate, escape HTML and retain content on a failed refresh", async ({ page }) => {
  let fail = false;
  await page.route("**/api/reviews**", route => {
    if (fail) return route.fulfill({ status: 503, json: { error: "Unavailable" } });
    const second = new URL(route.request().url()).searchParams.get("page") === "2";
    return route.fulfill({ json: { reviews: [{ id: second ? "second" : "first", rating: 5, body: second ? "Comentariu de pe pagina a doua." : '<img src=x onerror="alert(1)"> Text afișat literal.', created_at: "2026-11-07T10:00:00Z" }], total: 11, rating: 4.8, page: second ? 2 : 1, pageCount: 2, available: true } });
  });
  await page.goto(`${productPath}#recenzii`);
  await page.getByRole("button", { name: "Actualizează recenziile" }).click();
  await expect(page.locator(".feedback-review")).toContainText('<img src=x onerror="alert(1)">');
  await expect(page.locator(".feedback-review img")).toHaveCount(0);
  await expect(page.locator(".feedback-score")).toContainText("4,8");
  await page.getByRole("button", { name: "Recenzii următoare" }).click();
  await expect(page.locator(".feedback-review")).toContainText("pagina a doua");
  await expect(page.getByRole("button", { name: "Recenzii următoare" })).toBeDisabled();
  fail = true;
  await page.getByRole("button", { name: "Actualizează recenziile" }).click();
  await expect(page.locator("#recenzii").getByRole("alert")).toContainText("nu au putut fi încărcate");
  await expect(page.locator(".feedback-review")).toContainText("pagina a doua");
});

test("MOCK opinions need no purchase, while own-product and duplicate reviews are blocked", async ({ page }) => {
  await signInFixture(page);
  let state = { verifiedPurchase: false, hasReview: false, ownProduct: false };
  await page.route("**/api/reviews**", route => route.fulfill({ json: state }));
  await page.goto(`${productPath}#recenzii`);
  await expect(page.locator(".feedback-form")).toBeVisible();
  await expect(page.locator(".feedback-form")).not.toContainText("Achiziție verificată");
  state = { verifiedPurchase: true, hasReview: false, ownProduct: false };
  await page.reload();
  await expect(page.locator(".feedback-form")).toContainText("Achiziție verificată");
  state = { verifiedPurchase: false, hasReview: true, ownProduct: false };
  await page.reload();
  await expect(page.locator(".feedback-compose")).toContainText("Ai trimis deja o recenzie");
  state = { verifiedPurchase: false, hasReview: false, ownProduct: true };
  await page.reload();
  await expect(page.locator(".feedback-compose")).toContainText("propriului atelier");
  await expect(page.locator(".feedback-form")).toHaveCount(0);
});

test("MOCK existing authenticated session returns from sign-in to the exact product review section", async ({ page }) => {
  await signInFixture(page);
  await page.route("**/api/reviews**", route => route.fulfill({ json: { verifiedPurchase: false, hasReview: false, ownProduct: false } }));
  await page.goto(`/cont?next=${encodeURIComponent(`${productPath}#recenzii`)}`);
  await expect(page).toHaveURL(url => url.pathname === productPath && url.hash === "#recenzii");
  await expect(page.getByRole("heading", { name: "Recenzii și comentarii" })).toBeVisible();
});

test("MOCK operator can inspect the product and publish a reviewed comment with an audit reason", async ({ page }, info) => {
  await signInFixture(page);
  let status = "pending";
  await page.route("**/api/admin/feedback**", route => {
    if (route.request().method() === "PATCH") {
      expect(route.request().postDataJSON()).toEqual({ kind: "reviews", id: "10000000-0000-4000-8000-000000000003", status: "approved", reason: "Achiziție verificată și conținut relevant." });
      status = "approved";
      return route.fulfill({ json: { updated: true } });
    }
    return route.fulfill({ json: { total: 1, records: [{ id: "10000000-0000-4000-8000-000000000003", order_code: "FAU-QA-RECENZIE", product_id: productId, rating: 4, body: "Finisaj frumos și ambalare atentă.", status }] } });
  });
  await page.goto("/admin/feedback");
  await expect(page.getByRole("link", { name: "Vezi produsul" })).toHaveAttribute("href", productPath);
  await page.locator('select[name="status"]').selectOption("approved");
  await page.getByLabel("Motiv / răspuns pentru cumpărător").fill("Achiziție verificată și conținut relevant.");
  await page.screenshot({ path: info.outputPath(`MOCK-review-moderation-${info.project.name}.png`) });
  await page.getByRole("button", { name: "Salvează decizia" }).click();
  await expect(page.locator(".seller-order")).toContainText("approved");
  expect(status).toBe("approved");
});
