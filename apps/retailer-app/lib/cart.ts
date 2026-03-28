import type { Product } from "@/types/catalogue";
import type { CartItem } from "@/types/cart";

export const mapProductToCartItem = (product: Product): CartItem => ({
  product_id: product.id,
  name: product.name,
  price: product.basePrice,
  quantity: 1,
});

export const addCartItem = (items: CartItem[], product: Product) => {
  const existing = items.find((item) => item.product_id === product.id);
  if (!existing) {
    return [...items, mapProductToCartItem(product)];
  }

  return items.map((item) =>
    item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
  );
};

export const updateCartItemQuantity = (items: CartItem[], productId: string, quantity: number) =>
  items.flatMap((item) => {
    if (item.product_id !== productId) {
      return [item];
    }

    if (quantity <= 0) {
      return [];
    }

    return [{ ...item, quantity }];
  });

export const removeCartItem = (items: CartItem[], productId: string) =>
  items.filter((item) => item.product_id !== productId);

export const calculateCartItemCount = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + item.quantity, 0);

export const calculateCartTotal = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0);
