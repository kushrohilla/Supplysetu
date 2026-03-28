"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { RETAILER_CART_STORAGE_KEY } from "@/services/session.constants";
import type { CartItem } from "@/types/cart";
import type { Product } from "@/types/catalogue";
import { mapProductToCartItem } from "@/types/cart";

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  totalAmount: number;
  addItem: (product: Product) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const canUseStorage = () => typeof window !== "undefined";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (!canUseStorage()) {
      return [];
    }

    const rawCart = window.localStorage.getItem(RETAILER_CART_STORAGE_KEY);
    if (!rawCart) {
      return [];
    }

    try {
      return JSON.parse(rawCart) as CartItem[];
    } catch {
      window.localStorage.removeItem(RETAILER_CART_STORAGE_KEY);
      return [];
    }
  });

  useEffect(() => {
    if (!canUseStorage()) {
      return;
    }

    window.localStorage.setItem(RETAILER_CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      addItem: (product) => {
        setItems((currentItems) => {
          const existing = currentItems.find((item) => item.productId === product.id);
          if (!existing) {
            return [...currentItems, mapProductToCartItem(product)];
          }

          return currentItems.map((item) =>
            item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
          );
        });
      },
      updateQuantity: (productId, quantity) => {
        setItems((currentItems) =>
          currentItems.flatMap((item) => {
            if (item.productId !== productId) {
              return [item];
            }

            if (quantity <= 0) {
              return [];
            }

            return [{ ...item, quantity }];
          }),
        );
      },
      removeItem: (productId) => {
        setItems((currentItems) => currentItems.filter((item) => item.productId !== productId));
      },
      clearCart: () => {
        setItems([]);
      },
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return context;
};
