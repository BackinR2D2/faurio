import { getProductsByIds } from "@/lib/products";
import { getRequestAuth } from "@/lib/supabase-auth-server";

type StoredLine = { id: string; quantity: number };

export async function GET(request: Request) {
  const auth = await getRequestAuth(request);
  if (!auth) return Response.json({ error: "Autentificare necesară." }, { status: 401 });
  const { data, error } = await auth.supabase.from("user_shop_state").select("cart,favorites").eq("user_id", auth.user.id).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const cart = (Array.isArray(data?.cart) ? data.cart : []) as StoredLine[];
  const favorites = Array.isArray(data?.favorites) ? data.favorites.map(String) : [];
  const products = await getProductsByIds([...cart.map((line) => line.id), ...favorites]);
  return Response.json({ cart: cart.flatMap((line) => { const product = products.find((item) => item.id === line.id); return product ? [{ product, quantity: Math.min(product.stock, Math.max(1, Number(line.quantity) || 1)) }] : []; }), favorites: favorites.filter((id) => products.some((product) => product.id === id)) });
}

export async function PUT(request: Request) {
  const auth = await getRequestAuth(request);
  if (!auth) return Response.json({ error: "Autentificare necesară." }, { status: 401 });
  const body = await request.json() as { cart?: StoredLine[]; favorites?: string[]; merge?: boolean };
  const incomingCart = (body.cart || []).slice(0, 30).filter((line) => line.id && Number(line.quantity) > 0);
  const incomingFavorites = Array.from(new Set((body.favorites || []).map(String))).slice(0, 100);
  let cart = incomingCart;
  let favorites = incomingFavorites;
  if (body.merge) {
    const { data } = await auth.supabase.from("user_shop_state").select("cart,favorites").eq("user_id", auth.user.id).maybeSingle();
    const remoteCart = (Array.isArray(data?.cart) ? data.cart : []) as StoredLine[];
    const map = new Map(remoteCart.map((line) => [line.id, Number(line.quantity) || 1]));
    incomingCart.forEach((line) => map.set(line.id, Math.max(map.get(line.id) || 0, Number(line.quantity) || 1)));
    cart = Array.from(map, ([id, quantity]) => ({ id, quantity }));
    favorites = Array.from(new Set([...(Array.isArray(data?.favorites) ? data.favorites.map(String) : []), ...incomingFavorites]));
  }
  const products = await getProductsByIds([...cart.map((line) => line.id), ...favorites]);
  const safeCart = cart.flatMap((line) => { const product = products.find((item) => item.id === line.id); return product && product.stock > 0 ? [{ id: product.id, quantity: Math.min(product.stock, 10, Math.max(1, Math.floor(Number(line.quantity) || 1))) }] : []; });
  const safeFavorites = favorites.filter((id) => products.some((product) => product.id === id));
  const { error } = await auth.supabase.from("user_shop_state").upsert({ user_id: auth.user.id, cart: safeCart, favorites: safeFavorites, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ cart: safeCart.flatMap((line) => { const product = products.find((item) => item.id === line.id); return product ? [{ product, quantity: line.quantity }] : []; }), favorites: safeFavorites });
}
