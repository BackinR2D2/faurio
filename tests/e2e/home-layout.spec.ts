import { expect, test } from "@playwright/test";

for (const width of [390, 640, 1440]) {
  test(`homepage title and search alignment at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    const title = page.getByRole("heading", { level: 1 });
    const field = page.getByRole("textbox", { name: "Descrie în limbaj natural ce produs cauți" });
    await expect(title).toHaveText("Ce cauți astăzi?");
    await expect(page.locator(".home-kicker")).toHaveCount(0);
    await expect(title.locator("span")).toHaveCSS("display", "inline");
    if (width === 640) {
      const layout = await title.evaluate(element => ({ height: element.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(element).lineHeight) }));
      expect(layout.height).toBeLessThanOrEqual(layout.lineHeight + 1);
    }
    const initial = await field.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const button = element.parentElement!.querySelector("button")!.getBoundingClientRect();
      const icon = element.parentElement!.querySelector("svg")!.getBoundingClientRect();
      return { height: rect.height, lineHeight: parseFloat(style.lineHeight), padding: parseFloat(style.paddingTop) + parseFloat(style.paddingBottom), center: rect.y + rect.height / 2, buttonCenter: button.y + button.height / 2, iconCenter: icon.y + icon.height / 2, iconVisible: getComputedStyle(element.parentElement!.querySelector("svg")!).display !== "none" };
    });
    expect(initial.height).toBeLessThanOrEqual(initial.lineHeight + initial.padding + 1);
    expect(Math.abs(initial.center - initial.buttonCenter)).toBeLessThanOrEqual(1);
    if (initial.iconVisible) expect(Math.abs(initial.center - initial.iconCenter)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.screenshot({ path: `/private/tmp/faurio-home-refined-${width}.png` });
    const story = "Caut un cadou handmade pentru sora mea, care iubește plantele și ceramica. ".repeat(10);
    await field.fill(story);
    await expect(field).toHaveValue(story);
    await expect.poll(async () => (await field.boundingBox())!.height).toBeGreaterThan(initial.height);
    expect((await field.boundingBox())!.height).toBeLessThanOrEqual(160);
    await field.fill("");
    await expect.poll(async () => (await field.boundingBox())!.height).toBeLessThanOrEqual(initial.height + 1);
  });
}

test("3D carousel loads four distinct objects one at a time with accessible controls", async ({ page }, info) => {
  test.setTimeout(120000);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const explore = page.getByRole("button", { name: "Explorează obiectul în 3D" });
  if ((page.viewportSize()?.width || 0) <= 800) await explore.click();
  const carousel = page.getByRole("region", { name: "Colecție de obiecte 3D" });
  await expect(carousel).toBeVisible();
  const dots = carousel.locator(".artisan-dots button");
  await expect(dots).toHaveCount(4);
  const names = await dots.evaluateAll(elements => elements.map(element => element.getAttribute("aria-label")));
  expect(new Set(names).size).toBe(4);
  for (let index = 0; index < 4; index++) {
    if (index) await carousel.getByRole("button", { name: "Obiectul următor", exact: true }).click();
    await expect(carousel).toHaveAttribute("aria-busy", "false", { timeout: 25000 });
    await expect(carousel.locator(".artisan-orbit")).toHaveAttribute("data-loaded", "true");
    await expect(carousel.locator("canvas")).toHaveCount(1);
    await expect(dots.nth(index)).toHaveAttribute("aria-current", "true");
    await expect(carousel.locator(".artisan-caption small")).toHaveText(`${index + 1} / 4`);
  }
  const stop = carousel.getByRole("button", { name: "Oprește mișcarea" });
  if (await stop.isVisible()) await stop.click();
  await expect(carousel.getByRole("button", { name: "Pornește mișcarea" })).toBeVisible();
  await carousel.getByRole("button", { name: "Resetează poziția" }).click();
  const model = carousel.locator(".artisan-orbit");
  await model.focus();
  await model.press("ArrowRight");
  await model.press("ArrowUp");
  await model.press("Home");
  await expect(model).toBeFocused();
  const layout = await carousel.evaluate(element => {
    const canvas = element.querySelector("canvas")!.getBoundingClientRect();
    const controls = element.querySelector(".artisan-controls")!.getBoundingClientRect();
    const title = document.querySelector(".home-title")!.getBoundingClientRect();
    const viewport = window.innerWidth;
    return { separateControls: canvas.bottom <= controls.top + 1, separateCopy: viewport > 800 || title.bottom <= canvas.top, noOverflow: document.documentElement.scrollWidth <= viewport };
  });
  expect(layout).toEqual({ separateControls: true, separateCopy: true, noOverflow: true });
  await page.screenshot({ path: `/private/tmp/faurio-carousel-${info.project.name}.png`, fullPage: true });
});
