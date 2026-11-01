import { getCatalogProducts } from "@/lib/products";
import { z } from "zod";
import { api, readJson } from "@/lib/marketplace/http";

export const POST = api(async (request) => {
  const body = await readJson(request, z.object({ query: z.string().trim().min(1).max(1200) }).strict());
  const result = await getCatalogProducts({ query: body.query, page: 1, pageSize: 12 });
  return Response.json(result.intent?.failure ? { ...result, code: "AI_SEARCH_UNAVAILABLE", error: result.intent.notice } : result, { status: result.intent?.failure ? 503 : 200 });
});
