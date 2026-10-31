import { getStripeClient } from "@/lib/stripe";
import { syncConnectedAccount } from "@/lib/commerce/connect";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const stripe = getStripeClient(); const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!stripe || !secret) return Response.json({ error: "Connect webhook neconfigurat." }, { status: 503 });
  let event;
  try { event = stripe.webhooks.constructEvent(await request.text(), request.headers.get("stripe-signature") || "", secret); }
  catch { return Response.json({ error: "Semnătură invalidă." }, { status: 400 }); }
  try { if (event.type === "account.updated") await syncConnectedAccount(await stripe.accounts.retrieve(event.data.object.id)); }
  catch { return Response.json({ error: "Sincronizarea va fi reîncercată." }, { status: 500 }); }
  return Response.json({ received: true });
}
