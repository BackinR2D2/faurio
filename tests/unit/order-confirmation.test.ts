import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OrderConfirmation, OrderUnconfirmed } from "../../components/order-confirmation.tsx";

const receipt = {
  code: "FAU-2026-DDB973FD-9F97-4A40-B9CB-9E092FF19BDF",
  total: 803,
  customer: { name: "  Cristian   Test " },
};

test("confirmed order preserves the full reference and uses provider-neutral payment copy", () => {
  const html = renderToStaticMarkup(createElement(OrderConfirmation, { receipt: { ...receipt, invoiceUrl: "https://invoice.stripe.com/test-fixture" } }));
  assert.ok(html.includes(receipt.code));
  assert.match(html, /Mulțumim, Cristian!/);
  assert.match(html, /803/);
  assert.match(html, /Detalii plată/);
  assert.match(html, /Nu s-au debitat bani reali/);
  assert.match(html, /href="\/cont\/profil"/);
  assert.match(html, /href="\/catalog"/);
  assert.doesNotMatch(html.replace(/href="[^"]*"/g, ""), /stripe/i);
});

test("missing optional document and empty name do not create broken links or greetings", () => {
  const html = renderToStaticMarkup(createElement(OrderConfirmation, { receipt: { ...receipt, customer: { name: " " } } }));
  assert.match(html, /Mulțumim pentru comandă!/);
  assert.doesNotMatch(html, /Detalii plată/);
  assert.doesNotMatch(html, /href="undefined"/);
});

test("customer text is escaped and unverified payment never claims success", () => {
  const html = renderToStaticMarkup(createElement(OrderConfirmation, { receipt: { ...receipt, customer: { name: "<script>alert(1)</script>" } } }));
  assert.doesNotMatch(html, /<script>/);
  const unconfirmed = renderToStaticMarkup(createElement(OrderUnconfirmed));
  assert.match(unconfirmed, /Plată neconfirmată/);
  assert.doesNotMatch(unconfirmed, /Plată confirmată|Total achitat|Comanda este înregistrată/);
});
