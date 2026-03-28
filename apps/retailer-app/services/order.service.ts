import { apiService } from "@/services/api.service";
import type { OrderDetail, OrderSummary } from "@/types/order";

export const orderService = {
  placeOrder(items: Array<{ product_id: string; quantity: number }>) {
    return apiService.request<OrderDetail>("/orders", {
      method: "POST",
      body: { items },
    });
  },

  listOrders() {
    return apiService.request<OrderSummary[]>("/orders");
  },

  getOrder(orderId: string) {
    return apiService.request<OrderDetail>(`/orders/${encodeURIComponent(orderId)}`);
  },
};
