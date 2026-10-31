"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { type Product } from "@/lib/catalog";
import { useAuth } from "@/components/auth-provider";

export type CartLine = { product: Product; quantity: number };
type ShopContextValue = {
  cart: CartLine[];
  favorites: string[];
  itemCount: number;
  subtotal: number;
  notice: string;
  addToCart: (product: Product, quantity?: number) => void;
  changeQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  toggleFavorite: (id: string) => void;
};

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, user } = useAuth();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  const stateRef = useRef<{ cart: CartLine[]; favorites: string[] }>({ cart: [], favorites: [] });
  const syncedToken = useRef<string | null>(null);
  const remoteReady = useRef(false);
  const previousUser = useRef<string | null>(null);
  const [isolationReadyFor, setIsolationReadyFor] = useState<string | null>(null);

  useEffect(() => {
    const current = user?.id || null;
    if (previousUser.current && previousUser.current !== current) {
      remoteReady.current = false; syncedToken.current = null;
      stateRef.current = { cart: [], favorites: [] };
      queueMicrotask(() => { setCart([]); setFavorites([]); setIsolationReadyFor(current); });
      try { localStorage.removeItem("fir-de-poveste-cart"); localStorage.removeItem("fir-de-poveste-favorites"); } catch {}
    } else queueMicrotask(() => setIsolationReadyFor(current));
    previousUser.current = current;
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        setCart(JSON.parse(localStorage.getItem("fir-de-poveste-cart") || "[]") as CartLine[]);
        setFavorites(JSON.parse(localStorage.getItem("fir-de-poveste-favorites") || "[]") as string[]);
      } catch {}
      setReady(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("fir-de-poveste-cart", JSON.stringify(cart));
      localStorage.setItem("fir-de-poveste-favorites", JSON.stringify(favorites));
    } catch {}
  }, [cart, favorites, ready]);

  useEffect(() => { stateRef.current = { cart, favorites }; }, [cart, favorites]);

  useEffect(() => {
    if (!ready || !accessToken || isolationReadyFor !== user?.id || syncedToken.current === accessToken) return;
    syncedToken.current = accessToken;
    remoteReady.current = false;
    const current = stateRef.current;
    const controller = new AbortController();
    void fetch("/api/shop-state", { signal: controller.signal, method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ cart: current.cart.map((line) => ({ id: line.product.id, quantity: line.quantity })), favorites: current.favorites, merge: true }) })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data: { cart?: CartLine[]; favorites?: string[] } | null) => { if (controller.signal.aborted) return; if (data?.cart) setCart(data.cart); if (data?.favorites) setFavorites(data.favorites); })
      .catch(() => undefined)
      .finally(() => { if (!controller.signal.aborted) remoteReady.current = true; });
    return () => controller.abort();
  }, [accessToken, ready, isolationReadyFor, user?.id]);

  useEffect(() => {
    if (!ready || !accessToken || isolationReadyFor !== user?.id || !remoteReady.current) return;
    const timeout = window.setTimeout(() => {
      void fetch("/api/shop-state", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ cart: cart.map((line) => ({ id: line.product.id, quantity: line.quantity })), favorites }) }).catch(() => undefined);
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [accessToken, cart, favorites, ready, isolationReadyFor, user?.id]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 2500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const value = useMemo<ShopContextValue>(() => ({
    cart,
    favorites,
    itemCount: cart.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0),
    notice,
    addToCart(product, quantity = 1) {
      if (product.stock < 1) { setNotice("Produsul nu mai este în stoc."); return; }
      setCart((current) => {
        const existing = current.find((line) => line.product.id === product.id);
        if (!existing) return [...current, { product, quantity: Math.min(quantity, product.stock) }];
        return current.map((line) => line.product.id === product.id ? { ...line, quantity: Math.min(line.quantity + quantity, product.stock) } : line);
      });
      setNotice(`${product.name} a fost adăugat în coș.`);
    },
    changeQuantity(id, delta) {
      setCart((current) => current.map((line) => line.product.id === id ? { ...line, quantity: Math.min(line.product.stock, line.quantity + delta) } : line).filter((line) => line.quantity > 0));
    },
    removeFromCart(id) { setCart((current) => current.filter((line) => line.product.id !== id)); },
    clearCart() { setCart([]); },
    toggleFavorite(id) { setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); },
  }), [cart, favorites, notice]);

  return <ShopContext.Provider value={value}>{children}{notice && <div className="toast" role="status">{notice}</div>}</ShopContext.Provider>;
}

export function useShop() {
  const value = useContext(ShopContext);
  if (!value) throw new Error("useShop must be used inside ShopProvider");
  return value;
}
