import { z } from "zod";
import { api, databaseError, readJson, requireOperator } from "@/lib/marketplace/http";

export const GET = api(async (request) => {
  const { admin } = await requireOperator(request);
  const params = new URL(request.url).searchParams;
  const page = Math.min(10000, Math.max(1, Math.trunc(Number(params.get("page")) || 1)));
  const kind = params.get("kind") === "products" ? "products" : "shops";
  const listingStatus = ["pending_review", "draft", "published", "archived"].find((status) => status === params.get("status")) || "pending_review";
  const query = kind === "shops" ? admin.from("shops").select("id,name,slug,status,location,created_at", { count: "exact" }).eq("is_legacy", false) : admin.from("products").select("id,name,shop_id,listing_status,created_at", { count: "exact" }).eq("listing_status", listingStatus);
  const { data, error, count } = await query.order("created_at", { ascending: false }).order("id").range((page - 1) * 20, page * 20 - 1);
  if (error?.code !== "PGRST103") databaseError(error);
  const { data: audit, error: auditError } = await admin.from("marketplace_audit_log").select("id,action,subject_id,shop_id,reason,created_at").order("created_at", { ascending: false }).limit(30);
  databaseError(auditError);
  return Response.json({ records: data || [], total: count || 0, page, audit: audit || [] });
});

export const PATCH = api(async (request) => {
  const { admin, user } = await requireOperator(request);
  const body = await readJson(request, z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("shop"), id: z.uuid(), status: z.enum(["active", "restricted", "suspended"]), reason: z.string().trim().min(5).max(1000) }).strict(),
    z.object({ kind: z.literal("product"), id: z.string().min(1).max(200), status: z.enum(["published", "draft", "archived"]), reason: z.string().trim().min(5).max(1000) }).strict(),
  ]));
  const { error } = await admin.rpc("moderate_marketplace", { p_actor: user.id, p_kind: body.kind, p_id: body.id, p_status: body.status, p_reason: body.reason });
  databaseError(error);
  return Response.json({ updated: true });
});
