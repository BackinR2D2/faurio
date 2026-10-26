import { products } from "@/lib/catalog";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    items?: Array<{ id: string; quantity: number }>;
    email?: string;
    origin?: string;
  };
  const safeItems = (body.items || []).flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.id);
    if (!product) return [];
    return [{ product, quantity: Math.max(1, Math.min(10, Number(item.quantity) || 1)) }];
  });
  if (!safeItems.length) return Response.json({ error: "Coșul este gol." }, { status: 400 });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    const params = new URLSearchParams({
      mode: "payment",
      customer_email: String(body.email || ""),
      success_url: `${body.origin || "https://example.com"}/?payment=success`,
      cancel_url: `${body.origin || "https://example.com"}/?payment=cancelled`,
      "payment_method_types[0]": "card",
    });
    safeItems.forEach(({ product, quantity }, index) => {
      params.set(`line_items[${index}][quantity]`, String(quantity));
      params.set(`line_items[${index}][price_data][currency]`, "ron");
      params.set(`line_items[${index}][price_data][unit_amount]`, String(product.price * 100));
      params.set(`line_items[${index}][price_data][product_data][name]`, product.name);
    });
    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const session = (await stripeResponse.json()) as { url?: string; error?: { message?: string } };
    if (!stripeResponse.ok || !session.url) {
      return Response.json({ error: session.error?.message || "Stripe nu a putut inițializa plata." }, { status: 502 });
    }
    return Response.json({ mode: "stripe", url: session.url });
  }

  return Response.json({
    mode: "demo",
    paymentId: `pi_test_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`,
    message: "Plată sandbox aprobată. Nu s-au transferat bani.",
  });
}
