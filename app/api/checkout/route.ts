import { getProductsByIds, getPromotion } from "@/lib/products";
import { getStripeClient } from "@/lib/stripe";
import { getRequestAuth } from "@/lib/supabase-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { api, readJson } from "@/lib/marketplace/http";
import { checkoutSchema } from "@/lib/commerce/checkout-input";
import { getCheckoutDestination } from "@/lib/commerce/connect";
import { calculateSellerAmounts, singleCheckoutShop } from "@/lib/commerce/fees";
import { getSiteUrl } from "@/lib/site-url";
import { createHash } from "node:crypto";
import { limitPublicForm } from "@/lib/marketplace/form-limit";
import { marketplaceReady } from "@/lib/marketplace/server";

export const POST = api(async (request) => {
  const body = await readJson(request, checkoutSchema);
  const stripe = getStripeClient();
  const admin = getSupabaseAdmin();
  if (!stripe) return Response.json({ error: "Plata online este indisponibilă momentan." }, { status: 503 });
  if (!admin) return Response.json({ error: "Baza de date nu este configurată." }, { status: 503 });
  const auth = await getRequestAuth(request);
  const fingerprint = createHash("sha256").update(JSON.stringify({ ...body, requestId: undefined, userId: auth?.user.id || null })).digest("hex");
  if (body.requestId) {
    const { data: attempt } = await admin.from("checkout_attempts").select("order_code,fingerprint").eq("id", body.requestId).maybeSingle();
    if (attempt && attempt.fingerprint !== fingerprint) return Response.json({ error: "Datele acestei încercări de plată au fost schimbate. Reîncarcă pagina." }, { status: 409 });
    if (attempt) {
      const { data: existing } = await admin.from("orders").select("stripe_session_id,status").eq("code", attempt.order_code).maybeSingle();
      if (existing && ["pending", "paid"].includes(existing.status)) {
        const session = await stripe.checkout.sessions.retrieve(String(existing.stripe_session_id));
        if (session.status === "complete") return Response.json({ url: `${getSiteUrl()}/checkout/success?session_id=${encodeURIComponent(session.id)}` });
        if (session.status === "open" && session.url) return Response.json({ url: session.url });
        return Response.json({ error: "Sesiunea de plată a expirat. Reîncearcă plata.", code: "CHECKOUT_ATTEMPT_UNAVAILABLE" }, { status: 409 });
      }
    }
  }

  const requested = body.items;
  if (await marketplaceReady()) await limitPublicForm(request, admin, "checkout");
  if (new Set(requested.map((item) => item.id)).size !== requested.length) return Response.json({ error: "Coșul conține produse duplicate. Actualizează cantitățile." }, { status: 400 });
  const products = await getProductsByIds(requested.map((item) => item.id));
  if (products.length !== requested.length || requested.some((item) => (products.find((product) => product.id === item.id)?.stock || 0) < item.quantity)) return Response.json({ error: "Un produs sau cantitatea cerută nu mai este disponibilă. Actualizează coșul." }, { status: 409 });
  if (products.some((product) => product.checkoutEligible === false)) return Response.json({ error: "Acest atelier nu are încă plățile activate. Elimină produsele sale pentru a continua." }, { status: 409 });
  let shopId: string;
  try { shopId = singleCheckoutShop(products); }
  catch (error) { return Response.json({ error: (error as Error).message }, { status: 409 }); }
  const safeItems = requested.flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.id);
    if (!product || product.stock < 1) return [];
    return [{ product, quantity: Math.max(1, Math.min(product.stock, 10, Math.floor(Number(item.quantity)))) }];
  });
  if (!safeItems.length) return Response.json({ error: "Coșul nu conține produse disponibile." }, { status: 400 });

  const promotion = await getPromotion(String(body.coupon || ""));
  const discountRate = (promotion?.discountPercent || 0) / 100;
  const origin = getSiteUrl();
  const requestId = body.requestId || crypto.randomUUID();
  let orderCode = `FAU-${new Date().getFullYear()}-${requestId.toUpperCase()}`;
  const subtotal = safeItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = subtotal >= 250 ? 0 : 19;
  const lineItems = safeItems.map(({ product, quantity }) => ({
    quantity,
    price_data: {
      currency: "ron",
      unit_amount: Math.round(product.price * 100 * (1 - discountRate)),
      product_data: { name: product.name, description: `${product.maker} · ${product.productType}`, metadata: { product_id: product.id } },
    },
  }));
  if (shipping) lineItems.push({ quantity: 1, price_data: { currency: "ron", unit_amount: shipping * 100, product_data: { name: "Livrare prin curier", description: "Livrare națională cu urmărire", metadata: { product_id: "shipping" } } } });

  const customer = body.customer || {};
  const customerName = String(customer.name || "").trim().slice(0, 120);
  const customerEmail = String(body.email || "").trim().toLowerCase().slice(0, 180);
  const shippingAddress = [customer.address, customer.city, customer.county, customer.postalCode].map((value) => String(value || "").trim()).filter(Boolean).join(", ");
  if (customerName.length < 2 || !customerEmail.includes("@") || shippingAddress.length < 8) return Response.json({ error: "Datele de livrare sunt incomplete." }, { status: 400 });

  try {
    const destination = await getCheckoutDestination(products[0].shopId);
    const paidProductsMinor = safeItems.reduce((sum, item) => sum + Math.round(item.product.price * 100 * (1 - discountRate)) * item.quantity, 0);
    const { commissionMinor } = calculateSellerAmounts(paidProductsMinor, shipping * 100);
    let expiresAt = Math.floor(Date.now() / 1000) + 1920;
    if (products[0].shopId) {
      const { data: attempt, error: attemptError } = await admin.rpc("get_checkout_attempt", { p_id: requestId, p_fingerprint: fingerprint });
      if (attemptError || !attempt) return Response.json({ error: "Încercarea de plată a expirat sau configurarea financiară este incompletă. Reîncarcă pagina și verifică migrarea.", code: "CHECKOUT_ATTEMPT_UNAVAILABLE" }, { status: 409 });
      orderCode = String(attempt.code); expiresAt = Number(attempt.expiresAt);
    }
    const session = await stripe.checkout.sessions.create({
      mode: "payment", locale: "ro", submit_type: "pay", billing_address_collection: "required",
      phone_number_collection: { enabled: true }, invoice_creation: { enabled: true }, customer_email: customerEmail,
      client_reference_id: orderCode, success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout?payment=cancelled`, expires_at: expiresAt, line_items: lineItems,
      metadata: { order_code: orderCode, user_id: auth?.user.id || "", checkout_fingerprint: fingerprint },
      ...(destination ? { payment_intent_data: { application_fee_amount: commissionMinor, transfer_data: { destination }, metadata: { order_code: orderCode, shop_id: shopId } } } : {}),
    }, { idempotencyKey: orderCode });
    if (!session.url || session.amount_total == null) throw new Error("Pagina de plată nu este disponibilă. Încearcă din nou.");

    const paidSubtotal = safeItems.reduce((sum, item) => sum + Math.round(item.product.price * 100 * (1 - discountRate)) * item.quantity, 0) / 100;
    const orderItems = safeItems.map(({ product, quantity }) => ({ id: product.id, name: product.name, quantity, unit_price: product.price, paid_unit_price: Math.round(product.price * 100 * (1 - discountRate)) / 100 }));
    const orderArguments = {
      p_code: orderCode, p_customer_name: customerName, p_customer_email: customerEmail,
      p_customer_phone: String(customer.phone || "").slice(0, 40), p_shipping_address: shippingAddress,
      p_items: orderItems, p_subtotal: subtotal, p_discount: subtotal - paidSubtotal, p_shipping: shipping,
      p_total: session.amount_total / 100, p_stripe_session_id: session.id, p_user_id: auth?.user.id || null,
    };
    const { error } = products[0].shopId ? await admin.rpc("create_marketplace_pending_order", { ...orderArguments, p_shop: shopId,
      p_account: destination, p_products_minor: paidProductsMinor, p_shipping_minor: shipping * 100 }) : await admin.rpc("create_pending_order", orderArguments);
    if (error) {
      {
        const { data: existing } = await admin.from("orders").select("stripe_session_id,customer_email,user_id,status").eq("code", orderCode).maybeSingle();
        if (existing?.stripe_session_id === session.id && existing.customer_email === customerEmail && (existing.user_id || null) === (auth?.user.id || null) && ["pending", "paid"].includes(existing.status)) return Response.json({ url: session.url });
      }
      await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
      throw new Error(error.message.includes("insufficient_stock") ? "Un produs tocmai a ieșit din stoc. Actualizează coșul și încearcă din nou." : `Comanda nu a putut fi înregistrată: ${error.message}`);
    }
    return Response.json({ url: session.url });
  } catch (error) {
    return Response.json({ error: error instanceof Error && !/stripe/i.test(error.message) ? error.message : "Plata nu a putut fi inițializată. Încearcă din nou." }, { status: 502 });
  }
});
