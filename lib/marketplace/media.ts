import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export async function optimizeShopImage(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_UPLOAD_BYTES) throw new Error("Imaginea trebuie să aibă cel mult 5 MB.");
  const image = sharp(bytes, { limitInputPixels: 16000000, animated: false });
  const metadata = await image.metadata();
  if (!["jpeg", "png", "webp", "avif"].includes(metadata.format || "") || (metadata.pages || 1) > 1) throw new Error("Folosește o fotografie JPEG, PNG, WebP sau AVIF statică.");
  if (!metadata.width || !metadata.height || metadata.width < 200 || metadata.height < 200) throw new Error("Fotografia trebuie să aibă cel puțin 200 × 200 pixeli.");
  return image.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toBuffer();
}
