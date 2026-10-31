import type { MetadataRoute } from "next";
import { posts } from "@/lib/blog";
import { getProductIds } from "@/lib/products";
import { siteUrl } from "@/lib/site-url";
import { getPublicShops } from "@/lib/marketplace/server";
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/catalog", "/makers", "/sell", "/blog", "/contact", "/despre", "/livrare-retur", "/termeni", "/confidentialitate"].map((path) => ({ url: `${siteUrl}${path}`, changeFrequency: "weekly" as const, priority: path === "" ? 1 : .7 }));
  const products = (await getProductIds()).map((id) => ({ url: `${siteUrl}/produs/${id}`, changeFrequency: "weekly" as const, priority: .8 }));
  const shops = (await getPublicShops()).shops.map((shop) => ({ url: `${siteUrl}/makers/${shop.slug}`, changeFrequency: "weekly" as const, priority: .7 }));
  return [...pages, ...products, ...shops, ...posts.map((post) => ({ url: `${siteUrl}/blog/${post.slug}`, changeFrequency: "monthly" as const, priority: .6 }))];
}
