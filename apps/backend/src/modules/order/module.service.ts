import type { Knex } from "knex";

import { HTTP_STATUS } from "../../shared/constants/http-status";
import { AppError } from "../../shared/errors/app-error";
import type { OrderRepository } from "./module.repository";
import { ORDER_STATUS, canTransitionOrderStatus, type OrderStatus } from "./order-status";

type CreateOrderItemPayload = {
  product_id: string;
  quantity: number;
};

type CreateOrderPayload = {
  retailer_id: string;
  items: CreateOrderItemPayload[];
};

export class OrderService {
  constructor(
    private readonly db: Knex,
    private readonly orderRepository: OrderRepository,
  ) {}

  async createOrder(tenantId: string, payload: CreateOrderPayload) {
    const normalizedItems = this.normalizeItems(payload.items);

    return this.db.transaction(async (trx) => {
      const retailer = await this.orderRepository.findRetailerById(tenantId, payload.retailer_id, trx);
      if (!retailer) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, "RETAILER_NOT_FOUND", "Retailer not found");
      }

      const products = await this.orderRepository.getProductsForTenant(
        tenantId,
        normalizedItems.map((item) => item.product_id),
        trx,
      );

      if (products.length !== normalizedItems.length) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, "PRODUCT_NOT_FOUND", "One or more products were not found");
      }

      const productMap = new Map(products.map((product) => [String(product.id), product]));
      const nextSequence = await this.orderRepository.getNextOrderSequence(tenantId, trx);
      const orderNumber = `ORD-${String(nextSequence).padStart(6, "0")}`;
      const orderItems = normalizedItems.map((item) => {
        const product = productMap.get(item.product_id);
        if (!product) {
          throw new AppError(HTTP_STATUS.NOT_FOUND, "PRODUCT_NOT_FOUND", "One or more products were not found");
        }

        const price = Number(product.base_price ?? 0);
        return {
          product_id: item.product_id,
          quantity: item.quantity,
          price,
          total_price: price * item.quantity,
        };
      });

      const totalAmount = orderItems.reduce((sum, item) => sum + item.total_price, 0);
      const created = await this.orderRepository.createOrderWithItems(
        tenantId,
        {
          retailer_id: payload.retailer_id,
          order_number: orderNumber,
          status: ORDER_STATUS.PLACED,
          total_amount: totalAmount,
        },
        orderItems,
        trx,
      );

      if (!created) {
        throw new AppError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "ORDER_CREATE_FAILED", "Order could not be created");
      }

      return created;
    });
  }

  async listOrders(tenantId: string) {
    return this.orderRepository.listOrders(tenantId);
  }

  async getOrder(tenantId: string, orderId: string) {
    const order = await this.orderRepository.getOrderById(tenantId, orderId);
    if (!order) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, "ORDER_NOT_FOUND", "Order not found");
    }

    return order;
  }

  async updateStatus(tenantId: string, orderId: string, nextStatus: OrderStatus) {
    const order = await this.orderRepository.getOrderById(tenantId, orderId);
    if (!order) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, "ORDER_NOT_FOUND", "Order not found");
    }

    if (!canTransitionOrderStatus(order.status, nextStatus)) {
      throw new AppError(
        HTTP_STATUS.CONFLICT,
        "INVALID_ORDER_STATUS_TRANSITION",
        `Cannot transition order from ${order.status} to ${nextStatus}`,
      );
    }

    const updated = await this.orderRepository.updateStatus(tenantId, orderId, nextStatus);
    if (!updated) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, "ORDER_NOT_FOUND", "Order not found");
    }

    return updated;
  }

  private normalizeItems(items: CreateOrderItemPayload[]) {
    const merged = new Map<string, number>();

    for (const item of items) {
      merged.set(item.product_id, (merged.get(item.product_id) ?? 0) + item.quantity);
    }

    return [...merged.entries()].map(([product_id, quantity]) => ({
      product_id,
      quantity,
    }));
  }
}
