import "server-only";
import type { z } from "zod";
import { getRequestAuth } from "@/lib/supabase-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { ZodError } from "zod";
import { isSameOrigin } from "./origin";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function isMissingSchema(error: { code?: string } | null) {
  return Boolean(error && ["42P01", "PGRST205", "PGRST202", "42883"].includes(error.code || ""));
}

export function databaseError(error: { code?: string; message: string } | null) {
  if (!error) return;
  if (isMissingSchema(error)) throw new ApiError(503, "MARKETPLACE_SETUP_REQUIRED", "Atelierele nu sunt încă disponibile. Administratorul trebuie să finalizeze configurarea bazei de date.");
  if (error.code === "23505") throw new ApiError(409, "ALREADY_EXISTS", "Această adresă sau înregistrare există deja.");
  if (error.code === "40001") throw new ApiError(409, "DRAFT_CONFLICT", "Ciorna a fost schimbată în altă fereastră. Reîncarcă înainte să salvezi.");
  if (error.code === "42501") throw new ApiError(403, "ACCESS_DENIED", "Nu ai permisiune pentru acest atelier.");
  if (error.code === "P0002") throw new ApiError(404, "NOT_FOUND", "Înregistrarea nu există.");
  if (error.code?.startsWith("22") || error.code?.startsWith("23")) throw new ApiError(400, "INVALID_DATA", "Datele nu respectă regulile de publicare. Verifică formularul și starea atelierului.");
  throw new ApiError(500, "DATABASE_ERROR", "Nu am putut salva sau citi datele. Încearcă din nou.");
}

export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  requireSameOrigin(request);
  if (Number(request.headers.get("content-length") || 0) > 65536) throw new ApiError(413, "BODY_TOO_LARGE", "Formularul este prea mare.");
  const source = await request.text();
  if (source.length > 65536) throw new ApiError(413, "BODY_TOO_LARGE", "Formularul este prea mare.");
  let value: unknown;
  try { value = JSON.parse(source); } catch { throw new ApiError(400, "INVALID_JSON", "Date JSON invalide."); }
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(400, "VALIDATION_ERROR", result.error.issues[0]?.message || "Date invalide.");
  return result.data;
}

export function requireSameOrigin(request: Request) {
  if (!isSameOrigin(request, { trustedProxy: process.env.NETLIFY === "true" || Boolean(process.env.VERCEL), siteUrl: process.env.NEXT_PUBLIC_SITE_URL })) {
    throw new ApiError(403, "ORIGIN_DENIED", "Cerere dintr-o origine nepermisă.");
  }
}

export function api(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    const requestId = crypto.randomUUID();
    try {
      const response = await handler(request);
      response.headers.set("Cache-Control", "no-store");
      response.headers.set("X-Request-Id", requestId);
      return response;
    } catch (error) {
      const failure = error instanceof ApiError ? error : error instanceof ZodError ? new ApiError(400, "VALIDATION_ERROR", "Datele cererii sunt invalide.") : new ApiError(500, "INTERNAL_ERROR", "Cererea nu a putut fi procesată.");
      return Response.json({ error: failure.message, code: failure.code, requestId }, { status: failure.status, headers: { "Cache-Control": "no-store", "X-Request-Id": requestId } });
    }
  };
}

export async function requireAuth(request: Request) {
  const auth = await getRequestAuth(request);
  if (!auth) throw new ApiError(401, "AUTH_REQUIRED", "Autentifică-te pentru a continua.");
  return auth;
}

export async function requireShop(request: Request, shopId: string, write = false) {
  const auth = await requireAuth(request);
  const { data, error } = await auth.supabase.from("shops").select("id,status").eq("id", shopId).maybeSingle();
  databaseError(error);
  if (!data) throw new ApiError(403, "ACCESS_DENIED", "Nu ai acces la acest atelier.");
  if (write && ["suspended", "closed"].includes(data.status)) throw new ApiError(403, "SHOP_RESTRICTED", "Acest atelier nu poate fi editat momentan.");
  return auth;
}

export function isOperatorUser(user: { email?: string; email_confirmed_at?: string }) {
  const emails = (process.env.ADMIN_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  return Boolean(user.email_confirmed_at && emails.includes((user.email || "").toLowerCase()));
}

export async function requireOperator(request: Request) {
  const auth = await requireAuth(request);
  if (!isOperatorUser(auth.user)) throw new ApiError(403, "OPERATOR_REQUIRED", "Acces rezervat administratorului.");
  const admin = getSupabaseAdmin();
  if (!admin) throw new ApiError(503, "DATABASE_UNAVAILABLE", "Baza de date nu este configurată.");
  return { ...auth, admin };
}
