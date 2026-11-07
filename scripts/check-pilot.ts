import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase configuration required");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const [shops, accounts, orders, outbox] = await Promise.all([
  db.from("shops").select("status,is_legacy"),
  db.from("shop_payment_accounts").select("charges_enabled,payouts_enabled,transfers_enabled"),
  db.from("orders").select("status,stripe_session_id,total"),
  db.from("order_email_outbox").select("status"),
]);
for (const result of [shops, accounts, orders, outbox]) if (result.error) throw new Error("PILOT_READ_PROBE_FAILED");
const countBy = (rows: { status: string }[]) => rows.reduce<Record<string, number>>((counts, row) => ({ ...counts, [row.status]: (counts[row.status] || 0) + 1 }), {});
const result: Record<string, unknown> = {
  readOnly: true,
  userShops: countBy((shops.data || []).filter(row => !row.is_legacy)),
  connectedAccounts: accounts.data?.length || 0,
  paymentReadyAccounts: accounts.data?.filter(row => row.charges_enabled && row.payouts_enabled && row.transfers_enabled).length || 0,
  ordersByStatus: countBy(orders.data || []), emailOutboxByStatus: countBy(outbox.data || []), verifiesInboxDelivery: false,
};
if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const paidOrders = (orders.data || []).filter(order => order.status === "paid");
  const payments = { checked: paidOrders.length, verifiedPaidTestSessions: 0, amountMismatches: 0, unverified: 0 };
  for (const order of paidOrders) {
    try {
      if (!order.stripe_session_id) throw new Error("SESSION_MISSING");
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      if (!session.livemode && session.payment_status === "paid") {
        payments.verifiedPaidTestSessions++;
        if (session.currency !== "ron" || session.amount_total !== Math.round(Number(order.total) * 100)) payments.amountMismatches++;
      } else payments.unverified++;
    } catch { payments.unverified++; }
  }
  result.historicalPaymentVerification = payments;
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  result.productionTestWebhooks = endpoints.data.filter(endpoint => new URL(endpoint.url).origin === "https://faurio-marketplace.netlify.app").map(endpoint => ({ path: new URL(endpoint.url).pathname, enabled: endpoint.status === "enabled", testMode: !endpoint.livemode, events: endpoint.enabled_events }));
}
console.log(JSON.stringify(result, null, 2));
