import type { Knex } from "knex";

import { HTTP_STATUS } from "../../shared/constants/http-status";
import { AppError } from "../../shared/errors/app-error";
import type { EventBus } from "../../shared/event-bus";
import type { InventoryRepository } from "../inventory/module.repository";
import type { PricingRepository } from "../pricing/module.repository";
import { ORDER_ERROR } from "./order.errors";
import type { OrderRepository } from "./module.repository";
import { canTransitionOrderStatus, ORDER_STATUS, type OrderStatus } from "./order-status";

type PlaceOrderInput = {
  tenantId: string;
  retailerId: string;
  paymentMode: "advance" | "cod";
  items: Array<{ product_id: string; quantity: number }>;
  idempotencyKey: string;
  notes?: string;
};

export class OrderService {
  constructor(
    private readonly db: Knex,
    private readonly orderRepository: OrderRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly pricingRepository: PricingRepository,
    private readonly eventBus: EventBus,
  ) {}

  async placeOrder(input: PlaceOrderInput) {
    const normalizedItems = this.normalizeItems(input.items);

    return this.db.transaction(async (trx) => {
      const existing = await this.orderRepository.findExistingByIdempotencyKey(input.idempotencyKey, trx);
      if (existing) {
        return {
          orderId: String(existing.id),
          orderNumber: existing.order_number,
          status: existing.status,
          totalAmount: Number(existing.total_amount),
        };
      }

      const productIds = normalizedItems.map((item) => item.product_id);
      await this.inventoryRepository.lockProductsForUpdate(input.tenantId, productIds, trx);

      const products = await this.orderRepository.getProductsForOrder(input.tenantId, productIds, trx);
      if (products.length !== normalizedItems.length) {
        throw new AppError(HTTP_STATUS.BAD_REQUEST, ORDER_ERROR.INVALID_PRODUCTS, "One or more products do not exist");
      }

      const stockMap = await this.inventoryRepository.getAvailableStock(input.tenantId, productIds, trx);
      const lockedStockMap = await this.inventoryRepository.getActiveLockedStock(input.tenantId, productIds, trx);

      const pricedItems = normalizedItems.map((item) => {
        const product = products.find((candidate) => String(candidate.id) === item.product_id);
        const unitPrice = this.pricingRepository.resolveUnitPrice(product, input.paymentMode);
        const currentStock = stockMap[item.product_id] ?? 0;
        const lockedStock = lockedStockMap[item.product_id] ?? 0;
        const availableToPromise = currentStock - lockedStock;

        if (availableToPromise < item.quantity) {
          throw new AppError(
            HTTP_STATUS.CONFLICT,
            ORDER_ERROR.INSUFFICIENT_STOCK,
            `Insufficient stock for product ${item.product_id}`,
            {
              product_id: item.product_id,
              current_stock: currentStock,
              locked_stock: lockedStock,
              available_to_promise: availableToPromise,
              requested_quantity: item.quantity,
            },
          );
        }

        return {
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: unitPrice,
          line_total: unitPrice * item.quantity,
          product_name: product?.product_name,
          pack_size: product?.pack_size,
        };
      });

      const totalAmount = pricedItems.reduce((sum, item) => sum + item.line_total, 0);
      if (totalAmount < 1500) {
        throw new AppError(HTTP_STATUS.BAD_REQUEST, ORDER_ERROR.MINIMUM_ORDER_VALUE, "Minimum order value is Rs 1500");
      }

      const orderNumber = `ORD-${Date.now()}`;
      const orderId = await this.orderRepository.createOrderHeader(
        {
          tenant_id: input.tenantId,
          retailer_id: input.retailerId,
          order_number: orderNumber,
          total_amount: totalAmount,
          status: ORDER_STATUS.PENDING_APPROVAL,
          idempotency_key: input.idempotencyKey,
          metadata: {
            source: "mobile",
            notes: input.notes ?? null,
            items_count: pricedItems.length,
          },
        },
        trx,
      );

      const lineIds = await this.orderRepository.createOrderLines(orderId, pricedItems, trx);
      await this.orderRepository.createStockLocks(orderId, input.tenantId, lineIds, pricedItems, trx);
      await this.orderRepository.createPayment(
        {
          order_id: orderId,
          payment_type: input.paymentMode === "cod" ? "cash" : "advance",
          amount: totalAmount,
          payment_status: "pending",
        },
        input.tenantId,
        trx,
      );
      await this.orderRepository.markRetailerLinkOrder(input.tenantId, input.retailerId, totalAmount, trx);

      await this.eventBus.emit("order.created", {
        orderId,
        tenantId: input.tenantId,
        retailerId: input.retailerId,
        itemCount: pricedItems.length,
      });

      return {
        orderId,
        orderNumber,
        status: ORDER_STATUS.PENDING_APPROVAL,
        totalAmount,
      };
    });
  }

  async transitionStatus(orderId: string, nextStatus: OrderStatus) {
    const orderResult = await this.orderRepository.getOrderById(orderId);
    const currentOrder = orderResult?.order;

    if (!currentOrder) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, ORDER_ERROR.ORDER_NOT_FOUND, "Order not found");
    }

    const currentStatus = currentOrder.status as OrderStatus;
    if (!canTransitionOrderStatus(currentStatus, nextStatus)) {
      throw new AppError(
        HTTP_STATUS.CONFLICT,
        ORDER_ERROR.INVALID_STATUS_TRANSITION,
        `Cannot transition order from ${currentStatus} to ${nextStatus}`,
      );
    }

    await this.db.transaction(async (trx) => {
      await this.orderRepository.updateStatus(orderId, nextStatus, trx);
      if (nextStatus === ORDER_STATUS.CANCELLED || nextStatus === ORDER_STATUS.DELIVERED) {
        await this.orderRepository.releaseStockLocks(orderId, trx);
      }
    });
  }

  async listOrders(retailerId: string, tenantId: string, limit: number) {
    const orders = await this.orderRepository.getRetailerOrders(retailerId, tenantId, limit);
    return orders.map((order) => ({
      id: String(order.id),
      orderDate: new Date(order.created_at).toISOString().slice(0, 10),
      status: this.toMobileStatus(order.status as OrderStatus),
      paymentMode: "cod" as const,
      totalAmount: Number(order.total_amount),
      expectedDeliveryDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      items: [],
      timeline: this.buildTimeline(order.status as OrderStatus, order.created_at),
    }));
  }

  async getOrder(retailerId: string, orderId: string) {
    const result = await this.orderRepository.getOrderById(orderId, retailerId);
    if (!result) {
      return null;
    }

    return {
      id: result.order.id,
      orderDate: new Date(result.order.created_at).toISOString().slice(0, 10),
      status: this.toMobileStatus(result.order.status as OrderStatus),
      paymentMode: result.payment?.payment_type === "advance" ? "advance" : "cod",
      totalAmount: result.order.total_amount,
      expectedDeliveryDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      items: result.items.map((item) => ({
        quantity: item.quantity,
        product: {
          id: item.product.id,
          brandId: item.product.brand_id ?? "",
          brandName: item.product.brand_name,
          name: item.product.name,
          packSize: item.product.pack_size,
          basePrice: item.product.base_price,
          advancePrice: item.product.advance_price,
          schemeTag: null,
          imageUrl: null,
        },
      })),
      stockLocks: result.stockLocks.map((lock) => ({
        productId: String(lock.product_id),
        lockedQuantity: Number(lock.locked_quantity),
        status: lock.status,
      })),
      timeline: this.buildTimeline(result.order.status as OrderStatus, result.order.created_at),
    };
  }

  async getQuickReorder(retailerId: string, tenantId: string) {
    const orders = await this.orderRepository.getRetailerOrders(retailerId, tenantId, 5);
    return {
      recent_items: orders,
      frequently_ordered: [],
      suggested_refills: [],
    };
  }

  private normalizeItems(items: Array<{ product_id: string; quantity: number }>) {
    const merged = new Map<string, number>();

    for (const item of items) {
      merged.set(item.product_id, (merged.get(item.product_id) ?? 0) + item.quantity);
    }

    return [...merged.entries()].map(([product_id, quantity]) => ({
      product_id,
      quantity,
    }));
  }

  private toMobileStatus(status: OrderStatus): "invoiced" | "dispatched" | "delivered" {
    if (status === ORDER_STATUS.DELIVERED || status === ORDER_STATUS.CLOSED) return "delivered";
    if (status === ORDER_STATUS.DISPATCHED) return "dispatched";
    return "invoiced";
  }

  private buildTimeline(status: OrderStatus, createdAt: string) {
    const invoicedStatuses = new Set<OrderStatus>([
      ORDER_STATUS.PENDING_APPROVAL,
      ORDER_STATUS.CONFIRMED,
      ORDER_STATUS.DISPATCHED,
      ORDER_STATUS.DELIVERED,
      ORDER_STATUS.CLOSED,
    ]);
    const dispatchedStatuses = new Set<OrderStatus>([
      ORDER_STATUS.DISPATCHED,
      ORDER_STATUS.DELIVERED,
      ORDER_STATUS.CLOSED,
    ]);
    const deliveredStatuses = new Set<OrderStatus>([
      ORDER_STATUS.DELIVERED,
      ORDER_STATUS.CLOSED,
    ]);

    const invoiced = invoicedStatuses.has(status);
    const dispatched = dispatchedStatuses.has(status);
    const delivered = deliveredStatuses.has(status);

    return [
      { key: "invoiced", label: "Invoiced", timestamp: new Date(createdAt).toLocaleString("en-IN"), completed: invoiced },
      { key: "dispatched", label: "Dispatched", timestamp: dispatched ? "Dispatched" : "Awaiting dispatch", completed: dispatched },
      { key: "delivered", label: "Delivered", timestamp: delivered ? "Delivered" : "Expected soon", completed: delivered },
    ];
  }
}
