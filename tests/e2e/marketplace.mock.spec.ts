import {expect,test,type Page} from "@playwright/test";
import sharp from "sharp";

const id="10000000-0000-4000-8000-000000000001";
async function studioFixture(page:Page){
  test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL,"Requires configured browser Auth; transport is mocked.");
  const ref=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
  const user={id,aud:"authenticated",role:"authenticated",email:"fixture@example.test",email_confirmed_at:"2026-01-01T00:00:00Z",user_metadata:{full_name:"UI fixture"},app_metadata:{provider:"email",providers:["email"]},created_at:"2026-01-01T00:00:00Z"};
  const token=`${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({sub:id,aud:"authenticated",exp:Math.floor(Date.now()/1000)+3600})).toString("base64url")}.fixture`;
  await page.addInitScript(({ref,token,user})=>{localStorage.setItem(`sb-${ref}-auth-token`,JSON.stringify({access_token:token,refresh_token:"fixture-only",expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:"bearer",user}));},{ref,token,user});
  await page.route("**/auth/v1/**",route=>route.fulfill({json:user}));
  await page.route("**/api/shop-state",route=>route.fulfill({json:{cart:[],favorites:[]}}));
  await page.route("**/api/studio",route=>route.fulfill({json:{shops:[{id,slug:"atelier-test-ui",name:"Atelier de test UI",country:"RO",location:"Brașov",status:"active",role:"owner",is_legacy:false}]}}));
}

test("MOCK Studio: workshop selector matches catalog controls and still switches workshops", async ({ page }, info) => {
  await studioFixture(page);
  const secondId = "10000000-0000-4000-8000-000000000002";
  await page.route("**/api/studio", route => route.fulfill({ json: { shops: [
    { id, slug: "atelier-test-ui", name: "Atelier de test UI", country: "RO", location: "Brașov", status: "active", role: "owner", is_legacy: false },
    { id: secondId, slug: "atelier-secundar-ui", name: "Atelier secundar UI", country: "RO", location: "Brașov", status: "suspended", role: "owner", is_legacy: false },
  ] } }));
  await page.route("**/api/studio/orders**", route => route.fulfill({ json: { orders: [], total: 0 } }));
  await page.goto(`/studio/orders?shop=${id}`);
  const select = page.getByRole("combobox", { name: "Atelierul curent" });
  await expect(select).toBeVisible();
  await expect(select).toHaveCSS("appearance", "none");
  await expect(select).toHaveCSS("background-position", "calc(100% - 14px) 50%");
  await expect(select).toHaveCSS("padding-right", "42px");
  await expect(select).toHaveCSS("border-radius", "8px");
  await expect(select).toHaveCSS("min-height", "44px");
  await page.locator(".studio-wordmark").focus();
  await page.keyboard.press("Tab");
  await expect(select).toBeFocused();
  await expect(select).toHaveCSS("outline-style", "none");
  await expect(select).toHaveCSS("border-color", "rgb(16, 47, 56)");
  expect(await select.evaluate(element => getComputedStyle(element).boxShadow)).toContain("inset");
  await page.screenshot({ path: info.outputPath(`MOCK-studio-select-${info.project.name}.png`), fullPage: true });
  await select.selectOption(secondId);
  await expect(select).toHaveValue(secondId);
  await expect(page).toHaveURL(new RegExp(`shop=${secondId}`));
  await expect(page.locator(".studio-status")).toHaveText("Suspendat");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("MOCK Connect: fee consent is required and onboarding redirects only to Stripe",async({page},info)=>{
  await studioFixture(page);
  let requested=false;
  await page.route("**/api/studio/payments**",route=>{
    if(route.request().method()==="POST") {const body=route.request().postDataJSON();expect(body.acceptFeePolicy).toBe(true);expect(body.shopId).toBe(id);requested=true;return route.fulfill({json:{url:"https://connect.stripe.com/setup/fixture"}});}
    return route.fulfill({json:{connected:false,enabled:true,ready:false,testMode:true}});
  });
  await page.route("https://connect.stripe.com/**",route=>route.fulfill({contentType:"text/html",body:"<h1>MOCK Stripe onboarding</h1>"}));
  await page.goto(`/studio/payments?shop=${id}`);
  const connect=page.getByRole("button",{name:"Configurează încasările"});
  await expect(page.locator("main")).not.toContainText("Stripe");
  await expect(page.getByText("Mod de test",{exact:true})).toBeVisible();
  await expect(connect).toBeDisabled();
  await page.getByRole("checkbox").check();await expect(connect).toBeEnabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  await page.screenshot({path:`docs/evidence/MOCK-connect-${info.project.name}.png`,fullPage:true});
  await connect.click();await expect(page).toHaveURL("https://connect.stripe.com/setup/fixture");expect(requested).toBeTruthy();
});

test("MOCK Connect: activation error is readable and never redirects or exposes provider branding",async({page})=>{
  await studioFixture(page);
  await page.route("**/api/studio/payments**",route=>route.request().method()==="POST"
    ? route.fulfill({status:503,json:{error:"Configurarea încasărilor trebuie activată de administratorul platformei. Încearcă din nou după activare.",code:"CONNECT_ACTIVATION_REQUIRED"}})
    : route.fulfill({json:{connected:false,enabled:true,ready:false,testMode:true}}));
  await page.goto(`/studio/payments?shop=${id}`);
  await page.getByRole("checkbox").check();
  await page.getByRole("button",{name:"Configurează încasările"}).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("activată de administratorul platformei");
  await expect(page.getByRole("button",{name:"Configurează încasările"})).toBeEnabled();
  await expect(page.getByRole("checkbox")).toBeChecked();
  await expect(page).toHaveURL(new RegExp(`/studio/payments\\?shop=${id}`));
  await expect(page.locator("main")).not.toContainText("Stripe");
});

test("MOCK seller orders: real UI handles preparation, required tracking and delivery transitions",async({page},info)=>{
  await studioFixture(page);
  let state="unfulfilled";let tracking="";let carrier="";
  await page.route("**/api/studio/orders**",route=>{
    if(route.request().method()==="PATCH") {const body=route.request().postDataJSON();expect(body.shopId).toBe(id);state=body.state;tracking=body.tracking;carrier=body.carrier;return route.fulfill({json:{updated:true}});}
    return route.fulfill({json:{total:1,page:1,orders:[{code:"FAU-MOCK-ORDER",customer_name:"Alex Test",shipping_address:"Adresă fictivă de test",customer_phone:"0700000000",status:"paid",created_at:"2026-10-31T10:00:00Z",items:[{name:"Cană de test",quantity:1}],product_subtotal_minor:10000,shipping_minor:1900,fee_minor:550,seller_transfer_minor:11350,refunded_minor:0,fee_refunded_minor:0,test_mode:true,state,tracking,carrier}]}});
  });
  await page.goto(`/studio/orders?shop=${id}`);
  await expect(page.getByText("FAU-MOCK-ORDER",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Începe pregătirea"}).click();
  await expect(page.getByRole("button",{name:"Confirmă expedierea"})).toBeVisible();
  await page.getByLabel("Curier",{exact:true}).fill("Curier de test");await page.getByLabel("Număr de urmărire").fill("TEST123");
  await page.getByRole("button",{name:"Confirmă expedierea"}).click();
  await expect(page.getByText("Urmărire: Curier de test · TEST123")).toBeVisible();
  await page.getByRole("button",{name:"Confirmă livrarea"}).click();await expect(page.getByText("Livrată",{exact:true})).toBeVisible();
  expect(state).toBe("delivered");expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  await page.screenshot({path:`docs/evidence/MOCK-seller-orders-${info.project.name}.png`,fullPage:true});
});

test("MOCK product publishing: uploaded photo is included in moderated product submission",async({page},info)=>{
  await studioFixture(page);
  const src="/media/50000000-0000-4000-8000-000000000001.webp";
  let submitted:Record<string,unknown>|null=null;
  await page.route("**/api/studio/media**",route=>route.fulfill({status:201,json:{src,bytes:100}}));
  await page.route("**/api/studio/products**",route=>{
    if(route.request().method()==="POST") {submitted=route.request().postDataJSON();return route.fulfill({status:201,json:{productId:"fixture-product"}});}
    return route.fulfill({json:{products:[],previewProducts:[],total:0}});
  });
  await page.goto(`/studio/products?shop=${id}`);await page.getByRole("button",{name:"Adaugă o piesă"}).click();
  for (const select of await page.locator("select").all()) {
    await expect(select).toHaveCSS("appearance", "none");
    await expect(select).toHaveCSS("padding-right", "42px");
    await expect(select).toHaveCSS("border-radius", "8px");
  }
  await page.getByLabel("Nume",{exact:true}).fill("Cană de test UI");await page.getByLabel("Tip produs",{exact:true}).fill("Cană");
  await page.getByLabel("Material",{exact:true}).fill("ceramică");await page.getByLabel("Culoare",{exact:true}).fill("albastru");
  await page.getByLabel("Descriere",{exact:true}).fill("O cană lucrată manual pentru verificarea fluxului de publicare.");
  const buffer=await sharp({create:{width:300,height:300,channels:3,background:"#188fa7"}}).png().toBuffer();
  await page.locator('input[type="file"]').setInputFiles({name:"test-photo.png",mimeType:"image/png",buffer});
  await expect(page.getByLabel("Imagine de prezentare")).toHaveValue(src);
  await page.screenshot({path:`docs/evidence/MOCK-product-upload-${info.project.name}.png`,fullPage:true});
  await page.getByRole("button",{name:"Trimite la verificare"}).click();
  await expect(page.getByRole("status")).toContainText("Produs salvat");
  expect((submitted as {product?:{image?:string}}|null)?.product?.image).toBe(src);expect((submitted as {submit?:boolean}|null)?.submit).toBe(true);
});

test("MOCK cart: maker selection, no buyer surcharge and honest payment readiness",async({page},info)=>{
  await page.addInitScript(()=>localStorage.setItem("fir-de-poveste-cart",JSON.stringify([
    {quantity:1,product:{id:"one",name:"Vază atelier unu",shopId:"shop-one",maker:"Atelier Unu",price:100,stock:3,image:"/products/ceramica-luna.avif"}},
    {quantity:1,product:{id:"two",name:"Cană atelier doi",shopId:"shop-two",maker:"Atelier Doi",price:80,stock:2,image:"/products/ceramica-luna.avif"}}
  ])));
  let payload: {items:{id:string}[]}|null=null;
  await page.route("**/api/checkout",route=>{payload=route.request().postDataJSON();return route.fulfill({status:503,json:{error:"MOCK checkout boundary reached"}});});
  await page.goto("/cos");await expect(page.locator(".order-summary")).toContainText("Transport separat pentru 2 ateliere.");await expect(page.locator(".summary-total")).toContainText("218");
  await page.goto("/checkout");await page.getByLabel("Achită un atelier").selectOption("shop-two");
  await expect(page.locator(".checkout-summary")).toContainText("Cană atelier doi");await expect(page.locator(".checkout-summary")).not.toContainText("Vază atelier unu");
  for(const [label,value] of [["Nume","Test Buyer"],["Email","fixture@example.test"],["Telefon","0700000000"],["Adresă","Adresa fictivă 1"],["Oraș","Brașov"],["Județ","Brașov"],["Cod poștal","500000"]]) await page.getByLabel(label,{exact:true}).fill(value);
  await page.getByRole("button",{name:"Continuă",exact:true}).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Finalizează comanda.");
  await expect(page.locator(".checkout-main")).not.toContainText(/stripe/i);
  await expect(page.getByText("Mod de test. Nu se debitează bani reali. Nu folosi un card real.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath(`MOCK-checkout-payment-${info.project.name}.png`), fullPage: true });
  await page.getByRole("button", { name: "← Date de livrare", exact: true }).click();
  await expect(page.getByLabel("Nume", { exact: true })).toHaveValue("Test Buyer");
  await page.getByRole("button", { name: "Continuă", exact: true }).click();
  const paymentButton = page.getByRole("button",{name:/Continuă la plată/});
  if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) {
    await expect(paymentButton).toBeDisabled();
    await expect(page.getByText("Plata online este indisponibilă",{exact:true})).toBeVisible();
    expect(payload).toBeNull();
    return;
  }
  await paymentButton.click();await expect(page.getByText("MOCK checkout boundary reached")).toBeVisible();
  expect((payload as {items:{id:string}[]}|null)?.items).toEqual([{id:"two",quantity:1}]);
});

test("MOCK buyer history: delivered purchase permits review and return requests without claiming automatic refunds",async({page},info)=>{
  await studioFixture(page);
  await page.route("**/api/profile**",route=>route.fulfill({json:{profile:{name:"Alex",email:"fixture@example.test",phone:"",address:"",city:"",county:"",postalCode:"",newsletter:false,gifts:false},orderCount:1,orders:[{code:"FAU-MOCK-BUYER",date:"2026-10-31T10:00:00Z",total:119,paymentId:"pi_fixture",status:"paid",items:[{id:"vase-fixture",name:"Vază de test"}],progress:{state:"delivered",carrier:"Curier test",tracking:"TEST123",reviewedProductIds:[]}}]}}));
  let returned=false;let reviewed=false;
  await page.route("**/api/returns",route=>{expect(route.request().postDataJSON().code).toBe("FAU-MOCK-BUYER");returned=true;return route.fulfill({status:201,json:{submitted:true,refundNotAutomatic:true}});});
  await page.route("**/api/reviews",route=>{const body=route.request().postDataJSON();expect(body.productId).toBe("vase-fixture");expect(body.rating).toBe(5);reviewed=true;return route.fulfill({status:201,json:{submitted:true,moderationRequired:true}});});
  await page.goto("/cont/profil");await page.getByRole("button",{name:/Comenzi/}).click();
  await expect(page.getByText("Livrată",{exact:false})).toBeVisible();
  await page.getByText("Solicită returul / retragerea din comandă").click();await page.getByRole("button",{name:"Înregistrează solicitarea"}).click();
  await expect(page.getByRole("status")).toContainText("rambursarea nu este automată");expect(returned).toBeTruthy();
  await page.getByText("Lasă o recenzie · Vază de test").click();await page.getByLabel("Experiența ta").fill("O experiență excelentă, produsul este foarte bine realizat.");await page.getByRole("button",{name:"Trimite recenzia verificată"}).click();
  await expect(page.getByRole("status")).toContainText("trimisă la moderare");expect(reviewed).toBeTruthy();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  await page.screenshot({path:`docs/evidence/MOCK-buyer-orders-${info.project.name}.png`,fullPage:true});
});

test("MOCK public forms: network failures stay retryable and success requires database persistence",async({page})=>{
  let attempts=0;
  await page.route("**/api/contact",route=>{attempts++;return attempts===1?route.abort("failed"):route.fulfill({json:{accepted:true,persisted:true}});});
  await page.goto("/contact");await page.getByLabel("Nume",{exact:true}).fill("Alex Test");await page.getByLabel("Email",{exact:true}).fill("fixture@example.test");await page.getByLabel("Mesaj",{exact:true}).fill("Un mesaj suficient de lung pentru testarea suportului.");await page.getByRole("checkbox").check();
  await page.getByRole("button",{name:"Trimite",exact:true}).click();await expect(page.locator(".contact-form .form-error")).toBeVisible();await expect(page.getByRole("button",{name:"Trimite",exact:true})).toBeEnabled();
  await page.getByRole("button",{name:"Trimite",exact:true}).click();await expect(page.getByRole("heading",{name:"Mesaj înregistrat."})).toBeVisible();
  await page.route("**/api/newsletter",route=>route.fulfill({json:{accepted:true,persisted:true}}));await page.getByRole("textbox",{name:"Email newsletter"}).fill("fixture@example.test");await page.getByRole("button",{name:"Înscrie-mă"}).click();await expect(page.getByText("Te-ai înscris. Mulțumim.")).toBeVisible();
});

test("MOCK logout: another shopper never inherits the previous account's cart or favorites",async({page})=>{
  await studioFixture(page);
  const cart=[{quantity:1,product:{id:"fixture-item",name:"Vază privată de test",maker:"Atelier",price:100,stock:3,image:"/products/ceramica-luna.avif"}}];
  await page.route("**/api/shop-state",route=>route.fulfill({json:{cart,favorites:["fixture-item"]}}));
  await page.route("**/api/profile**",route=>route.fulfill({json:{profile:{name:"Alex",email:"fixture@example.test",phone:"",address:"",city:"",county:"",postalCode:"",newsletter:false,gifts:false},orders:[],orderCount:0}}));
  await page.route("**/auth/v1/logout**",route=>route.fulfill({status:204}));
  await page.goto("/cont/profil");await expect(page.locator(".header-cart b")).toHaveText("1");
  await page.getByRole("button",{name:"Ieși din cont"}).click();await expect(page).toHaveURL("/");
  await expect(page.locator(".header-cart b")).toHaveText("0");
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("fir-de-poveste-cart")||"[]"))).toEqual([]);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("fir-de-poveste-favorites")||"[]"))).toEqual([]);
});
