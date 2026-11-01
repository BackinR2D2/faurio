import { test } from "node:test";
import assert from "node:assert/strict";
import { isSameOrigin } from "../../lib/marketplace/origin.ts";

test("origin validation uses the incoming host, not Next.js internal localhost hostname", () => {
  const request = new Request("http://localhost:3102/api/shops", { headers: { host: "127.0.0.1:3102", origin: "http://127.0.0.1:3102" } });
  assert.equal(isSameOrigin(request), true);
  for (const origin of ["http://localhost:3102", "https://evil.example", "null", "http://127.0.0.1:3102/path", "https://127.0.0.1:3102"]) {
    assert.equal(isSameOrigin(new Request(request, { headers: { host: "127.0.0.1:3102", origin } })), false);
  }
});

test("only explicitly trusted hosting can use proxy protocol and configured public origin", () => {
  const request = new Request("http://internal/api/shops", { headers: { host: "faurio-marketplace.netlify.app", origin: "https://faurio-marketplace.netlify.app", "x-forwarded-proto": "https", "x-forwarded-host": "evil.example" } });
  assert.equal(isSameOrigin(request), false);
  assert.equal(isSameOrigin(request, { trustedProxy: true }), true);
  assert.equal(isSameOrigin(new Request(request, { headers: { host: "internal", origin: "https://faurio-marketplace.netlify.app" } }), { trustedProxy: true, siteUrl: "https://faurio-marketplace.netlify.app" }), true);
  assert.equal(isSameOrigin(new Request(request, { headers: { host: "internal", origin: "https://evil.example", "x-forwarded-host": "evil.example" } }), { trustedProxy: true, siteUrl: "https://faurio-marketplace.netlify.app" }), false);
  assert.equal(isSameOrigin(new Request("https://example.test/api/shops")), true);
});
