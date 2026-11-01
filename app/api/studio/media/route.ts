import { z } from "zod";
import { api, ApiError, databaseError, requireSameOrigin, requireShop } from "@/lib/marketplace/http";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { MAX_UPLOAD_BYTES, optimizeShopImage } from "@/lib/marketplace/media";

export const runtime = "nodejs";
export const POST = api(async (request) => {
  requireSameOrigin(request);
  const parsed = z.uuid().safeParse(new URL(request.url).searchParams.get("shop"));
  if (!parsed.success) throw new ApiError(400, "INVALID_SHOP", "Atelier invalid.");
  const auth = await requireShop(request, parsed.data, true);
  if (!auth.user.email_confirmed_at) throw new ApiError(403, "EMAIL_CONFIRMATION_REQUIRED", "Confirmă emailul înainte de a încărca fotografii.");
  const length = Number(request.headers.get("content-length"));
  if (!Number.isFinite(length) || length < 1 || length > MAX_UPLOAD_BYTES) throw new ApiError(413, "IMAGE_TOO_LARGE", "Încarcă o imagine de cel mult 5 MB.");
  const chunks: Uint8Array[] = []; let received = 0;
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "IMAGE_REQUIRED", "Selectează o fotografie.");
  while (true) { const part = await reader.read(); if (part.done) break; received += part.value.length; if (received > MAX_UPLOAD_BYTES) { await reader.cancel(); throw new ApiError(413, "IMAGE_TOO_LARGE", "Imagine prea mare."); } chunks.push(part.value); }
  let optimized: Buffer;
  try { optimized = await optimizeShopImage(Buffer.concat(chunks)); }
  catch { throw new ApiError(400, "INVALID_IMAGE", "Folosește JPEG, PNG, WebP sau AVIF, minimum 200 × 200 px și maximum 5 MB."); }
  const db = getSupabaseAdmin();
  if (!db) throw new ApiError(503, "DATABASE_UNAVAILABLE", "Baza de date nu este configurată.");
  const id = crypto.randomUUID();
  const { error: quotaError } = await db.rpc("register_shop_media", { p_shop: parsed.data, p_actor: auth.user.id, p_id: id });
  databaseError(quotaError);
  const path = `${parsed.data}/${id}.webp`;
  const { error: uploadError } = await db.storage.from("shop-media").upload(path, optimized, { contentType: "image/webp", upsert: false, cacheControl: "86400" });
  if (uploadError) throw new ApiError(503, "STORAGE_SETUP_REQUIRED", "Verifică bucket-ul shop-media și configurarea Supabase Storage.");
  const { error } = await db.from("shop_media_assets").update({ ready: true }).eq("id", id).eq("shop_id", parsed.data);
  databaseError(error);
  return Response.json({ src: `/media/${id}.webp`, bytes: optimized.length }, { status: 201 });
});
