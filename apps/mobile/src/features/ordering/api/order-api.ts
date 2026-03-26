import { authSessionStore } from "@/features/auth/state/auth-session-store";
import { apiClient } from "@/services/api/api-client";

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

export const orderApi = {
  async createOrder(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
    const session = await authSessionStore.load();
    const tenantId = session?.user.tenantId ?? "";
    const subtotal = payload.items.reduce((sum, item) => sum + item.product.basePrice * item.quantity, 0);
    const totalQuantity = payload.items.reduce((sum, item) => sum + item.quantity, 0);

    const response = await apiClient.request<{
      orderId: string;
      orderNumber: string;
      totalAmount: number;
    }>("/orders/create", {
      method: "POST",
      body: {
        tenant_id: tenantId,
        payment_mode: payload.paymentMode,
        items: payload.items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
      },
      idempotencyKey: `mobile-${Date.now()}`,
    });

    return {
      orderId: response.orderId,
      distributorName: "Assigned Distributor",
      expectedDeliveryDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      paymentMode: payload.paymentMode,
      subtotal: response.totalAmount ?? subtotal,
      totalQuantity,
    };
  },

  async clearCart(): Promise<void> {
    return;
  },
};
