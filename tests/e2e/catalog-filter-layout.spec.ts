import { expect, test } from "@playwright/test";

test("populated catalog filters fit their column without clipping selections or controls", async ({ page }, info) => {
  const params = new URLSearchParams([
    ["categorie", "Ceramică"], ["categorie", "Sticlărie"], ["categorie", "Decorațiuni"],
    ["tip", "Vază"], ["tip", "Set de pahare"], ["tip", "Decorațiune"],
    ["material", "ceramică glazurată"], ["material", "sticlă reciclată"],
    ["pretMin", "50"], ["pret", "250"],
  ]);
  const mobile = (page.viewportSize()?.width || 0) <= 850;
  for (const width of mobile ? [390, 320] : [1440, 1024, 851]) {
    await page.setViewportSize({ width, height: 1000 });
    expect((await page.goto(`/catalog?${params}`))?.status()).toBe(200);
    if (mobile) await page.getByRole("button", { name: "Filtre", exact: true }).click();
    const panel = page.locator(".filter-panel");
    await expect(panel).toBeVisible();
    const bounds = await panel.evaluate(element => {
      const panelBox = element.getBoundingClientRect();
      const form = element.querySelector("form")!;
      const controls = [...form.querySelectorAll("fieldset, summary, input, select, .primary-button")];
      return {
        panelOverflow: element.scrollWidth - element.clientWidth,
        formOverflow: form.scrollWidth - form.clientWidth,
        outside: controls.filter(control => {
          const box = control.getBoundingClientRect();
          return box.width > 0 && (box.left < panelBox.left - 1 || box.right > panelBox.right + 1);
        }).map(control => control.tagName),
      };
    });
    expect(bounds).toEqual({ panelOverflow: 0, formOverflow: 0, outside: [] });
    for (const label of ["Categorie", "Tip de produs", "Material"]) {
      const summary = panel.locator(`summary[aria-label="${label}"]`);
      await expect(summary).toHaveCSS("white-space", "normal");
      expect(await summary.locator("span").evaluate(element => element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight)).toBe(true);
      const arrow = await summary.locator("svg").boundingBox();
      const box = await summary.boundingBox();
      expect(arrow!.x + arrow!.width).toBeLessThanOrEqual(box!.x + box!.width);
    }
    await panel.locator('summary[aria-label="Material"]').click();
    await expect(panel.getByRole("checkbox", { name: "sticlă reciclată", exact: true })).toBeChecked();
    expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.keyboard.press("Escape");
    await page.screenshot({ path: info.outputPath(`catalog-filters-${width}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
