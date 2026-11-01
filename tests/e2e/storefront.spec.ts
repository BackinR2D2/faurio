import { expect, test } from "@playwright/test";

test("homepage query works with keyboard and preserves URL", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ce cauți");
  await page.screenshot({ path: `docs/evidence/home-${info.project.name}.png`, fullPage: true });
  await page.getByRole("textbox", { name: "Descrie în limbaj natural ce produs cauți" }).fill("pahare sub 100 lei");
  await page.getByRole("textbox", { name: "Descrie în limbaj natural ce produs cauți" }).press("Enter");
  await expect(page).toHaveURL(/catalog\?q=/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Potriviri precise");
  if (process.env.GROQ_API_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY) await expect(page.locator(".understanding")).toContainText("maximum 100 lei");
  else {
    await expect(page.locator(".empty-state[role=alert]")).toContainText("Nu am putut finaliza căutarea");
    await expect(page.locator(".product-card")).toHaveCount(0);
  }
  await page.screenshot({ path: `docs/evidence/search-${info.project.name}.png`, fullPage: true });
});

test("real database search never returns over-budget or mismatched product types", async ({ request }) => {
  test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, "Requires configured Supabase, no data is fabricated.");
  const response = await request.post("/api/search", { data: { query: "pahare sub 100 lei" } });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.configured).toBeTruthy();
  expect(body.products.length).toBeGreaterThan(0);
  for (const product of body.products) { expect(product.price).toBeLessThanOrEqual(100); expect(["Pahar", "Set de pahare"]).toContain(product.productType); }
});

test("brown T-shirt request stays exact instead of returning unrelated cheap products", async ({ page, request }, info) => {
  test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, "Requires configured Supabase.");
  const query = "as cauta un tricou maro, am un buget de 100 de lei maxim.";
  const response = await request.post("/api/search", { data: { query } });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.intent.freeText).toBe("tricou");
  expect(body.intent.filters.color).toBe("maro");
  expect(body.intent.filters.maxPrice).toBe(100);
  expect(body.total).toBe(0);
  expect(body.products).toHaveLength(0);
  await page.goto(`/catalog?q=${encodeURIComponent(query)}`);
  await expect(page.locator(".understanding")).toContainText("tricou");
  await expect(page.locator(".understanding")).toContainText("culoare maro");
  await expect(page.getByRole("heading", { name: "Nicio potrivire exactă" })).toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(0);
  await page.screenshot({ path: `docs/evidence/search-shirt-${info.project.name}.png`, fullPage: true });
});

test("product-specific photos come from the database and details do not invent extra views", async ({ page, request }, info) => {
  test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, "Requires configured Supabase and synchronized demo media.");
  for (const [id, type, image] of [
    ["patura-molid-001", "Pătură", "/products/catalog/patura-molid.webp"],
    ["perna-apus-001", "Pernă", "/products/catalog/perna-apus.webp"],
    ["broderie-ierbar-001", "Broderie", "/products/catalog/broderie-ierbar.webp"],
    ["cercei-frunza-001", "Cercei", "/products/catalog/cercei-frunza.webp"],
    ["colier-roua-001", "Colier", "/products/catalog/colier-roua.webp"],
  ]) {
    const response = await request.get(`/api/products?ids=${id}`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.products).toHaveLength(1);
    for (const product of body.products) {
      expect(product.productType).toBe(type);
      expect(product.image).toBe(image);
    }
    const asset = await request.get(image);
    expect(asset.ok()).toBeTruthy();
    expect(asset.headers()["content-type"]).toContain("image/webp");
  }
  await page.goto("/catalog?categorie=Textile&sort=nou");
  await expect.poll(() => page.locator(".product-card img").first().evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: `docs/evidence/catalog-textiles-${info.project.name}.png` });
  await page.goto("/produs/patura-molid-001");
  await expect(page.locator(".gallery-main img")).toHaveCount(1);
  await expect(page.locator(".gallery-pair")).toHaveCount(0);
  await expect(page.locator(".gallery-main")).toContainText("Imagine ilustrativă");
  await expect.poll(() => page.locator(".gallery-main img").evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: `docs/evidence/product-blanket-${info.project.name}.png` });
});

test("unknown currency gives an honest empty state and pagination never crashes", async ({ page, request }) => {
  await page.goto("/catalog?q=personalized+gift+under+50+EUR");
  if (process.env.GROQ_API_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY) await expect(page.getByRole("status")).toContainText("RON");
  else await expect(page.locator(".empty-state[role=alert]")).toContainText("Nu am putut finaliza căutarea");
  await expect(page.locator(".product-card")).toHaveCount(0);
  const response = await request.get("/catalog?page=999");
  expect(response.status()).toBe(200);
  expect((await request.get("/catalog?page=1e100")).status()).toBe(200);
});

test("seller registration entry and Studio require authentication", async ({ page }, info) => {
  await page.goto("/sell");
  await expect(page.getByRole("link", { name: "Intră sau creează cont" })).toBeVisible();
  await page.screenshot({ path: `docs/evidence/sell-${info.project.name}.png`, fullPage: true });
  await page.getByRole("link", { name: "Intră sau creează cont" }).click();
  await expect(page).toHaveURL(/cont\?next=\/sell/);
  await page.goto("/studio/appearance");
  await expect(page.getByRole("heading", { name: "Intră în atelier." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Intră în cont", exact: true })).toBeVisible();
});

test("API denies anonymous tenant and moderation mutations", async ({ request }) => {
  for (const path of ["/api/studio", "/api/studio/products?shop=10000000-0000-4000-8000-000000000001", "/api/studio/appearance?shop=10000000-0000-4000-8000-000000000001", "/api/admin/marketplace"]) {
    const response = await request.get(path); expect(response.status()).toBe(401); expect((await response.json()).code).toBe("AUTH_REQUIRED");
  }
  const mutation = await request.post("/api/shops", { data: { status: "active" } });
  expect(mutation.status()).toBe(401);
  const malformed = await request.post("/api/search", { data: Buffer.from("{"), headers: { "Content-Type": "application/json" } });
  expect(malformed.status()).toBe(400); expect((await malformed.json()).code).toBe("INVALID_JSON");
});

test("new marketplace endpoints deny anonymous writes and public forms reject malformed input",async({request})=>{
  for(const [path,data] of [["/api/reviews",{}],["/api/returns",{}],["/api/admin/refunds",{}],["/api/studio/payments",{shopId:"10000000-0000-4000-8000-000000000001",action:"onboard",acceptFeePolicy:true}]] as const){expect((await request.post(path,{data})).status()).toBe(401);}
  for(const path of ["/api/contact","/api/newsletter"]){
    expect((await request.post(path,{data:"{",headers:{"Content-Type":"application/json"}})).status()).toBe(400);
    expect((await request.post(path,{data:{email:"invalid"}})).status()).toBe(400);
  }
});

test("seller landing has no horizontal overflow at the target viewport", async ({ page }) => {
  await page.goto("/sell");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test("WebGL unavailable keeps the vase poster and search usable", async ({ page }, info) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", { value: function(this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
      if (kind.includes("webgl")) return null;
      return Reflect.apply(original, this, [kind, ...args]);
    } });
  });
  await page.goto("/");
  if (info.project.name === "mobile-chrome") await page.getByRole("button", { name: "Explorează obiectul în 3D" }).click();
  await expect(page.getByText("Previzualizarea statică rămâne disponibilă pe acest dispozitiv.")).toBeVisible();
  await expect(page.getByRole("img", { name: "Vază ceramică pictată — previzualizare a unei piese de atelier" })).toBeVisible();
  await page.getByRole("textbox", { name: "Descrie în limbaj natural ce produs cauți" }).fill("pahare");
  await page.getByRole("button", { name: "Găsește produsele potrivite" }).click();
  await expect(page).toHaveURL(/catalog\?q=pahare/);
});

test.describe("progressive enhancement", () => {
  test.use({ javaScriptEnabled: false });
  test("search submits as an HTML form without JavaScript", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("textbox", { name: "Descrie în limbaj natural ce produs cauți" }).fill("pahare");
    await page.getByRole("button", { name: "Găsește produsele potrivite" }).click();
    await expect(page).toHaveURL(/catalog\?q=pahare/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Potriviri precise");
  });
});
