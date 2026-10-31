import { z } from "zod";
import productMedia from "../product-media.json" with { type: "json" };

export const shopStates = ["draft", "pending_review", "active", "restricted", "suspended", "closed"] as const;
export const themes = ["paper", "clay", "botanical", "gallery", "playful"] as const;
export const blockTypes = ["hero", "products", "story", "gallery", "faq", "announcement"] as const;
export const artwork = ["/products/ceramica-luna.avif", "/products/broderie-camp.avif", "/products/lumanare-terrazzo.avif"] as const;
export const productArtwork = [...artwork, ...productMedia.map((item) => item.src)];
export const sellerTermsVersion = "seller-2026-10";

const text = (max: number) => z.string().trim().max(max);
const uploadedImage = /^\/media\/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.webp$/;
const shopArtwork = z.string().refine((value) => artwork.includes(value as typeof artwork[number]) || uploadedImage.test(value), "Imagine de atelier invalidă.");
export const layoutSchema = z.object({
  theme: z.enum(themes),
  font: z.enum(["sans", "serif", "oswald"]),
  title: text(100).min(2),
  subtitle: text(240),
  story: text(6000),
  announcement: text(400),
  cover: shopArtwork,
  gallery: z.array(shopArtwork).max(3),
  faq: z.array(z.object({ question: text(160).min(1), answer: text(800).min(1) }).strict()).max(5),
  blocks: z.array(z.object({ type: z.enum(blockTypes), visible: z.boolean() }).strict()).length(6),
}).strict().superRefine((value, context) => {
  if (new Set(value.blocks.map((block) => block.type)).size !== 6) context.addIssue({ code: "custom", path: ["blocks"], message: "Fiecare secțiune trebuie să apară exact o dată." });
  if (!value.blocks.some((block) => block.type === "products" && block.visible)) context.addIssue({ code: "custom", path: ["blocks"], message: "Catalogul atelierului trebuie să rămână vizibil." });
});

export type ShopLayout = z.infer<typeof layoutSchema>;
export type ShopState = typeof shopStates[number];
export type PublicShop = { id: string; slug: string; name: string; country: string; location: string; is_legacy: boolean; layout: ShopLayout; published_at: string };
export type StudioShop = { id: string; slug: string; name: string; country: string; location: string; status: ShopState; is_legacy: boolean; role: "owner" | "editor" };
export type ShopPage = { shop_id: string; draft: ShopLayout; published: ShopLayout | null; revision: number; published_at: string | null; updated_at: string };

export function defaultLayout(name = "Atelierul meu"): ShopLayout {
  return { theme: "paper", font: "sans", title: name, subtitle: "Obiecte făcute cu răbdare.", story: "", announcement: "", cover: artwork[0], gallery: [], faq: [], blocks: blockTypes.map((type) => ({ type, visible: ["hero", "products", "story"].includes(type) })) };
}

export const applicationSchema = z.object({
  name: text(100).min(2),
  slug: z.string().min(4).max(60).regex(/^[a-z0-9][a-z0-9-]{2,58}[a-z0-9]$/, "Folosește litere mici, cifre și cratime; fără cratimă la capete."),
  country: z.string().regex(/^[A-Z]{2}$/),
  location: text(100),
  termsVersion: z.literal(sellerTermsVersion),
}).strict();

export const productInputSchema = z.object({
  name: text(140).min(2),
  product_type: text(80).min(2),
  category: z.enum(["Ceramică", "Sticlărie", "Textile", "Lumânări", "Bijuterii", "Lemn", "Decorațiuni", "Papetărie"]),
  price: z.number().int().min(1).max(100000),
  stock: z.number().int().min(0).max(9999),
  shipping_days: z.number().int().min(1).max(90),
  material: text(160).min(2),
  color: text(100).min(2),
  description: text(4000).min(20),
  image: z.string().refine((value) => productArtwork.includes(value) || uploadedImage.test(value), "Imagine de produs invalidă."),
}).strict();

export type StudioProductInput = z.infer<typeof productInputSchema>;
export type StudioProduct = StudioProductInput & { id: string; shop_id: string; listing_status: "draft" | "pending_review" | "published" | "archived"; active: boolean };

export function moveBlock(layout: ShopLayout, index: number, direction: -1 | 1): ShopLayout {
  return moveBlockTo(layout, index, index + direction);
}

export function moveBlockTo(layout: ShopLayout, index: number, next: number): ShopLayout {
  if (!Number.isInteger(index) || !Number.isInteger(next) || index < 0 || index >= layout.blocks.length || next < 0 || next >= layout.blocks.length) return layout;
  const blocks = [...layout.blocks];
  const [block] = blocks.splice(index, 1);
  blocks.splice(next, 0, block);
  return { ...layout, blocks };
}

export const stateLabels: Record<ShopState, string> = { draft: "Ciornă", pending_review: "În verificare", active: "Aprobat", restricted: "Publicare restricționată", suspended: "Suspendat", closed: "Închis" };
export const themeLabels: Record<ShopLayout["theme"], string> = { paper: "Hârtie & cerneală", clay: "Studio de lut", botanical: "Grădină botanică", gallery: "Galerie minimală", playful: "Atelier jucăuș" };
export const blockLabels: Record<ShopLayout["blocks"][number]["type"], string> = { hero: "Copertă", products: "Produse", story: "Poveste", gallery: "Galerie", faq: "Întrebări frecvente", announcement: "Anunț" };
