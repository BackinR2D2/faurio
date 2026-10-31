import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const media = JSON.parse(await readFile(new URL("../../lib/product-media.json", import.meta.url), "utf8")) as Array<{ slug: string; src: string; productType: string; origin: string }>;

test("every seeded product model has its own representative image", async () => {
  const seed = await readFile(new URL("../../supabase/seed.sql", import.meta.url), "utf8");
  const templates = [...seed.matchAll(/^  \('([^']+)'/gm)].map((match) => match[1]);
  assert.equal(templates.length, 24);
  assert.deepEqual(new Set(media.map((item) => item.slug)), new Set(templates));
  assert.equal(new Set(media.map((item) => item.src)).size, templates.length);
  for (const item of media) {
    assert.match(item.src, /^\/products\/catalog\/[a-z-]+\.webp$/);
    assert.equal(item.origin, "generated-demo");
    const line = seed.split("\n").find((line) => line.startsWith(`  ('${item.slug}',`));
    assert.ok(line?.includes(`'${item.src}','center'`), item.slug);
    const file = await stat(new URL(`../../public${item.src}`, import.meta.url));
    assert.ok(file.size > 1000 && file.size < 250000, `${item.slug}: optimized asset size`);
  }
});
