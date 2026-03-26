import { AppError } from "../../shared/errors/app-error";
import type {
  DistributorRow,
  OrderHistoryListRow,
  OrderItemRow,
  OrderRepository,
  OrderRow,
  PricingTier,
  ProductStockRow,
  TenantProductRow,
} from "./order.repository";
import type {
  CreateOrderInput,
  ListOrdersQuery,
  RecentOrdersQuery,
  ReorderOrderInput,
} from "./order.schema";
import { canTransitionOrderStatus, ORDER_STATUS, type OrderStatus } from "./order-status";

export type OrderItemDto = {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderDto = {
  id: string;
  tenantId: string;
  retailerId: string | null;
  orderNumber: string | null;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
};

export type OrderHistoryItemDto = {
  id: string;
  orderNumber: string | null;
  status: string;
  totalAmount: number;
  createdAt: string;
};

export type OrderHistoryListResponseDto = {
  items: OrderHistoryItemDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasNextPage: boolean;
};

export type OrderDetailDto = {
  order: OrderDto;
  items: OrderItemDto[];
};

export type RecentOrderCardDto = {
  orderId: string;
  orderNumber: string | null;
  status: string;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
};

export type OrderSummaryResponseDto = {
  orderId: string;
  orderNumber: string | null;
  distributorId: string;
  retailerId: string | null;
  status: string;
  pricingTier: PricingTier;
  currency: "INR";
  itemCount: number;
  subtotalAmount: number;
  totalAmount: number;
  createdAt: string;
};

export type OutOfStockErrorDetail = {
  productId: string;
  availableStock: number;
  requestedQuantity: number;
  shortageQuantity: number;
};

export type OrderStatusTransitionResponseDto = {
  orderId: string;
  previousStatus: OrderStatus;
  currentStatus: OrderStatus;
  updatedAt: string;
  audit: {
    placedAt: string | null;
    confirmedAt: string | null;
    packedAt: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    cancelledAt: string | null;
  };
};

type NormalizedOrderItem = {
  productId: string;
  quantity: number;
};

export class OrderService {
  constructor(private readonly orderRepository: OrderRepository) {}

  async listOrders(query: ListOrdersQuery): Promise<OrderHistoryListResponseDto> {
    const result = await this.orderRepository.findHistoryPage({
      tenantId: query.tenantId,
      retailerId: query.retailerId,
      status: query.status,
      fromDate: query.fromDate,
      toDate: query.toDate,
      page: query.page,
      pageSize: query.pageSize,
    });

    return {
      items: result.rows.map((order) => this.toOrderHistoryItemDto(order)),
      page: query.page,
      pageSize: query.pageSize,
      totalCount: result.totalCount,
      hasNextPage: query.page * query.pageSize < result.totalCount,
    };
  }

  async getRecentOrders(query: RecentOrdersQuery): Promise<RecentOrderCardDto[]> {
    const orders = await this.orderRepository.findRecentOrders({
      tenantId: query.tenantId,
      retailerId: query.retailerId,
      limit: query.limit,
    });

    const recentOrders = await Promise.all(
      orders.map(async (order) => {
        const items = await this.orderRepository.findItemsByOrderId(order.id);
        return {
          orderId: String(order.id),
          orderNumber: order.order_number ? String(order.order_number) : null,
          status: order.status,
          totalAmount: Number(order.total_amount ?? 0),
          itemCount: items.length,
          createdAt: String(order.created_at),
        };
      }),
    );

    return recentOrders;
  }

  async getOrderById(orderId: string): Promise<OrderDetailDto> {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
    }

    const items = await this.orderRepository.findItemsByOrderId(orderId);

    return {
      order: this.toOrderDto(order),
      items: items.map((item) => this.toOrderItemDto(item)),
    };
  }

  async createOrder(input: CreateOrderInput): Promise<OrderSummaryResponseDto> {
    return this.createDraftOrderFromItems({
      tenantId: String(input.tenantId),
      retailerId: input.retailerId ? String(input.retailerId) : undefined,
      pricingTier: input.pricingTier,
      notes: input.notes,
      status: input.status,
      items: this.normalizeItems(input.items),
    });
  }

  async reorderOrder(orderId: string, input: ReorderOrderInput): Promise<OrderSummaryResponseDto> {
    const previousOrder = await this.orderRepository.findOrderWithItems(orderId);

    if (!previousOrder) {
      throw new AppError("Source order not found", 404, "ORDER_REORDER_SOURCE_NOT_FOUND", { orderId });
    }

    if (String(previousOrder.order.tenant_id) !== String(input.tenantId)) {
      throw new AppError("Order does not belong to requested distributor", 409, "ORDER_REORDER_TENANT_MISMATCH", {
        orderId,
        requestedTenantId: String(input.tenantId),
        actualTenantId: String(previousOrder.order.tenant_id),
      });
    }

    const clonedItems: Array<{ productId: string; quantity: number }> = previousOrder.items.map((item) => ({
      productId: String(item.product_id),
      quantity: Number(item.quantity),
    }));

    return this.createDraftOrderFromItems({
      tenantId: String(input.tenantId),
      retailerId:
        input.retailerId !== undefined
          ? String(input.retailerId)
          : previousOrder.order.retailer_id !== null && previousOrder.order.retailer_id !== undefined
            ? String(previousOrder.order.retailer_id)
            : undefined,
      pricingTier: input.pricingTier ?? this.extractPricingTier(previousOrder.order),
      notes: input.notes,
      status: ORDER_STATUS.DRAFT,
      items: this.normalizeItems(clonedItems),
    });
  }

  async transitionOrderStatus(
    orderId: string,
    nextStatus: OrderStatus,
  ): Promise<OrderStatusTransitionResponseDto> {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new AppError("Order not found", 404, "ORDER_NOT_FOUND", { orderId });
    }

    const currentStatus = order.status as OrderStatus;

    if (currentStatus === nextStatus) {
      return this.toOrderStatusTransitionDto(order, currentStatus);
    }

    if (!canTransitionOrderStatus(currentStatus, nextStatus)) {
      throw new AppError(
        "Invalid order status transition",
        409,
        "ORDER_STATUS_TRANSITION_INVALID",
        {
          orderId,
          currentStatus,
          attemptedStatus: nextStatus,
          allowedNextStatuses: this.getAllowedNextStatuses(currentStatus),
        },
      );
    }

    if (currentStatus === ORDER_STATUS.SHIPPED && nextStatus === ORDER_STATUS.CANCELLED) {
      throw new AppError(
        "Shipped orders cannot be cancelled",
        409,
        "ORDER_STATUS_TRANSITION_BLOCKED",
        {
          orderId,
          currentStatus,
          attemptedStatus: nextStatus,
        },
      );
    }

    const updatedOrder = await this.orderRepository.updateStatus(orderId, nextStatus);
    return this.toOrderStatusTransitionDto(updatedOrder, currentStatus);
  }

  private async createDraftOrderFromItems(input: {
    tenantId: string;
    retailerId?: string;
    pricingTier: PricingTier;
    notes?: string;
    status: OrderStatus;
    items: NormalizedOrderItem[];
  }): Promise<OrderSummaryResponseDto> {
    try {
      return await this.orderRepository.withTransaction(async (trx) => {
        const distributor = await this.orderRepository.findDistributorById(input.tenantId, trx);
        this.assertDistributorExists(distributor, input.tenantId);

        const productIds = input.items.map((item) => item.productId);
        // Lock the product rows first so overlapping carts serialize on the same SKU set.
        const products = await this.orderRepository.lockActiveProducts(input.tenantId, productIds, trx);

        if (products.length !== input.items.length) {
          throw new AppError(
            "One or more products are invalid or inactive",
            400,
            "ORDER_PRODUCTS_INVALID",
            {
              tenantId: input.tenantId,
              requestedProductIds: productIds,
              resolvedProductIds: products.map((product) => product.id),
            },
          );
        }

        const latestStockSnapshots = await this.orderRepository.getLatestStockSnapshots(
          input.tenantId,
          productIds,
          trx,
        );

        const stockByProductId = this.indexStockByProductId(latestStockSnapshots);

        const pricedItems = input.items.map((item) => {
          const product = products.find((candidate) => candidate.id === item.productId);

          if (!product) {
            throw new AppError("Product not found during order placement", 400, "ORDER_PRODUCT_NOT_FOUND", {
              productId: item.productId,
            });
          }

          const availableStock = stockByProductId.get(item.productId) ?? 0;
          if (availableStock < item.quantity) {
            throw this.buildOutOfStockError({
              productId: item.productId,
              availableStock,
              requestedQuantity: item.quantity,
            });
          }

          const unitPrice = this.resolveUnitPrice(product, input.pricingTier);
          const lineTotal = unitPrice * item.quantity;

          return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice,
            lineTotal,
            remainingStock: availableStock - item.quantity,
          };
        });

        const subtotalAmount = pricedItems.reduce((sum, item) => sum + item.lineTotal, 0);
        const totalAmount = subtotalAmount;
        const orderNumber = this.generateOrderNumber();

        const order = await this.orderRepository.createOrder(
          {
            tenantId: input.tenantId,
            retailerId: input.retailerId,
            status: input.status,
            orderNumber,
            notes: input.notes,
            subtotalAmount,
            totalAmount,
            pricingTier: input.pricingTier,
          },
          trx,
        );

        const items = await this.orderRepository.createOrderItems(
          order.id,
          pricedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
          trx,
        );

        await this.orderRepository.reduceStock(
          input.tenantId,
          pricedItems.map((item) => ({
            productId: item.productId,
            nextStockQty: item.remainingStock,
          })),
          trx,
        );

        return this.toOrderSummaryDto(order, items, input.pricingTier, subtotalAmount, totalAmount);
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to place distributor order", 500, "ORDER_PLACEMENT_FAILED", {
        tenantId: input.tenantId,
        retailerId: input.retailerId ?? null,
        cause: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private normalizeItems(
    items: Array<{ productId?: string | number; quantity?: number }>,
  ): NormalizedOrderItem[] {
    const mergedItems = new Map<string, number>();

    for (const item of items) {
      if (item.productId === undefined || item.quantity === undefined) {
        throw new AppError("Order item payload is incomplete", 400, "ORDER_ITEM_INVALID");
      }

      const productId = String(item.productId);
      const currentQty = mergedItems.get(productId) ?? 0;
      mergedItems.set(productId, currentQty + item.quantity);
    }

    return [...mergedItems.entries()].map(([productId, quantity]) => ({
      productId,
      quantity,
    }));
  }

  private assertDistributorExists(
    distributor: DistributorRow | null,
    distributorId: string,
  ): asserts distributor is DistributorRow {
    if (!distributor) {
      throw new AppError("Distributor not found", 404, "ORDER_DISTRIBUTOR_NOT_FOUND", {
        distributorId,
      });
    }

    if (distributor.is_active === false) {
      throw new AppError("Distributor is inactive", 409, "ORDER_DISTRIBUTOR_INACTIVE", {
        distributorId,
      });
    }
  }

  private indexStockByProductId(stockRows: ProductStockRow[]): Map<string, number> {
    const stockByProductId = new Map<string, number>();

    for (const stockRow of stockRows) {
      stockByProductId.set(String(stockRow.tenant_product_id), Number(stockRow.stock_qty));
    }

    return stockByProductId;
  }

  private buildOutOfStockError(input: {
    productId: string;
    availableStock: number;
    requestedQuantity: number;
  }): AppError {
    const detail: OutOfStockErrorDetail = {
      productId: input.productId,
      availableStock: input.availableStock,
      requestedQuantity: input.requestedQuantity,
      shortageQuantity: Math.max(0, input.requestedQuantity - input.availableStock),
    };

    return new AppError(
      "Requested quantity is out of stock",
      409,
      "ORDER_OUT_OF_STOCK",
      detail,
    );
  }

  private resolveUnitPrice(product: TenantProductRow, pricingTier: PricingTier): number {
    const basePrice = Number(product.base_price ?? 0);
    const advancePrice = Number(product.advance_price ?? product.base_price ?? 0);

    return pricingTier === "advance" ? advancePrice : basePrice;
  }

  private extractPricingTier(order: OrderRow): PricingTier {
    const metadata =
      typeof order.metadata === "object" && order.metadata !== null
        ? (order.metadata as Record<string, unknown>)
        : {};

    return metadata.pricing_tier === "advance" ? "advance" : "base";
  }

  private generateOrderNumber(): string {
    const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    const randomSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `ORD-${stamp}-${randomSuffix}`;
  }

  private toOrderDto(order: OrderRow): OrderDto {
    return {
      id: String(order.id),
      tenantId: String(order.tenant_id),
      retailerId:
        order.retailer_id === null || order.retailer_id === undefined ? null : String(order.retailer_id),
      orderNumber: order.order_number ? String(order.order_number) : null,
      status: order.status,
      totalAmount: Number(order.total_amount ?? 0),
      createdAt: String(order.created_at),
      updatedAt: String(order.updated_at),
    };
  }

  private toOrderHistoryItemDto(order: OrderHistoryListRow): OrderHistoryItemDto {
    return {
      id: String(order.id),
      orderNumber: order.order_number ? String(order.order_number) : null,
      status: order.status,
      totalAmount: Number(order.total_amount ?? 0),
      createdAt: String(order.created_at),
    };
  }

  private toOrderItemDto(item: OrderItemRow): OrderItemDto {
    return {
      id: String(item.id),
      orderId: String(item.order_id),
      productId: String(item.product_id),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      lineTotal: Number(item.line_total),
    };
  }

  private toOrderSummaryDto(
    order: OrderRow,
    items: OrderItemRow[],
    pricingTier: PricingTier,
    subtotalAmount: number,
    totalAmount: number,
  ): OrderSummaryResponseDto {
    return {
      orderId: String(order.id),
      orderNumber: order.order_number ? String(order.order_number) : null,
      distributorId: String(order.tenant_id),
      retailerId:
        order.retailer_id === null || order.retailer_id === undefined ? null : String(order.retailer_id),
      status: order.status,
      pricingTier,
      currency: "INR",
      itemCount: items.length,
      subtotalAmount,
      totalAmount,
      createdAt: String(order.created_at),
    };
  }

  private toOrderStatusTransitionDto(
    order: OrderRow,
    previousStatus: OrderStatus,
  ): OrderStatusTransitionResponseDto {
    return {
      orderId: String(order.id),
      previousStatus,
      currentStatus: order.status as OrderStatus,
      updatedAt: String(order.updated_at),
      audit: {
        placedAt: order.placed_at ? String(order.placed_at) : null,
        confirmedAt: order.confirmed_at ? String(order.confirmed_at) : null,
        packedAt: order.packed_at ? String(order.packed_at) : null,
        shippedAt: order.shipped_at ? String(order.shipped_at) : null,
        deliveredAt: order.delivered_at ? String(order.delivered_at) : null,
        cancelledAt: order.cancelled_at ? String(order.cancelled_at) : null,
      },
    };
  }

  private getAllowedNextStatuses(status: OrderStatus): OrderStatus[] {
    switch (status) {
      case ORDER_STATUS.DRAFT:
        return [ORDER_STATUS.PLACED, ORDER_STATUS.CANCELLED];
      case ORDER_STATUS.PLACED:
        return [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED];
      case ORDER_STATUS.CONFIRMED:
        return [ORDER_STATUS.PACKED, ORDER_STATUS.CANCELLED];
      case ORDER_STATUS.PACKED:
        return [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED];
      case ORDER_STATUS.SHIPPED:
        return [ORDER_STATUS.DELIVERED];
      case ORDER_STATUS.DELIVERED:
      case ORDER_STATUS.CANCELLED:
        return [];
      default:
        return [];
    }
  }
}
