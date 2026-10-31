import { getProductsByIds } from "@/lib/products";

export async function GET(request: Request) {
  const ids = new URL(request.url).searchParams.get("ids")?.split(",").map((id) => id.trim()).filter(Boolean) || [];
  return Response.json({ products: await getProductsByIds(ids) });
}
