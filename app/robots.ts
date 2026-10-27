import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/cont/profil", "/checkout"] }, sitemap: "https://fir-de-poveste-handmade.elatedpine3.chatgpt.site/sitemap.xml" }; }
