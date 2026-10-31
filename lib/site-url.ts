export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export function getSiteUrl() {
  const url = new URL(siteUrl);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("NEXT_PUBLIC_SITE_URL_INVALID");
  return url.origin;
}
