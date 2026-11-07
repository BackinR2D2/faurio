import { expect, test } from "@playwright/test";

test("contact selector shares the catalog caret, spacing and accessible focus", async ({ page }) => {
  await page.goto("/contact");
  const subject = page.getByRole("combobox", { name: "Subiect", exact: true });
  await expect(subject).toHaveCSS("appearance", "none");
  await expect(subject).toHaveCSS("background-position", "calc(100% - 14px) 50%");
  await expect(subject).toHaveCSS("padding-right", "42px");
  await expect(subject).toHaveCSS("border-radius", "8px");
  await subject.selectOption("Colaborare");
  await expect(subject).toHaveValue("Colaborare");
  await subject.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(subject).toBeFocused();
  await expect(subject).toHaveCSS("outline-style", "none");
  expect(await subject.evaluate(element => getComputedStyle(element).boxShadow)).toContain("inset");
});

test("catalog selects have inset carets and a contained keyboard focus", async ({ page }, info) => {
  await page.goto("/catalog");
  if ((page.viewportSize()?.width || 0) <= 850) await page.getByRole("button", { name: "Filtre", exact: true }).click();
  const material = page.locator('summary[aria-label="Material"]');
  await expect(material).toBeVisible();
  await expect(material.locator("svg")).toBeVisible();
  await expect(material).toHaveCSS("padding-right", "14px");
  await expect(material).toHaveCSS("border-radius", "8px");
  const budget = page.getByRole("spinbutton", { name: "Preț maxim în lei" });
  await budget.click();
  await expect(budget).toHaveCSS("outline-style", "none");
  await expect(budget).toHaveCSS("appearance", "textfield");
  await material.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(material).toBeFocused();
  await expect(material).toHaveCSS("outline-style", "none");
  await expect(material).toHaveCSS("border-color", "rgb(16, 47, 56)");
  const shadow = await material.evaluate(element => getComputedStyle(element).boxShadow);
  expect(shadow).toContain("inset");
  await page.screenshot({ path: info.outputPath(`filter-focus-${info.project.name}.png`) });
  await material.press("Enter");
  await page.getByRole("checkbox", { name: "sticlă reciclată", exact: true }).check();
  await expect(material).toContainText("sticlă reciclată");
  await page.keyboard.press("Escape");
  await expect(material.locator("..")).not.toHaveAttribute("open");
  if ((page.viewportSize()?.width || 0) <= 850) await page.getByRole("button", { name: "Închide filtrele", exact: true }).click();
  const sort = page.getByRole("combobox", { name: "Ordonează" });
  await expect(sort).toHaveCSS("appearance", "none");
  await expect(sort).toHaveCSS("padding-right", "42px");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
