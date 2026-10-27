import type { MetadataRoute } from "next";
import { products } from "@/lib/catalog";
import { posts } from "@/lib/blog";
const origin = "https://fir-de-poveste-handmade.elatedpine3.chatgpt.site";
export default function sitemap(): MetadataRoute.Sitemap { const pages = ["", "/catalog", "/blog", "/contact", "/despre", "/livrare-retur", "/termeni", "/confidentialitate"].map((path) => ({ url: `${origin}${path}`, changeFrequency: "weekly" as const, priority: path === "" ? 1 : .7 })); return [...pages, ...products.map((product) => ({ url: `${origin}/produs/${product.id}`, changeFrequency: "weekly" as const, priority: .8 })), ...posts.map((post) => ({ url: `${origin}/blog/${post.slug}`, changeFrequency: "monthly" as const, priority: .6 }))]; }
