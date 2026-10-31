import { mapProduct } from "@/lib/products";
import { getRequestAuth } from "@/lib/supabase-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

async function adminFor(request: Request) {
  const auth = await getRequestAuth(request);
  const allowed = (process.env.ADMIN_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (!auth) return { error: Response.json({ error: "Autentificare necesară." }, { status: 401 }) };
  if (!auth.user.email_confirmed_at) return { error: Response.json({ error: "Confirmă adresa de email înainte de administrare." }, { status: 403 }) };
  if (!allowed.length) return { error: Response.json({ error: "Configurează ADMIN_EMAILS." }, { status: 503 }) };
  if (!allowed.includes((auth.user.email || "").toLowerCase())) return { error: Response.json({ error: "Acces interzis." }, { status: 403 }) };
  const admin = getSupabaseAdmin();
  if (!admin) return { error: Response.json({ error: "Baza de date nu este configurată." }, { status: 503 }) };
  return { admin };
}

export async function GET(request: Request) {
  const access = await adminFor(request);
  if (access.error) return access.error;
  const page = Math.max(1, Number(new URL(request.url).searchParams.get("page")) || 1);
  const start = (page - 1) * 50;
  const [{ data: productRows, count, error }, { data: orders }, { count: users }, { data: stocks }] = await Promise.all([
    access.admin.from("products").select("*", { count: "exact" }).order("name").range(start, start + 49),
    access.admin.from("orders").select("code,created_at,total,customer_name,customer_email,status").order("created_at", { ascending: false }).limit(50),
    access.admin.from("profiles").select("user_id", { count: "exact", head: true }),
    access.admin.from("products").select("stock").eq("active", true).limit(1000),
  ]);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({
    products: (productRows || []).map((row) => mapProduct(row)), page, pageCount: Math.ceil((count || 0) / 50), total: count || 0,
    units: (stocks || []).reduce((sum, row) => sum + Number(row.stock || 0), 0), lowStock: (stocks || []).filter((row) => Number(row.stock || 0) <= 3).length,
    users: users || 0, orders: (orders || []).map((order) => ({ code: order.code, date: order.created_at, total: Number(order.total), customer: { name: order.customer_name, email: order.customer_email }, status: order.status })),
  });
}

export async function PATCH(request: Request) {
  const access = await adminFor(request);
  if (access.error) return access.error;
  const body = await request.json() as { id?: string; stock?: number };
  const stock = Math.max(0, Math.min(9999, Math.floor(Number(body.stock))));
  if (!body.id || !Number.isFinite(stock)) return Response.json({ error: "Date invalide." }, { status: 400 });
  const { error } = await access.admin.from("products").update({ stock, updated_at: new Date().toISOString() }).eq("id", body.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ updated: true, stock });
}
