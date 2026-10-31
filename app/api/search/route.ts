import { getCatalogProducts } from "@/lib/products";
import { z } from "zod";
import { api, readJson } from "@/lib/marketplace/http";

export const POST = api(async (request) => {
  const body = await readJson(request, z.object({ query: z.string().trim().min(1).max(1200) }).strict());
  return Response.json(await getCatalogProducts({ query: body.query, page: 1, pageSize: 12 }));
});
