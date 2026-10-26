import { interpretNaturalQuery } from "@/lib/catalog";

export async function POST(request: Request) {
  const body = (await request.json()) as { query?: string };
  const query = String(body.query || "").slice(0, 300);
  return Response.json(interpretNaturalQuery(query));
}
