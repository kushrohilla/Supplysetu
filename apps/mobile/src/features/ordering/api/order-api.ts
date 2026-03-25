import { PaymentMode, ProductSummary } from "../ordering.types";

type CreateOrderPayload = {
  retailerId: string;
  paymentMode: PaymentMode;
  items: Array<{
    product: ProductSummary;
    quantity: number;
  }>;
};

type CreateOrderResponse = {
  orderId: string;
  distributorName: string;
  expectedDeliveryDate: string;
  paymentMode: PaymentMode;
  subtotal: number;
  totalQuantity: number;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const orderApi = {
  async createOrder(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
    await delay(650);

    const subtotal = payload.items.reduce(
      (sum, item) => sum + item.product.basePrice * item.quantity,
      0
    );
    const totalQuantity = payload.items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      orderId: `ORD-${Date.now()}`,
      distributorName: "Aarav Distribution",
      expectedDeliveryDate: payload.paymentMode === "advance" ? "2026-03-26" : "2026-03-27",
      paymentMode: payload.paymentMode,
      subtotal,
      totalQuantity
    };
  },

  async clearCart(): Promise<void> {
    await delay(100);
  }
};
