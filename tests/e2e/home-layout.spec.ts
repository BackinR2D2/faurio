import { expect, test } from "@playwright/test";

for (const width of [390, 640, 1440]) {
  test(`homepage title and search alignment at ${width}px`, async ({ page }, info) => {
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
    await page.screenshot({ path: info.outputPath(`home-refined-${width}.png`) });
    const story = "Caut un cadou handmade pentru sora mea, care iubește plantele și ceramica. ".repeat(10);
    await field.fill(story);
    await expect(field).toHaveValue(story);
    await expect.poll(async () => (await field.boundingBox())!.height).toBeGreaterThan(initial.height);
    expect((await field.boundingBox())!.height).toBeLessThanOrEqual(160);
    for (let repeat = 0; repeat < 3; repeat++) {
      await field.fill("");
      await expect.poll(async () => (await field.boundingBox())!.height).toBeLessThanOrEqual(initial.height + 1);
      if (repeat < 2) await field.fill(story);
    }
  });
}

test("3D scene changes detailed objects automatically without carousel controls", async ({ page }, info) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    const changes: { path: string; time: number }[] = [];
    Object.assign(window, { sceneChanges: changes });
    new MutationObserver(records => {
      for (const record of records) {
        if (record.attributeName !== "data-model") continue;
        const path = (record.target as HTMLElement).dataset.model!;
        changes.push({ path, time: performance.now() });
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-model"] });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const explore = page.getByRole("button", { name: "Explorează obiectul în 3D" });
  if ((page.viewportSize()?.width || 0) <= 800) await explore.click();
  const carousel = page.getByRole("region", { name: "Colecție de obiecte 3D" });
  await expect(carousel).toBeVisible();
  const model = carousel.locator(".artisan-orbit");
  await model.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(carousel).toHaveAttribute("aria-busy", "false", { timeout: 25000 });
  await expect(model).toHaveAttribute("data-loaded", "true");
  await expect(carousel.getByRole("button")).toHaveCount(0);
  await expect(carousel.locator(".artisan-controls, .artisan-caption, .artisan-dots")).toHaveCount(0);
  await expect(carousel.locator("canvas")).toHaveCount(1);
  const canvas = carousel.locator("canvas");
  const canvasHandle = await canvas.elementHandle();
  await expect.poll(() => page.evaluate(() => (window as unknown as { sceneChanges: unknown[] }).sceneChanges.length), { timeout: 60000 }).toBeGreaterThanOrEqual(7);
  const changes = await page.evaluate(() => (window as unknown as { sceneChanges: { path: string; time: number }[] }).sceneChanges.slice(0, 7));
  expect(new Set(changes.map(item => item.path)).size).toBe(7);
  expect(changes.some(item => /bronze-whale/.test(item.path))).toBe(true);
  expect(changes.some(item => /brass-vase-04/.test(item.path))).toBe(true);
  expect(changes.some(item => /ceramic-vase-02|tea-set/.test(item.path))).toBeFalsy();
  for (let index = 1; index < changes.length; index++) expect(changes[index].time - changes[index - 1].time).toBeGreaterThanOrEqual(2900);
  await expect(carousel.locator("canvas")).toHaveCount(1);
  await model.focus();
  await expect(model).toHaveAttribute("data-playback", "paused");
  const pausedModel = await model.getAttribute("data-model");
  await page.waitForTimeout(3300);
  await expect(model).toHaveAttribute("data-model", pausedModel!);
  await model.press("ArrowRight");
  await model.press("ArrowUp");
  await model.press("Home");
  await expect(model).toBeFocused();
  const layout = await carousel.evaluate(element => {
    const canvas = element.querySelector("canvas")!.getBoundingClientRect();
    const title = document.querySelector(".home-title")!.getBoundingClientRect();
    const viewport = window.innerWidth;
    return { separateCopy: viewport > 800 || title.bottom <= canvas.top, noOverflow: document.documentElement.scrollWidth <= viewport };
  });
  expect(layout).toEqual({ separateCopy: true, noOverflow: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("heading", { level: 1 }).click();
  await page.mouse.move(0, 0);
  await expect(model).toHaveAttribute("data-playback", "paused");
  const reducedModel = await model.getAttribute("data-model");
  await page.waitForTimeout(3300);
  await expect(model).toHaveAttribute("data-model", reducedModel!);
  expect(await canvas.evaluate((element, original) => element === original, canvasHandle)).toBeTruthy();
  expect(errors).toEqual([]);
  await page.screenshot({ path: info.outputPath(`carousel-${info.project.name}.png`), fullPage: true });
});
