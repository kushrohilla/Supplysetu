import { PropsWithChildren, createContext, useContext, useMemo, useState } from "react";

import { CartItem, CartSummary, PaymentMode, ProductSummary } from "../ordering.types";

type OrderConfirmation = {
  orderId: string;
  expectedDeliveryDate: string;
  paymentMode: PaymentMode;
  subtotal: number;
  totalQuantity: number;
} | null;

type CartContextValue = {
  items: Record<string, CartItem>;
  paymentMode: PaymentMode | null;
  lastOrderConfirmation: OrderConfirmation;
  summary: CartSummary;
  getQuantity: (productId: string) => number;
  setQuantity: (product: ProductSummary, quantity: number) => void;
  increment: (product: ProductSummary) => void;
  decrement: (product: ProductSummary) => void;
  replaceCart: (items: Array<{ product: ProductSummary; quantity: number }>) => void;
  setPaymentMode: (mode: PaymentMode) => void;
  setLastOrderConfirmation: (confirmation: NonNullable<OrderConfirmation>) => void;
  clearCart: () => void;
};

const MINIMUM_ORDER_VALUE = 1500;

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider = ({ children }: PropsWithChildren) => {
  const [items, setItems] = useState<Record<string, CartItem>>({});
  const [paymentMode, setPaymentModeState] = useState<PaymentMode | null>(null);
  const [lastOrderConfirmation, setLastOrderConfirmationState] = useState<OrderConfirmation>(null);

  const summary = useMemo<CartSummary>(() => {
    const itemList = Object.values(items);
    const subtotal = itemList.reduce((total, item) => total + item.quantity * item.product.basePrice, 0);
    const totalQuantity = itemList.reduce((total, item) => total + item.quantity, 0);
    const remainingToMinimum = Math.max(MINIMUM_ORDER_VALUE - subtotal, 0);

    return {
      items: itemList,
      totalQuantity,
      subtotal,
      minimumOrderValue: MINIMUM_ORDER_VALUE,
      remainingToMinimum,
      meetsMinimumOrderValue: remainingToMinimum === 0
    };
  }, [items]);

  const setQuantity = (product: ProductSummary, quantity: number) => {
    setItems((currentItems) => {
      if (quantity <= 0) {
        const nextItems = { ...currentItems };
        delete nextItems[product.id];
        return nextItems;
      }

      return {
        ...currentItems,
        [product.id]: {
          product,
          quantity
        }
      };
    });
  };

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      paymentMode,
      lastOrderConfirmation,
      summary,
      getQuantity: (productId: string) => items[productId]?.quantity ?? 0,
      setQuantity,
      increment: (product) => setQuantity(product, (items[product.id]?.quantity ?? 0) + 1),
      decrement: (product) => setQuantity(product, Math.max((items[product.id]?.quantity ?? 0) - 1, 0)),
      replaceCart: (nextItems) => {
        const record = nextItems.reduce<Record<string, CartItem>>((accumulator, item) => {
          accumulator[item.product.id] = item;
          return accumulator;
        }, {});
        setItems(record);
      },
      setPaymentMode: (mode) => {
        setPaymentModeState(mode);
      },
      setLastOrderConfirmation: (confirmation) => {
        setLastOrderConfirmationState(confirmation);
      },
      clearCart: () => {
        setItems({});
        setPaymentModeState(null);
      }
    }),
    [items, lastOrderConfirmation, paymentMode, summary]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
};
