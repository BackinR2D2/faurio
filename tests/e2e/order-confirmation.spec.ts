import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";

const receipt = {
  code: "FAU-2026-DDB973FD-9F97-4A40-B9CB-9E092FF19BDF",
  total: 803,
  invoiceUrl: "https://invoice.stripe.com/test-fixture-not-a-real-document",
  customer: { name: "Cristian Test" },
};

test("return without a verified payment shows no confirmation or paid amount", async ({ page }) => {
  await page.goto("/checkout/success");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Verifică starea comenzii.");
  await expect(page.getByText("Plată neconfirmată", { exact: true })).toBeVisible();
  await expect(page.getByText("Plată confirmată", { exact: true })).toHaveCount(0);
  await expect(page.locator(".confirmation-total")).toHaveCount(0);
  await page.getByRole("link", { name: "Înapoi la comandă", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);
});

test("local preview loads its route styles and hydrates consistently after reload and navigation", async ({ page }, info) => {
  test.skip(Boolean(process.env.E2E_BASE_URL && !["localhost", "127.0.0.1"].includes(new URL(process.env.E2E_BASE_URL).hostname)), "Preview is development-only; never expose fictitious orders in production.");
  const failures: string[] = [];
  page.on("pageerror", error => failures.push(error.message));
  page.on("console", message => { if (message.type() === "error" && /hydrat|server rendered|didn't match/i.test(message.text())) failures.push(message.text()); });
  await page.goto("/checkout/preview");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mulțumim, Cristian!");
  await expect(page.locator(".confirmation-card")).toHaveCSS("display", "grid");
  await expect(page.locator(".confirmation-card")).toHaveCSS("border-radius", (page.viewportSize()?.width || 0) <= 680 ? "18px" : "20px");
  await page.reload();
  await expect(page.locator(".confirmation-card")).toHaveCSS("display", "grid");
  await expect(page.locator(".site-header .brand small")).toHaveCount(0);
  await page.getByRole("link", { name: "Înapoi la catalog", exact: true }).click();
  await expect(page).toHaveURL(/\/catalog$/);
  await page.goBack();
  await expect(page.locator(".confirmation-card")).toHaveCSS("display", "grid");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: info.outputPath(`LOCAL-confirmation-${info.project.name}.png`), fullPage: true });
  expect(failures).toEqual([]);
});

for (const width of [360, 640, 1024, 1440]) {
  test(`MOCK confirmed receipt layout stays readable at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/checkout/success");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const markup = execFileSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
      import { createElement } from "react";
      import { renderToStaticMarkup } from "react-dom/server";
      import { OrderConfirmation } from "./components/order-confirmation.tsx";
      process.stdout.write(renderToStaticMarkup(createElement(OrderConfirmation, { receipt: ${JSON.stringify(receipt)} })));
    `], { cwd: process.cwd(), encoding: "utf8" });
    await page.locator(".order-confirmation").evaluate((element, html) => { element.outerHTML = html; }, markup);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mulțumim, Cristian!");
    await expect(page.locator(".confirmation-code")).toHaveText(receipt.code);
    await expect(page.locator(".order-confirmation")).not.toContainText(/stripe/i);
    await expect(page.getByText("Comandă de test. Nu s-au debitat bani reali.", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Vezi comenzile" })).toHaveAttribute("href", "/cont/profil");
    await expect(page.getByRole("link", { name: "Înapoi la catalog" })).toHaveAttribute("href", "/catalog");
    const documentLink = page.getByRole("link", { name: "Detalii plată" });
    await expect(documentLink).toHaveAttribute("href", receipt.invoiceUrl);
    await expect(documentLink).toHaveAttribute("rel", "noreferrer");
    const geometry = await page.locator(".confirmation-card").evaluate(element => {
      const heading = element.querySelector("h1")!.getBoundingClientRect();
      const lead = element.querySelector(".confirmation-lead")!.getBoundingClientRect();
      const code = element.querySelector(".confirmation-code")!;
      const links = [...element.querySelectorAll(".confirmation-actions a")].map(link => link.getBoundingClientRect());
      const a = links[0], b = links[1];
      return { gap: lead.top - heading.bottom, fontSize: parseFloat(getComputedStyle(element.querySelector("h1")!).fontSize), codeFits: code.scrollWidth <= code.clientWidth, overflow: document.documentElement.scrollWidth > innerWidth, overlap: a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top };
    });
    expect(geometry.gap).toBeGreaterThanOrEqual(16);
    expect(geometry.fontSize).toBeLessThanOrEqual(48);
    expect(geometry.codeFits).toBe(true);
    expect(geometry.overflow).toBe(false);
    expect(geometry.overlap).toBe(false);
    await page.screenshot({ path: info.outputPath(`MOCK-confirmation-${width}.png`), fullPage: true });
  });
}
