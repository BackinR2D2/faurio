import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { HERO_INTERVAL_MS, heroModels, shuffledHeroModels } from "../../lib/hero-models";

test("homepage uses only detailed textured models and a three-second interval", () => {
  assert.equal(HERO_INTERVAL_MS, 3000);
  assert.equal(heroModels.length, 5);
  assert.ok(heroModels.every(model => !/ceramic-vase-02|tea-set/.test(model.path)));
  for (const model of heroModels) {
    const path = resolve("public", model.path.slice(1));
    const asset = JSON.parse(readFileSync(path, "utf8"));
    assert.ok(asset.materials.every((material: { pbrMetallicRoughness: { baseColorTexture?: unknown }; normalTexture?: unknown }) => material.pbrMetallicRoughness.baseColorTexture && material.normalTexture));
    for (const dependency of [...asset.images, ...asset.buffers]) assert.ok(existsSync(resolve(dirname(path), dependency.uri)));
  }
});

test("randomized cycles show every model once and never repeat across the cycle boundary", () => {
  let previous: string | undefined;
  const orders = new Set<string>();
  for (let cycle = 0; cycle < 100; cycle++) {
    const deck = shuffledHeroModels(previous);
    assert.equal(new Set(deck.map(model => model.path)).size, heroModels.length);
    assert.notEqual(deck[0].path, previous);
    orders.add(deck.map(model => model.path).join(","));
    previous = deck.at(-1)!.path;
  }
  assert.ok(orders.size > 1);
});
