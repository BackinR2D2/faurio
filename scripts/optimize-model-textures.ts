import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp from "sharp";
import { heroModels } from "../lib/hero-models.ts";

let originalBytes = 0;
let optimizedBytes = 0;
let textures = 0;
for (const model of heroModels) {
  const path = resolve("public", model.path.slice(1));
  const asset = JSON.parse(await readFile(path, "utf8")) as { images: { uri: string }[] };
  for (const image of asset.images) {
    if (!/\.jpe?g$/i.test(image.uri)) continue;
    const destination = resolve(dirname(path), image.uri);
    if (!destination.startsWith(dirname(path) + "/")) throw new Error("Invalid model texture path");
    const source = await readFile(destination);
    const result = await sharp(source).resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88, chromaSubsampling: "4:4:4" }).toBuffer();
    originalBytes += source.length;
    if (result.length < source.length) await writeFile(destination, result);
    optimizedBytes += Math.min(source.length, result.length);
    textures++;
  }
}
console.log(JSON.stringify({ textures, originalBytes, optimizedBytes }));
