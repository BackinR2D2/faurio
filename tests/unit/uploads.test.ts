import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { optimizeShopImage } from "../../lib/marketplace/media.ts";

test("seller photos become bounded static WebP without uploaded metadata", async()=> {
  const source=await sharp({create:{width:2400,height:1800,channels:3,background:"#188fa7"}}).withMetadata().jpeg().toBuffer();
  const optimized=await optimizeShopImage(source); const metadata=await sharp(optimized).metadata();
  assert.equal(metadata.format,"webp"); assert.equal(metadata.width,1600); assert.ok(!metadata.exif); assert.ok(!metadata.xmp);
});
test("SVG, tiny, malformed and oversized files are refused", async()=> {
  for(const source of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"></svg>'),Buffer.from("not a photo"),Buffer.alloc(5*1024*1024+1),await sharp({create:{width:10,height:10,channels:3,background:"red"}}).png().toBuffer()]) await assert.rejects(optimizeShopImage(source));
});

test("AVIF decoded as HEIF with AV1 compression is accepted and converted to WebP", async () => {
  const source = await sharp({ create: { width: 300, height: 300, channels: 3, background: "#188fa7" } }).avif().toBuffer();
  const input = await sharp(source).metadata();
  assert.equal(input.compression, "av1");
  const output = await sharp(await optimizeShopImage(source)).metadata();
  assert.equal(output.format, "webp");
  assert.equal(output.width, 300);
});
