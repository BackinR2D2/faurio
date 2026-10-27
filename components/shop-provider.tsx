"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { type Product } from "@/lib/catalog";

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
  const [cart, setCart] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setCart(JSON.parse(localStorage.getItem("fir-de-poveste-cart") || "[]") as CartLine[]);
      setFavorites(JSON.parse(localStorage.getItem("fir-de-poveste-favorites") || "[]") as string[]);
    } catch { /* Storage is optional. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("fir-de-poveste-cart", JSON.stringify(cart));
      localStorage.setItem("fir-de-poveste-favorites", JSON.stringify(favorites));
    } catch { /* Storage is optional. */ }
  }, [cart, favorites, ready]);

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
