if (process.env.SEARCH_QUOTA_FIXTURE !== "1" || !["127.0.0.1", "localhost"].includes(new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://invalid.test").hostname)) {
  throw new Error("Groq rate-limit fixture requires an explicitly enabled loopback-only QA server");
}
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  if (url.hostname === "api.groq.com" && url.pathname === "/openai/v1/chat/completions") {
    return Response.json({ error: { code: "rate_limit_exceeded" } }, { status: 429, headers: { "retry-after": "60" } });
  }
  if (url.pathname === "/rest/v1/rpc/claim_search_ai_slot") return Response.json(true);
  return originalFetch(input, init);
};
