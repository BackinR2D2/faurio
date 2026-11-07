import { expect,test } from "@playwright/test";

test("deployed health endpoint identifies Faurio",async({request})=>{
  const health=await request.get("/api/health");expect(health.ok()).toBeTruthy();expect((await health.json()).service).toBe("faurio");
});
for(const path of ["/","/catalog","/makers","/sell","/sell/fees","/cont","/contact","/blog"]){
  test(`public route ${path} renders without horizontal overflow`,async({page},info)=>{
    const response=await page.goto(path,{waitUntil:"domcontentloaded"});expect(response?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
    if (path === "/" || path === "/catalog") {
      await page.evaluate(() => document.fonts.ready);
      if (path === "/" && (page.viewportSize()?.width || 0) > 800) await expect(page.locator(".artisan-orbit")).toHaveAttribute("data-loaded", "true", { timeout: 25000 });
      if (path === "/catalog") {
        if ((page.viewportSize()?.width || 0) <= 850) await page.getByRole("button", { name: "Filtre", exact: true }).click();
        const select = page.locator('summary[aria-label="Material"]');
        await expect(select.locator("svg")).toBeVisible();
        await expect(select).toHaveCSS("padding-right", "14px");
        await expect(select).toHaveCSS("border-radius", "8px");
      }
      await page.screenshot({ path: info.outputPath(`PUBLIC-${path === "/" ? "home" : "catalog"}-${info.project.name}.png`) });
    }
  });
}
test("production search, pagination and anonymous authorization are safe",async({request})=>{
  const result=await request.post("/api/search",{data:{query:"as cauta un tricou maro, am un buget de 100 de lei maxim."}});
  expect(result.ok()).toBeTruthy();const body=await result.json();expect(body.configured).toBeTruthy();expect(body.products).toHaveLength(0);
  expect(body.intent.engine).toBe("groq");
  expect((await request.get("/catalog?page=99999")).status()).toBe(200);
  for(const path of ["/api/studio","/api/admin/finance","/api/admin/marketplace"]){expect((await request.get(path)).status()).toBe(401);}
});
test("published search keeps alternatives and explicit exclusions", async ({ request }) => {
  const cases = [
    { query: "O cană albă sau albastră, maxim 160 lei", max: 160, colors: true },
    { query: "Cadou pentru profesor, fără vaze sau căni, nu maro, buget maxim 250 lei", max: 250, exclusions: true },
  ];
  for (const fixture of cases) {
    const response = await request.post("/api/search", { data: { query: fixture.query } });
    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.intent.engine).toBe("groq");
    expect(result.products.length).toBeGreaterThan(0);
    if (fixture.colors) expect(result.intent.filters.colorMatch).toBe("any");
    if (fixture.exclusions) expect(result.intent.filters.excludedProductTypes).toEqual(expect.arrayContaining(["Cană", "Vază"]));
    for (const product of result.products) {
      expect(product.price).toBeLessThanOrEqual(fixture.max);
      if (fixture.colors) expect(product.color).toMatch(/\b(?:alb|albastru)\b/);
      if (fixture.exclusions) expect(["Cană", "Vază"]).not.toContain(product.productType);
    }
  }
});
test("detailed new models are available on the public deployment", async ({ request }) => {
  for (const path of ["/models/bronze-whale/bronze_whale_statue_2k.gltf", "/models/brass-vase-04/brass_vase_04_2k.gltf"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const asset = await response.json();
    expect(asset.materials.every((material: { normalTexture?: unknown; pbrMetallicRoughness?: { baseColorTexture?: unknown } }) => material.normalTexture && material.pbrMetallicRoughness?.baseColorTexture)).toBe(true);
  }
});

test("admin entry and reload hydrate without errors and unsigned payment events are rejected", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error" && /hydrat|didn't match|server rendered/i.test(message.text())) errors.push(message.text()); });
  for (const path of ["/admin", "/admin/marketplace", "/admin/finance", "/admin/feedback"]) {
    await page.goto(path);
    await expect(page.locator("main h1").first()).toBeVisible();
    await page.reload();
    await expect(page.locator("main h1").first()).toBeVisible();
    await expect(page.locator(".site-header .brand small")).toHaveCount(0);
  }
  expect(errors).toEqual([]);
  for (const path of ["/api/stripe/webhook", "/api/stripe/connect"]) {
    expect((await request.post(path, { data: {} })).status()).toBe(400);
    expect((await request.post(path, { data: {}, headers: { "stripe-signature": "invalid-fixture-signature" } })).status()).toBe(400);
  }
});

test("public catalog preserves multiple manual selections and interpreted budget and material", async ({ page }) => {
  await page.goto(`/catalog?${new URLSearchParams([["categorie", "Ceramică"], ["categorie", "Sticlărie"], ["material", "ceramică glazurată"], ["material", "sticlă reciclată"]])}`);
  await expect(page.locator(".category-tabs button.active")).toHaveText(["Ceramică", "Sticlărie"]);
  await expect(page.locator(".product-card").first()).toBeVisible();
  if ((page.viewportSize()?.width || 0) <= 850) await page.getByRole("button", { name: "Filtre", exact: true }).click();
  await expect(page.locator('summary[aria-label="Material"]')).toContainText("ceramică glazurată");
  await expect(page.locator('summary[aria-label="Material"]')).toContainText("sticlă reciclată");
  await page.goto(`/catalog?q=${encodeURIComponent("O cană din ceramică sub 180 lei")}`);
  await expect(page.locator(".product-card").first()).toBeVisible();
  if ((page.viewportSize()?.width || 0) <= 850) await page.getByRole("button", { name: "Filtre", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Preț maxim în lei" })).toHaveValue("180");
  await expect(page.locator('summary[aria-label="Material"]')).toContainText("ceramică");
  await expect(page.locator('summary[aria-label="Categorie"]')).toContainText("Ceramică");
  await expect(page.locator('summary[aria-label="Tip de produs"]')).toContainText("Cană");
});
