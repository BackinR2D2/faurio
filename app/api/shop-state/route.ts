import { getProductsByIds } from "@/lib/products";
import { z } from "zod";
import { api, databaseError, readJson, requireAuth } from "@/lib/marketplace/http";

type StoredLine = { id: string; quantity: number };

export const GET = api(async (request) => {
  const auth = await requireAuth(request);
  const { data, error } = await auth.supabase.from("user_shop_state").select("cart,favorites").eq("user_id", auth.user.id).maybeSingle();
  databaseError(error);
  const cart = (Array.isArray(data?.cart) ? data.cart : []) as StoredLine[];
  const favorites = Array.isArray(data?.favorites) ? data.favorites.map(String) : [];
  const products = await getProductsByIds([...cart.map((line) => line.id), ...favorites]);
  return Response.json({ cart: cart.flatMap((line) => { const product = products.find((item) => item.id === line.id); return product ? [{ product, quantity: Math.min(product.stock, Math.max(1, Number(line.quantity) || 1)) }] : []; }), favorites: favorites.filter((id) => products.some((product) => product.id === id)) });
});

export const PUT = api(async (request) => {
  const auth = await requireAuth(request);
  const body = await readJson(request, z.object({ cart: z.array(z.object({ id: z.string().min(1).max(200), quantity: z.number().int().min(1).max(10) }).strict()).max(30).optional(), favorites: z.array(z.string().min(1).max(200)).max(100).optional(), merge: z.boolean().optional() }).strict());
  const incomingCart = (body.cart || []).slice(0, 30).filter((line) => line.id && Number(line.quantity) > 0);
  const incomingFavorites = Array.from(new Set((body.favorites || []).map(String))).slice(0, 100);
  let cart = incomingCart;
  let favorites = incomingFavorites;
  if (body.merge) {
    const { data, error } = await auth.supabase.from("user_shop_state").select("cart,favorites").eq("user_id", auth.user.id).maybeSingle();
    databaseError(error);
    const remoteCart = (Array.isArray(data?.cart) ? data.cart : []) as StoredLine[];
    const map = new Map(remoteCart.map((line) => [line.id, Number(line.quantity) || 1]));
    incomingCart.forEach((line) => map.set(line.id, Math.max(map.get(line.id) || 0, Number(line.quantity) || 1)));
    cart = Array.from(map, ([id, quantity]) => ({ id, quantity }));
    favorites = Array.from(new Set([...(Array.isArray(data?.favorites) ? data.favorites.map(String) : []), ...incomingFavorites]));
  }
  cart = Array.from(new Map(cart.map(line => [line.id, line])).values()).slice(0, 30);
  favorites = favorites.slice(0, 100);
  const products = await getProductsByIds([...cart.map((line) => line.id), ...favorites]);
  const safeCart = cart.flatMap((line) => { const product = products.find((item) => item.id === line.id); return product && product.stock > 0 ? [{ id: product.id, quantity: Math.min(product.stock, 10, Math.max(1, Math.floor(Number(line.quantity) || 1))) }] : []; });
  const safeFavorites = favorites.filter((id) => products.some((product) => product.id === id));
  const { error } = await auth.supabase.from("user_shop_state").upsert({ user_id: auth.user.id, cart: safeCart, favorites: safeFavorites, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  databaseError(error);
  return Response.json({ cart: safeCart.flatMap((line) => { const product = products.find((item) => item.id === line.id); return product ? [{ product, quantity: line.quantity }] : []; }), favorites: safeFavorites });
});
