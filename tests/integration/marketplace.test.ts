import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { defaultLayout } from "../../lib/marketplace/contracts.ts";
import { keywordQuotaFallback } from "../../lib/search/quota-fallback.ts";

const db = new PGlite();
const sellerA = "10000000-0000-4000-8000-000000000001";
const sellerB = "10000000-0000-4000-8000-000000000002";
const operator = "10000000-0000-4000-8000-000000000003";
let shopA: string;
let shopB: string;
let productA: string;
let productB: string;

async function asUser<T>(userId: string, work: () => Promise<T>) {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [userId]);
  try { return await work(); } finally { await db.exec("reset role"); }
}
async function sqlValue<T>(sql: string, values: unknown[] = []) {
  const result = await db.query<{ value: T }>(sql, values);
  return result.rows[0]?.value;
}
async function apply(userId: string, name: string, slug: string) {
  return asUser(userId, () => sqlValue<string>("select public.apply_for_shop($1,$2,'RO','Brașov','seller-2026-10') as value", [name, slug]));
}
const product = (name: string) => ({ name, product_type: "Vază", category: "Ceramică", price: 120, stock: 3, material: "ceramică", color: "bej", description: "Vază lucrată manual, finisată cu glazură mată.", shipping_days: 3, image: "/products/ceramica-luna.avif" });

before(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated,service_role;`);
  const schema = (await readFile(new URL("../../supabase/schema.sql", import.meta.url), "utf8")).replace("create extension if not exists pgcrypto;", "");
  await db.exec(schema);
  await db.exec("grant all on all tables in schema public to service_role");
  await db.exec("insert into public.products(id,name,category,price,stock,active) values ('legacy-vase','Legacy vase','Ceramică',100,5,true)");
  await db.exec(await readFile(new URL("../../supabase/migrations/202610300001_marketplace.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../../supabase/migrations/202610300002_product_media.sql", import.meta.url), "utf8"));
  for (const migration of ["202610300003_order_emails.sql", "202610310001_ai_search.sql", "202610310002_connect_and_fees.sql", "202610310003_shop_media.sql", "202610310004_buyer_trust.sql", "202611010001_shop_lifecycle.sql", "202611060001_search_constraints.sql"]) await db.exec(await readFile(new URL(`../../supabase/migrations/${migration}`, import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../../supabase/migrations/202611070001_catalog_multi_filters.sql", import.meta.url), "utf8"));
  await db.query("insert into auth.users(id,email) values($1,'a@example.test'),($2,'b@example.test'),($3,'operator@example.test')", [sellerA, sellerB, operator]);
});
after(async () => { await db.close(); });

test("shop closure is owner-only, confirms the slug, archives public content and keeps history", async () => {
  const owner = "10000000-0000-4000-8000-000000000009";
  await db.query("insert into auth.users(id,email) values($1,'closing@example.test')", [owner]);
  const id = await apply(owner, "Atelier de închis", "atelier-de-inchis");
  await db.query("select public.moderate_marketplace($1,'shop',$2,'active','Application reviewed')", [operator, id]);
  await asUser(owner, () => db.query("select public.publish_shop_page($1,1,true)", [id]));
  const item = await asUser(owner, () => sqlValue<string>("select public.save_shop_product($1,null,$2,true) as value", [id, product("Piesă de închis")]));
  await db.query("select public.moderate_marketplace($1,'product',$2,'published','Product reviewed')", [operator, item]);
  await asUser(sellerB, () => assert.rejects(db.query("select public.close_owned_shop($1,'atelier-de-inchis')", [id]), /shop_owner_required/));
  await asUser(owner, () => assert.rejects(db.query("select public.close_owned_shop($1,'greseala')", [id]), /shop_confirmation_mismatch/));
  await db.query("insert into public.shop_payment_accounts(shop_id,stripe_account_id,charges_enabled,payouts_enabled,transfers_enabled) values($1,'acct_TestClosing',true,true,true)", [id]);
  await db.query("select public.create_pending_order('TEST-CLOSE','Buyer','buyer@example.test','','Address',$1,120,0,19,139,'cs_test_close',null)", [[{ id: item, quantity: 1 }]]);
  await db.query("select public.attach_order_finance('TEST-CLOSE',$1,'acct_TestClosing',12000,1900)", [id]);
  await asUser(owner, () => assert.rejects(db.query("select public.close_owned_shop($1,'atelier-de-inchis')", [id]), /shop_open_orders/));
  await db.exec("select public.cancel_pending_order('TEST-CLOSE')");
  await asUser(owner, () => db.query("select public.close_owned_shop($1,'atelier-de-inchis')", [id]));
  assert.equal(await sqlValue<string>("select status as value from public.shops where id=$1", [id]), "closed");
  assert.equal(await sqlValue<number>("select count(*)::int as value from public.public_shops where id=$1", [id]), 0);
  assert.equal(await sqlValue<number>("select count(*)::int as value from public.catalog_products where shop_id=$1", [id]), 0);
  assert.equal(await sqlValue<number>("select count(*)::int as value from public.products where id=$1 and listing_status='archived'", [item]), 1);
  assert.equal(await sqlValue<number>("select count(*)::int as value from public.shop_memberships where shop_id=$1", [id]), 1);
  assert.equal(await sqlValue<number>("select count(*)::int as value from public.marketplace_audit_log where shop_id=$1 and action='shop.closed'", [id]), 1);
  assert.equal(await sqlValue<number>("select count(*)::int as value from public.orders where code='TEST-CLOSE'"), 1);
  await asUser(owner, () => db.query("select public.close_owned_shop($1,'atelier-de-inchis')", [id]));
  assert.equal(await sqlValue<number>("select count(*)::int as value from public.marketplace_audit_log where shop_id=$1 and action='shop.closed'", [id]), 1);
  await asUser(owner, () => assert.rejects(db.query("select public.save_shop_product($1,null,$2,false)", [id, product("Blocată")]), /shop_access_denied/));
});

test("legacy data is backfilled without changing ID, stock, or price", async () => {
  const row = await sqlValue<{ id: string; stock: number; price: number; checkout_eligible: boolean }>("select row_to_json(p) as value from public.catalog_products p where id='legacy-vase'");
  assert.equal(row.id, "legacy-vase"); assert.equal(row.stock, 5); assert.equal(row.price, 100); assert.equal(row.checkout_eligible, true);
});

test("two authenticated sellers apply and only receive their own memberships", async () => {
  shopA = await apply(sellerA, "Atelier A", "atelier-unul");
  shopB = await apply(sellerB, "Atelier B", "atelier-doi");
  assert.notEqual(shopA, shopB);
  await asUser(sellerA, async () => {
    assert.equal(await sqlValue<number>("select count(*)::int as value from public.shops"), 1);
    assert.equal(await sqlValue<string>("select shop_id as value from public.shop_memberships"), shopA);
    assert.equal(await sqlValue<number>("select count(*)::int as value from public.shop_pages where shop_id=$1", [shopB]), 0);
    await assert.rejects(db.query("update public.shops set status='active' where id=$1", [shopA]), /permission denied/);
    await assert.rejects(db.query("insert into public.shop_memberships(shop_id,user_id,role) values($1,$2,'owner')", [shopB, sellerA]), /permission denied/);
  });
});

test("seller cannot forge another shop ID for draft, publish or product mutations", async () => {
  await asUser(sellerA, async () => {
    await assert.rejects(db.query("select public.save_shop_page($1,$2,1)", [shopB, defaultLayout("Stolen")]), /shop_access_denied/);
    await assert.rejects(db.query("select public.publish_shop_page($1,1,true)", [shopB]), /shop_access_denied/);
    await assert.rejects(db.query("select public.save_shop_product($1,null,$2,true)", [shopB, product("Stolen vase")]), /shop_access_denied/);
    await assert.rejects(db.query("select public.moderate_marketplace($1,'shop',$2,'active','Forged review')", [sellerA, shopA]), /permission denied/);
  });
});

test("pending seller cannot publish and public views expose no drafts", async () => {
  await asUser(sellerA, () => assert.rejects(db.query("select public.publish_shop_page($1,1,true)", [shopA]), /shop_approval_required/));
  await db.exec("set role anon");
  try {
    assert.equal(await sqlValue<number>("select count(*)::int as value from public.public_shops"), 1);
    await assert.rejects(db.exec("select draft from public.shop_pages"), /permission denied/);
  } finally { await db.exec("reset role"); }
});

test("moderation, distinct themes, versioned publish, private drafts and conflict protection", async () => {
  for (const id of [shopA, shopB]) await db.query("select public.moderate_marketplace($1,'shop',$2,'active','Application reviewed')", [operator, id]);
  for (const [user, id, theme, title] of [[sellerA, shopA, "clay", "Atelier de lut"], [sellerB, shopB, "botanical", "Fire din grădină"]] as const) {
    const layout = { ...defaultLayout(title), theme, story: "Poveste publicată din atelier." };
    await asUser(user, async () => {
      assert.equal(await sqlValue<number>("select public.save_shop_page($1,$2,1) as value", [id, layout]), 2);
      await assert.rejects(db.query("select public.save_shop_page($1,$2,1)", [id, layout]), /draft_conflict/);
      assert.equal(await sqlValue<number>("select public.publish_shop_page($1,2,true) as value", [id]), 3);
      await db.query("select public.save_shop_page($1,$2,3)", [id, { ...layout, title: "Private draft title" }]);
    });
  }
  assert.equal(await sqlValue<string>("select layout->>'theme' as value from public.public_shops where id=$1", [shopA]), "clay");
  assert.equal(await sqlValue<string>("select layout->>'theme' as value from public.public_shops where id=$1", [shopB]), "botanical");
  assert.equal(await sqlValue<string>("select name as value from public.public_shops where id=$1", [shopA]), "Atelier de lut");
  await asUser(sellerB, async () => assert.equal(await sqlValue<number>("select count(*)::int as value from public.shop_page_versions where shop_id=$1", [shopA]), 0));
});

test("SQL rejects unsafe layouts even when bypassing the HTTP validator", async () => {
  await asUser(sellerA, async () => {
    await assert.rejects(db.query("select public.save_shop_page($1,$2,4)", [shopA, { ...defaultLayout("Unsafe"), theme: "<script>" }]), /invalid_shop_layout/);
    await assert.rejects(db.query("select public.save_shop_page($1,$2,4)", [shopA, { ...defaultLayout("Unsafe"), cover: "https://evil.example/track.svg" }]), /invalid_shop_layout/);
  });
});

test("seller product ownership, moderation visibility, resubmission and archive", async () => {
  productA = await asUser(sellerA, () => sqlValue<string>("select public.save_shop_product($1,null,$2,true) as value", [shopA, product("Vază A")]));
  productB = await asUser(sellerB, () => sqlValue<string>("select public.save_shop_product($1,null,$2,true) as value", [shopB, product("Vază B")]));
  assert.equal(await sqlValue<number>("select count(*)::int as value from public.catalog_products where shop_id=$1", [shopA]), 0);
  await asUser(sellerA, async () => {
    assert.equal(await sqlValue<number>("select count(*)::int as value from public.products where id=$1", [productB]), 0);
    await assert.rejects(db.query("select public.save_shop_product($1,$2,$3,true)", [shopA, productB, product("Forged")]), /product_access_denied/);
    await assert.rejects(db.query("select public.archive_shop_product($1,$2)", [shopB, productB]), /shop_access_denied/);
    await assert.rejects(db.query("update public.products set active=true where id=$1", [productA]), /permission denied/);
  });
  for (const id of [productA, productB]) await db.query("select public.moderate_marketplace($1,'product',$2,'published','Product reviewed')", [operator, id]);
  assert.equal(await sqlValue<number>("select count(*)::int as value from public.catalog_products where shop_id in ($1,$2)", [shopA, shopB]), 2);
  await asUser(sellerA, () => db.query("select public.save_shop_product($1,$2,$3,false)", [shopA, productA, product("Vază A modificată")]));
  assert.equal(await sqlValue<number>("select count(*)::int as value from public.catalog_products where id=$1", [productA]), 0);
  await asUser(sellerA, () => db.query("select public.archive_shop_product($1,$2)", [shopA, productA]));
  assert.equal(await sqlValue<string>("select listing_status as value from public.products where id=$1", [productA]), "archived");
});

test("suspension and unpublish immediately remove products from every public query", async () => {
  await db.query("select public.moderate_marketplace($1,'shop',$2,'suspended','Policy investigation')", [operator, shopB]);
  assert.equal(await sqlValue<number>("select count(*)::int as value from public.catalog_products where id=$1", [productB]), 0);
  await asUser(sellerB, () => assert.rejects(db.query("select public.save_shop_page($1,$2,4)", [shopB, defaultLayout("Blocked")]), /shop_access_denied/));
  await db.query("select public.moderate_marketplace($1,'shop',$2,'active','Issue resolved')", [operator, shopB]);
  await asUser(sellerB, () => db.query("select public.publish_shop_page($1,4,false)", [shopB]));
  assert.equal(await sqlValue<number>("select count(*)::int as value from public.catalog_products where id=$1", [productB]), 0);
});

test("new-seller inventory cannot enter the legacy payment pipeline; transaction rolls back", async () => {
  const stock = await sqlValue<number>("select stock as value from public.products where id=$1", [productB]);
  await assert.rejects(db.query("select public.create_pending_order('TEST-BLOCKED','Buyer','buyer@example.test','','Address',$1,120,0,0,120,'cs_test_blocked',null)", [[{ id: productB, quantity: 1 }]]), /seller_payments_not_enabled/);
  assert.equal(await sqlValue<number>("select stock as value from public.products where id=$1", [productB]), stock);
  assert.equal(await sqlValue<number>("select count(*)::int as value from public.orders where code='TEST-BLOCKED'"), 0);
});

test("legacy stock reservations and paid/cancel idempotency survive the migration", async () => {
  await db.query("select public.create_pending_order('TEST-LEGACY','Buyer','buyer@example.test','','Address',$1,100,0,0,100,'cs_test_legacy',null)", [[{ id: "legacy-vase", quantity: 1 }]]);
  assert.equal(await sqlValue<number>("select stock as value from public.products where id='legacy-vase'"), 4);
  await db.exec("select public.complete_paid_order('TEST-LEGACY','pi_test',100,null); select public.complete_paid_order('TEST-LEGACY','pi_test',100,null); select public.cancel_pending_order('TEST-LEGACY')");
  assert.equal(await sqlValue<string>("select status as value from public.orders where code='TEST-LEGACY'"), "paid");
  assert.equal(await sqlValue<number>("select stock as value from public.products where id='legacy-vase'"), 4);
  await db.query("select public.create_pending_order('TEST-EXPIRE','Buyer','buyer@example.test','','Address',$1,100,0,0,100,'cs_test_expire',null)", [[{ id: "legacy-vase", quantity: 1 }]]);
  await db.exec("select public.cancel_pending_order('TEST-EXPIRE'); select public.cancel_pending_order('TEST-EXPIRE')");
  assert.equal(await sqlValue<number>("select stock as value from public.products where id='legacy-vase'"), 4);
});

test("audit is immutable to sellers and personal customer orders remain private", async () => {
  assert.ok(await sqlValue<number>("select count(*)::int as value from public.marketplace_audit_log") > 8);
  await asUser(sellerA, async () => {
    await assert.rejects(db.exec("select * from public.marketplace_audit_log"), /permission denied/);
    assert.equal(await sqlValue<number>("select count(*)::int as value from public.orders"), 0);
  });
});

test("new representative product media is accepted without opening arbitrary media URLs", async () => {
  const input = { ...product("Vază cu fotografie proprie modelului"), image: "/products/catalog/vaza-pamant.webp" };
  const id = await asUser(sellerA, () => sqlValue<string>("select public.save_shop_product($1,null,$2,false) as value", [shopA, input]));
  assert.equal(await sqlValue<string>("select image as value from public.products where id=$1", [id]), input.image);
  for (const image of ["https://evil.example/track.svg", "/products/catalog/unknown.webp", "/products/catalog/../ceramica-luna.avif"]) {
    await asUser(sellerA, () => assert.rejects(db.query("select public.save_shop_product($1,null,$2,false)", [shopA, { ...input, image }]), /invalid_product_image/));
  }
});

test("AI retrieval ranks the entire published catalog before paginating; all explicit constraints remain hard", async () => {
  for (let i=0; i<75; i++) await db.query("insert into public.products(id,name,product_type,category,price,stock,active,listing_status,material,color,description) values($1,$2,'Pahar','Sticlărie',80,4,true,'published','sticlă reciclată','maro',$3)", [`search-glass-${String(i).padStart(3,"0")}`, i===74 ? "Pahar pentru ritual cafea" : `Pahar simplu ${i}`, i===74 ? "Cafea și ritual de dimineață" : "Un pahar din sticlă"]);
  const intent = { productTypes: ["Pahar"], requiredTerms: [], rankingTerms: ["cafea"], filters: { maxPrice: 100, colors: ["maro"] } };
  const result = await sqlValue<{total:number;products:{id:string;price:number}[];page:number}>("select public.search_marketplace_catalog($1,'{}',1,12) as value", [intent]);
  assert.equal(result.total,75); assert.equal(result.products[0].id,"search-glass-074"); assert.equal(result.products.length,12);
  const noMatch = await sqlValue<{total:number;products:unknown[]}>("select public.search_marketplace_catalog($1,'{}',999,12) as value", [{ productTypes: [], requiredTerms: ["tricou"], rankingTerms: [], filters: {maxPrice:100,colors:["maro"]} }]);
  assert.equal(noMatch.total,0); assert.deepEqual(noMatch.products,[]);
  const last = await sqlValue<{page:number;products:unknown[]}>("select public.search_marketplace_catalog($1,'{}',999,12) as value", [intent]);
  assert.equal(last.page,7); assert.equal(last.products.length,3);
  await db.exec("set role anon"); try { await assert.rejects(db.query("select public.search_marketplace_catalog($1)",[intent]),/permission denied/); } finally { await db.exec("reset role"); }
});

test("manual multi-filters use OR within a group, AND across groups and keep query restrictions", async () => {
  await db.exec("begin");
  try {
    for (const [id, type, category, material, price] of [["multi-a", "Cană", "Ceramică", "ceramică", 90], ["multi-b", "Jurnal", "Papetărie", "hârtie", 110], ["multi-c", "Cercei", "Bijuterii", "argint", 95], ["multi-d", "Pernă", "Textile", "in", 95]]) {
      await db.query("insert into public.products(id,name,product_type,category,price,stock,active,listing_status,material,color,description) values($1,$1,$2,$3,$5,2,true,'published',$4,'bej','Multi filter fixture')", [id, type, category, material, price]);
    }
    const search = (filters: Record<string, unknown>, maxPrice = 250) => sqlValue<{ total: number; products: { id: string }[]; page: number }>("select public.search_marketplace_catalog($1,$2,999,48) as value", [{ productTypes: [], requiredTerms: ["Multi filter fixture"], filters: { maxPrice } }, filters]);
    const mixed = await search({ categories: ["Ceramică", "Papetărie"], materials: ["ceramică", "hârtie"] });
    assert.equal(mixed.total, 2); assert.equal(mixed.page, 1);
    assert.equal((await search({ categories: ["Ceramică", "Papetărie"], materials: ["argint"] })).total, 0);
    assert.equal((await search({ categories: ["Ceramică", "Papetărie"], maxPrice: 100 })).total, 1);
    assert.equal((await search({ minPrice: 100 })).total, 1);
    assert.equal((await search({ productTypes: ["Cană", "Jurnal"] })).total, 2);
    assert.equal((await search({ maxPrice: 999 }, 100)).total, 3);
    assert.deepEqual((await search({ materials: ["in"] })).products.map(row => row.id), ["multi-d"]);
  } finally { await db.exec("rollback"); }
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    try { await assert.rejects(db.exec("select public.search_marketplace_catalog('{}','{}')"), /permission denied/); } finally { await db.exec("reset role"); }
  }
});

test("keyword fallback searches real published rows with hard constraints, not semantic substitutes", async () => {
  await db.exec("begin");
  try {
    for (const [id, type, price, color] of [["quota-match", "Jurnal", 100, "verde"], ["quota-expensive", "Jurnal", 150, "verde"], ["quota-color", "Jurnal", 100, "maro"], ["quota-type", "Cană", 100, "verde"]]) {
      await db.query("insert into public.products(id,name,product_type,category,price,stock,active,listing_status,material,color,description) values($1,'Folioquota',$2,'Papetărie',$3,3,true,'published','hârtie',$4,'Produs pentru notițe')", [id, type, price, color]);
    }
    const search = (query: string, filters = {}) => sqlValue<{ total: number; products: { id: string }[]; page: number }>("select public.search_marketplace_catalog($1,$2,999,12) as value", [keywordQuotaFallback(query, "AI_PROVIDER_429"), filters]);
    const result = await search("jurnal folioquota verde între 80,50 și 132,38 lei, în stoc");
    assert.equal(result.total, 1);
    assert.equal(result.page, 1);
    assert.deepEqual(result.products.map(product => product.id), ["quota-match"]);
    assert.equal((await search("jurnal folioquota verde sub 132,38 lei", { maxPrice: 90 })).total, 0);
    assert.equal((await search("tricou maro sub 100 lei")).total, 0);
    assert.equal((await search("cadou unchiului meu profesor sub 250 lei")).total, 0);
    await db.query("update public.products set active=false where id='quota-match'");
    assert.equal((await search("jurnal folioquota verde sub 132,38 lei")).total, 0);
  } finally { await db.exec("rollback"); }
});

test("shared AI quota is bounded across clients, and cache/usage tables are private", async () => {
  assert.equal(await sqlValue<boolean>("select public.claim_search_ai_slot(2) as value"),true);
  assert.equal(await sqlValue<boolean>("select public.claim_search_ai_slot(2) as value"),true);
  assert.equal(await sqlValue<boolean>("select public.claim_search_ai_slot(2) as value"),false);
  assert.equal(await sqlValue<boolean>("select public.claim_search_ai_slot(0) as value"),false);
  await asUser(sellerA, async()=> { await assert.rejects(db.exec("select * from public.search_intent_cache"),/permission denied/); await assert.rejects(db.exec("select public.claim_search_ai_slot(1000)"),/permission denied/); });
});
test("search applies alternatives and explicit exclusions before counting and pagination", async () => {
  await db.exec("begin");
  try {
    for (const [id, type, material, color] of [["alternative-a", "Cană", "ceramică", "alb"], ["alternative-b", "Cană", "ceramică", "albastru"], ["alternative-c", "Vază", "ceramică", "maro"], ["alternative-d", "Colier", "argint", "argintiu"]]) {
      await db.query("insert into public.products(id,name,product_type,category,price,stock,active,listing_status,material,color,description) values($1,$1,$2,'Ceramică',90,2,true,'published',$3,$4,'Test alternative')", [id, type, material, color]);
    }
    const search = (filters: Record<string, unknown>) => sqlValue<{ total: number; products: { id: string }[] }>("select public.search_marketplace_catalog($1,'{}',1,48) as value", [{ productTypes: [], requiredTerms: ["Test alternative"], rankingTerms: [], filters }]);
    assert.equal((await search({ colors: ["alb", "albastru"], colorMatch: "any" })).total, 2);
    assert.equal((await search({ colors: ["alb", "albastru"], colorMatch: "all" })).total, 0);
    assert.equal((await search({ excludedProductTypes: ["Vază"], excludedColors: ["argintiu"] })).total, 2);
    assert.equal((await search({ materials: ["argint", "ceramică"], materialMatch: "any", excludedMaterials: ["in"] })).total, 4);
    assert.equal((await search({ materials: ["argint", "ceramică"], materialMatch: "all" })).total, 0);
    assert.equal((await search({ excludedMaterials: ["argint"] })).total, 3);
  } finally { await db.exec("rollback"); }
});

test("Connect eligibility enables only the correct seller; fee snapshots reconcile and seller orders are isolated", async () => {
  const id = await asUser(sellerA,()=>sqlValue<string>("select public.save_shop_product($1,null,$2,true) as value",[shopA,product("Vază cu încasări")]));
  await db.query("select public.moderate_marketplace($1,'product',$2,'published','Reviewed for test')",[operator,id]);
  await db.query("insert into public.shop_payment_accounts(shop_id,stripe_account_id,charges_enabled,payouts_enabled,transfers_enabled) values($1,'acct_TestSeller',true,true,true)",[shopA]);
  assert.equal(await sqlValue<boolean>("select checkout_eligible as value from public.catalog_products where id=$1",[id]),true);
  await db.query("select public.create_pending_order('FAU-CONNECT','Buyer','buyer@example.test','0700000000','Address',$1,120,0,19,139,'cs_test_connect',null)",[[{id,name:"Vază cu încasări",quantity:1,unit_price:120}]]);
  await assert.rejects(db.query("select public.attach_order_finance('FAU-CONNECT',$1,'acct_TestSeller',11000,1900)",[shopA]),/finance_amount_mismatch/);
  await db.query("select public.attach_order_finance('FAU-CONNECT',$1,'acct_TestSeller',12000,1900)",[shopA]);
  const finance = await sqlValue<{fee_minor:number;seller_transfer_minor:number}>("select row_to_json(f) as value from public.marketplace_order_finance f where order_code='FAU-CONNECT'");
  assert.equal(Number(finance.fee_minor),660); assert.equal(Number(finance.seller_transfer_minor),13240);
  await db.exec("select public.complete_paid_order('FAU-CONNECT','pi_connect',139,null)");
  await asUser(sellerB, async()=> { await assert.rejects(db.query("select public.seller_orders($1)",[shopA]),/shop_access_denied/); assert.equal(await sqlValue<number>("select count(*)::int as value from public.marketplace_order_finance where order_code='FAU-CONNECT'"),0); });
  await asUser(sellerA, async()=> {
    assert.equal((await sqlValue<{orders:unknown[]}>("select public.seller_orders($1) as value",[shopA])).orders.length,1);
    await assert.rejects(db.query("select public.update_seller_fulfillment($1,'FAU-CONNECT','shipped','Test','Tracking')",[shopA]),/invalid_fulfillment_transition/);
    await db.query("select public.update_seller_fulfillment($1,'FAU-CONNECT','preparing','','')",[shopA]);
    await assert.rejects(db.query("select public.update_seller_fulfillment($1,'FAU-CONNECT','shipped','','')",[shopA]),/tracking_required/);
    await db.query("select public.update_seller_fulfillment($1,'FAU-CONNECT','shipped','Test Courier','TEST123')",[shopA]);
  });
  await db.exec("select public.reconcile_order_refund('pi_connect',13900,660); select public.reconcile_order_refund('pi_connect',1000,20)");
  assert.equal(await sqlValue<string>("select status as value from public.orders where code='FAU-CONNECT'"),"refunded");
  assert.equal(Number(await sqlValue<number>("select refunded_minor as value from public.marketplace_order_finance where order_code='FAU-CONNECT'")),13900);
  await asUser(sellerA,()=>assert.rejects(db.query("select public.update_seller_fulfillment($1,'FAU-CONNECT','delivered','Test','Test')",[shopA]),/order_not_fulfillable/));
});

test("uploaded photos cannot be stolen across shops or registered by anonymous clients", async()=> {
  const asset="50000000-0000-4000-8000-000000000001";
  await db.query("select public.register_shop_media($1,$2,$3)",[shopA,sellerA,asset]);
  await db.query("update public.shop_media_assets set ready=true where id=$1",[asset]);
  const image=`/media/${asset}.webp`;
  const id=await asUser(sellerA,()=>sqlValue<string>("select public.save_shop_product($1,null,$2,false) as value",[shopA,{...product("Own photograph"),image}]));
  assert.equal(await sqlValue<string>("select image as value from public.products where id=$1",[id]),image);
  await asUser(sellerB,async()=> {
    await assert.rejects(db.query("select public.save_shop_product($1,null,$2,false)",[shopB,{...product("Stolen photograph"),image}]),/media_access_denied/);
    await assert.rejects(db.query("select public.save_shop_product_core($1,null,$2,false)",[shopB,{...product("Bypass"),image}]),/permission denied/);
    const revision=await sqlValue<number>("select revision as value from public.shop_pages where shop_id=$1",[shopB]);
    await assert.rejects(db.query("select public.save_shop_page($1,$2,$3)",[shopB,{...defaultLayout("Stolen cover"),cover:image},revision]),/media_access_denied/);
  });
  await db.exec("set role anon");try { await assert.rejects(db.query("select public.register_shop_media($1,$2,$3)",[shopA,sellerA,crypto.randomUUID()]),/permission denied/); } finally { await db.exec("reset role"); }
});

test("only delivered verified buyers can review; moderation controls ratings and return requests remain private",async()=>{
  const buyer="30000000-0000-4000-8000-000000000001";
  await db.query("insert into auth.users(id,email) values($1,'buyer@example.test')",[buyer]);
  const productId=await sqlValue<string>("select id as value from public.products where name='Vază cu încasări'");
  await db.query("select public.create_pending_order('FAU-BUYER','Buyer','buyer@example.test','','Address',$1,120,0,19,139,'cs_test_buyer',$2)",[[{id:productId,name:"Vază cu încasări",quantity:1,unit_price:120}],buyer]);
  await db.query("select public.attach_order_finance('FAU-BUYER',$1,'acct_TestSeller',12000,1900)",[shopA]);
  await db.exec("select public.complete_paid_order('FAU-BUYER','pi_buyer',139,null)");
  await asUser(buyer,()=>assert.rejects(db.query("select public.submit_product_review('FAU-BUYER',$1,5,'Really lovely product')",[productId]),/verified_delivery_required/));
  await asUser(sellerA,async()=>{
    for(const state of ["preparing","shipped","delivered"])await db.query("select public.update_seller_fulfillment($1,'FAU-BUYER',$2,'Test courier','TEST123')",[shopA,state]);
  });
  let reviewId="";let returnId="";
  await asUser(buyer,async()=>{
    reviewId=await sqlValue<string>("select public.submit_product_review('FAU-BUYER',$1,5,'Really lovely product') as value",[productId]);
    await assert.rejects(db.query("select public.submit_product_review('FAU-BUYER',$1,5,'Duplicate review')",[productId]),/unique constraint/);
    returnId=await sqlValue<string>("select public.request_order_return('FAU-BUYER','Solicit retragerea din comandă.') as value");
    assert.equal(await sqlValue<number>("select count(*)::int as value from public.return_requests"),1);
    const progress=await sqlValue<{code:string;state:string;returnStatus:string}[]>("select public.buyer_order_progress() as value");
    assert.equal(progress[0].code,"FAU-BUYER");assert.equal(progress[0].state,"delivered");assert.equal(progress[0].returnStatus,"submitted");
  });
  assert.equal(await sqlValue<number>("select count(*)::int as value from public.public_product_reviews"),0);
  await asUser(sellerB,async()=>{
    assert.equal(await sqlValue<number>("select count(*)::int as value from public.return_requests"),0);
    await assert.rejects(db.query("select public.request_order_return('FAU-BUYER','Forged return request')"),/order_access_denied/);
    await assert.rejects(db.query("select public.moderate_buyer_feedback($1,'reviews',$2,'approved','Forged moderation')",[sellerB,reviewId]),/permission denied/);
  });
  await db.query("select public.moderate_buyer_feedback($1,'reviews',$2,'approved','Verified purchase and content')",[operator,reviewId]);
  assert.equal(await sqlValue<number>("select count(*)::int as value from public.public_product_reviews"),1);
  assert.equal(await sqlValue<number>("select reviews as value from public.products where id=$1",[productId]),1);
  assert.equal(Number(await sqlValue<number>("select rating as value from public.products where id=$1",[productId])),5);
  await db.query("select public.moderate_buyer_feedback($1,'returns',$2,'reviewing','Solicitarea este în analiză.')",[operator,returnId]);
  assert.equal(await sqlValue<string>("select status as value from public.orders where code='FAU-BUYER'"),"paid");
  await db.exec("set role anon");try{await assert.rejects(db.exec("select * from public.product_reviews"),/permission denied/);assert.equal(await sqlValue<number>("select count(*)::int as value from public.public_product_reviews"),1);}finally{await db.exec("reset role");}
});

test("stale SMTP leases become uncertain instead of being sent again",async()=>{
  const claim=await sqlValue<{id:string;lock_token:string;attempts:number}>("select row_to_json(e) as value from public.claim_order_email('FAU-BUYER') e");
  assert.ok(claim);
  await db.query("select public.prepare_order_email($1,$2,$3)",[claim.id,claim.lock_token,{delivery_provider:"smtp",text:"fixture"}]);
  await db.query("update public.order_email_outbox set locked_at=now()-interval '6 minutes' where id=$1",[claim.id]);
  assert.equal(await sqlValue<number>("select count(*)::int as value from public.claim_order_email('FAU-BUYER')"),0);
  assert.equal(await sqlValue<string>("select status as value from public.order_email_outbox where id=$1",[claim.id]),"uncertain");
});

test("public form rate limits are shared, atomic, bounded and not client-writable",async()=>{
  const key="a".repeat(64);
  for(let i=0;i<10;i++)assert.equal(await sqlValue<boolean>("select public.claim_public_form_slot('contact',$1) as value",[key]),true);
  assert.equal(await sqlValue<boolean>("select public.claim_public_form_slot('contact',$1) as value",[key]),false);
  assert.equal(await sqlValue<boolean>("select public.claim_public_form_slot('contact','forged') as value"),false);
  await asUser(sellerA,()=>assert.rejects(db.query("select public.claim_public_form_slot('contact',$1)",["b".repeat(64)]),/permission denied/));
});

test("checkout retry identity is durable, changed input is rejected and order/finance reserve atomically",async()=>{
  const attemptId="60000000-0000-4000-8000-000000000001";const hash="a".repeat(64);
  const first=await sqlValue<{code:string;expiresAt:number}>("select public.get_checkout_attempt($1,$2) as value",[attemptId,hash]);
  assert.deepEqual(await sqlValue("select public.get_checkout_attempt($1,$2) as value",[attemptId,hash]),first);
  await assert.rejects(db.query("select public.get_checkout_attempt($1,$2)",[attemptId,"b".repeat(64)]),/checkout_attempt_changed/);
  const productId=await sqlValue<string>("select id as value from public.products where name='Vază cu încasări'");
  const stock=await sqlValue<number>("select stock as value from public.products where id=$1",[productId]);
  const args=[first.code,JSON.stringify([{id:productId,name:"Vază cu încasări",quantity:1,unit_price:120}]),shopA];
  await assert.rejects(db.query("select public.create_marketplace_pending_order($1,'Buyer','buyer@example.test','','Address',$2,120,0,19,139,'cs_test_atomic',null,$3,'acct_TestSeller',11000,1900)",args),/finance_amount_mismatch/);
  assert.equal(await sqlValue<number>("select stock as value from public.products where id=$1",[productId]),stock);
  assert.equal(await sqlValue<number>("select count(*)::int as value from public.orders where code=$1",[first.code]),0);
  await db.query("select public.create_marketplace_pending_order($1,'Buyer','buyer@example.test','','Address',$2,120,0,19,139,'cs_test_atomic',null,$3,'acct_TestSeller',12000,1900)",args);
  await assert.rejects(db.query("select public.create_marketplace_pending_order($1,'Buyer','buyer@example.test','','Address',$2,120,0,19,139,'cs_test_atomic',null,$3,'acct_TestSeller',12000,1900)",args),/unique constraint|insufficient_stock/);
  assert.equal(await sqlValue<number>("select stock as value from public.products where id=$1",[productId]),stock-1);
  await db.query("select public.cancel_pending_order($1)",[first.code]);
});
