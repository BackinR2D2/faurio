import { expect,test } from "@playwright/test";

test("deployed health endpoint identifies Faurio",async({request})=>{
  const health=await request.get("/api/health");expect(health.ok()).toBeTruthy();expect((await health.json()).service).toBe("faurio");
});
for(const path of ["/","/catalog","/makers","/sell","/sell/fees","/cont","/contact","/blog"]){
  test(`public route ${path} renders without horizontal overflow`,async({page})=>{
    const response=await page.goto(path,{waitUntil:"domcontentloaded"});expect(response?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  });
}
test("production search, pagination and anonymous authorization are safe",async({request})=>{
  const result=await request.post("/api/search",{data:{query:"as cauta un tricou maro, am un buget de 100 de lei maxim."}});
  expect(result.ok()).toBeTruthy();const body=await result.json();expect(body.configured).toBeTruthy();expect(body.products).toHaveLength(0);
  expect(body.intent.engine).toBe("groq");
  expect((await request.get("/catalog?page=99999")).status()).toBe(200);
  for(const path of ["/api/studio","/api/admin/finance","/api/admin/marketplace"]){expect((await request.get(path)).status()).toBe(401);}
});
