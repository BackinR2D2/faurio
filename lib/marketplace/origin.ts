export function isSameOrigin(request: Request, options: { trustedProxy?: boolean; siteUrl?: string } = {}) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const incoming = new URL(origin);
    if (!["http:", "https:"].includes(incoming.protocol) || incoming.origin !== origin) return false;
    const url = new URL(request.url);
    const host = request.headers.get("host") || url.host;
    const external = new URL(`${url.protocol}//${host}`);
    if (external.host !== host.toLowerCase() || external.username || external.password || external.pathname !== "/") return false;
    if (origin === external.origin) return true;
    if (!options.trustedProxy) return false;
    const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    if ((protocol === "https" || protocol === "http") && origin === `${protocol}://${external.host}`) return true;
    return Boolean(options.siteUrl && origin === new URL(options.siteUrl).origin);
  } catch { return false; }
}
