"use client";

import { apiService } from "@/services/api.service";
import type { CreateOrderPayload, Order, OrderStatus } from "@/types/order";

class OrderService {
  async fetchOrders(): Promise<Order[]> {
    return apiService.request<Order[]>("/orders", { method: "GET" });
  }

  async fetchOrder(orderId: string): Promise<Order> {
    return apiService.request<Order>(`/orders/${encodeURIComponent(orderId)}`, { method: "GET" });
  }

  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    return apiService.request<Order>("/orders", {
      method: "POST",
      body: payload,
    });
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    return apiService.request<Order>(`/orders/${encodeURIComponent(orderId)}/status`, {
      method: "PATCH",
      body: { status },
    });
  }
}

export const orderService = new OrderService();
