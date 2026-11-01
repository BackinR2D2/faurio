import { isMissingSchema } from "@/lib/marketplace/http";
import { api, databaseError, isOperatorUser, readJson, requireAuth } from "@/lib/marketplace/http";
import { z } from "zod";

export const GET = api(async (request) => {
  const auth = await requireAuth(request);
  const { data, error } = await auth.supabase.from("profiles").select("name, phone, address, city, county, postal_code, newsletter, gifts").eq("user_id", auth.user.id).maybeSingle();
  databaseError(error);
  const page = Math.max(1, Math.min(10000, Math.trunc(Number(new URL(request.url).searchParams.get("page")) || 1)));
  const { data: orders, error: ordersError, count } = await auth.supabase.from("orders").select("code, created_at, total, payment_id, status,items", { count: "exact" }).eq("user_id", auth.user.id).order("created_at", { ascending: false }).order("code").range((page - 1) * 25, page * 25 - 1);
  if (ordersError?.code !== "PGRST103") databaseError(ordersError);
  const { data: progress, error: progressError } = await auth.supabase.rpc("buyer_order_progress", { p_page: page });
  if (progressError && !isMissingSchema(progressError)) return Response.json({ error: "Istoricul comenzilor nu a putut fi citit." }, { status: 500 });
  const orderProgress = (progress || []) as { code: string }[];
  return Response.json({
    orderCount: count || 0, page, isOperator: isOperatorUser(auth.user),
    profile: data ? { name: data.name, email: auth.user.email, phone: data.phone, address: data.address, city: data.city, county: data.county, postalCode: data.postal_code, newsletter: data.newsletter, gifts: data.gifts } : null,
    orders: (orders || []).map((order) => ({ code: order.code, date: order.created_at, total: order.total, paymentId: order.payment_id, status: order.status, items: order.items, progress: orderProgress.find((entry) => entry.code === order.code) })),
  });
});

export const PUT = api(async (request) => {
  const auth = await requireAuth(request);
  const body = await readJson(request, z.object({ name: z.string().trim().min(1).max(120), email: z.string().max(180).optional(),
    phone: z.string().max(40), address: z.string().max(240), city: z.string().max(100), county: z.string().max(100), postalCode: z.string().max(20),
    newsletter: z.boolean(), gifts: z.boolean() }).strict());
  const { error } = await auth.supabase.from("profiles").upsert({
    user_id: auth.user.id,
    email: auth.user.email,
    name: String(body.name || auth.user.user_metadata.full_name || "Client").slice(0, 120),
    phone: String(body.phone || "").slice(0, 40),
    address: String(body.address || "").slice(0, 240),
    city: String(body.city || "").slice(0, 100),
    county: String(body.county || "").slice(0, 100),
    postal_code: String(body.postalCode || "").slice(0, 20),
    newsletter: Boolean(body.newsletter),
    gifts: Boolean(body.gifts),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  databaseError(error);
  return Response.json({ persisted: true });
});
