import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Autentificare necesară." }, { status: 401 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return Response.json({ profile: null, persisted: false });
  const { data, error } = await supabase.from("profiles").select("name, phone, address, city, county, postal_code, newsletter, gifts").eq("user_id", user.userId).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ profile: data ? { name: data.name, email: user.email, phone: data.phone, address: data.address, city: data.city, county: data.county, postalCode: data.postal_code, newsletter: data.newsletter, gifts: data.gifts } : null, persisted: true });
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Autentificare necesară." }, { status: 401 });
  const body = await request.json() as Record<string, unknown>;
  const supabase = getSupabaseAdmin();
  if (!supabase) return Response.json({ persisted: false });
  const { error } = await supabase.from("profiles").upsert({
    user_id: user.userId, email: user.email, name: String(body.name || user.displayName).slice(0, 120), phone: String(body.phone || "").slice(0, 40),
    address: String(body.address || "").slice(0, 240), city: String(body.city || "").slice(0, 100), county: String(body.county || "").slice(0, 100), postal_code: String(body.postalCode || "").slice(0, 20),
    newsletter: Boolean(body.newsletter), gifts: Boolean(body.gifts), updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ persisted: true });
}
