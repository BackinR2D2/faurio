import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.webp$/.test(file)) return new Response(null, { status: 404 });
  const db = getSupabaseAdmin(); if (!db) return new Response(null, { status: 503 });
  const { data } = await db.from("shop_media_assets").select("shop_id,id").eq("id", file.slice(0, -5)).eq("ready", true).maybeSingle();
  if (!data) return new Response(null, { status: 404 });
  const { data: image, error } = await db.storage.from("shop-media").download(`${data.shop_id}/${file}`);
  if (error || !image) return new Response(null, { status: 404 });
  return new Response(image, { headers: { "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=86400, immutable" } });
}
