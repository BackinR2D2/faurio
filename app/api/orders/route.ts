import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    customer?: { name?: string; email?: string; address?: string };
    items?: Array<{ id: string; name: string; quantity: number; price: number }>;
    total?: number;
    paymentId?: string;
  };
  const orderCode = `FDP-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { error } = await supabase.from("orders").insert({
      code: orderCode,
      customer_name: String(body.customer?.name || "Client"),
      customer_email: String(body.customer?.email || ""),
      shipping_address: String(body.customer?.address || ""),
      items: body.items || [],
      total: Number(body.total || 0),
      payment_id: String(body.paymentId || ""),
      status: "paid",
    });
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ orderCode, persisted: Boolean(supabase) });
}
