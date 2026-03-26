import type { Knex } from "knex";

import type { OrderStatus } from "./order-status";

export type PricingTier = "base" | "advance";

export type OrderRow = {
  id: number | string;
  tenant_id: number | string;
  retailer_id: number | string | null;
  order_number?: string | null;
  status: OrderStatus;
  total_amount?: number | string | null;
  metadata?: unknown;
  placed_at?: string | null;
  confirmed_at?: string | null;
  packed_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItemRow = {
  id: number | string;
  order_id: number | string;
  product_id: number | string;
  quantity: number | string;
  unit_price: number | string;
  line_total: number | string;
  created_at?: string;
  updated_at?: string;
};

export type OrderWithItemsRow = {
  order: OrderRow;
  items: OrderItemRow[];
};

export type DistributorRow = {
  id: string;
  name?: string;
  is_active?: boolean;
};

export type TenantProductRow = {
  id: string;
  tenant_id: string;
  product_name: string;
  pack_size: string;
  sku_code: string;
  base_price: number | string;
  advance_price: number | string | null;
  status: string;
};

export type ProductStockRow = {
  tenant_product_id: string;
  stock_qty: number;
  captured_at?: string;
};

export type CreateOrderRepositoryInput = {
  tenantId: string | number;
  retailerId?: string | number;
  status: OrderStatus;
  orderNumber: string;
  notes?: string;
  subtotalAmount: number;
  totalAmount: number;
  pricingTier: PricingTier;
};

export type OrderHistoryListRow = Pick<
  OrderRow,
  "id" | "tenant_id" | "retailer_id" | "order_number" | "status" | "total_amount" | "created_at" | "updated_at"
>;

export type OrderHistoryQueryFilters = {
  tenantId: string | number;
  retailerId?: string | number;
  status?: OrderStatus;
  fromDate?: string;
  toDate?: string;
  page: number;
  pageSize: number;
};

export class OrderRepository {
  constructor(private readonly db: Knex) {}

  async withTransaction<T>(callback: (trx: Knex.Transaction) => Promise<T>): Promise<T> {
    return this.db.transaction(callback);
  }

  async findHistoryPage(filters: OrderHistoryQueryFilters): Promise<{
    rows: OrderHistoryListRow[];
    totalCount: number;
  }> {
    const offset = (filters.page - 1) * filters.pageSize;

    const baseQuery = this.db("orders").where("tenant_id", filters.tenantId);

    if (filters.retailerId !== undefined) {
      baseQuery.andWhere("retailer_id", filters.retailerId);
    }

    if (filters.status !== undefined) {
      baseQuery.andWhere("status", filters.status);
    }

    if (filters.fromDate) {
      baseQuery.andWhere("created_at", ">=", `${filters.fromDate}T00:00:00.000Z`);
    }

    if (filters.toDate) {
      baseQuery.andWhere("created_at", "<", `${filters.toDate}T23:59:59.999Z`);
    }

    const countResult = await baseQuery
      .clone()
      .clearSelect()
      .clearOrder()
      .count<{ total: string }[]>({ total: "*" })
      .first();

    const rows = await baseQuery
      .clone()
      .select(
        "id",
        "tenant_id",
        "retailer_id",
        "order_number",
        "status",
        "total_amount",
        "created_at",
        "updated_at",
      )
      .orderBy("created_at", "desc")
      .limit(filters.pageSize)
      .offset(offset);

    return {
      rows: rows as OrderHistoryListRow[],
      totalCount: Number(countResult?.total ?? 0),
    };
  }

  async findById(orderId: string | number): Promise<OrderRow | null> {
    const order = await this.db("orders").where({ id: orderId }).first();
    return order ?? null;
  }

  async updateStatus(
    orderId: string | number,
    status: OrderStatus,
    trx?: Knex.Transaction,
  ): Promise<OrderRow> {
    const executor = trx ?? this.db;

    await executor("orders")
      .where({ id: orderId })
      .update({
        status,
        updated_at: this.db.fn.now(),
        ...(status === "placed" ? { placed_at: this.db.fn.now() } : {}),
        ...(status === "confirmed" ? { confirmed_at: this.db.fn.now() } : {}),
        ...(status === "packed" ? { packed_at: this.db.fn.now() } : {}),
        ...(status === "shipped" ? { shipped_at: this.db.fn.now() } : {}),
        ...(status === "delivered" ? { delivered_at: this.db.fn.now() } : {}),
        ...(status === "cancelled" ? { cancelled_at: this.db.fn.now() } : {}),
      });

    return executor("orders").where({ id: orderId }).first() as Promise<OrderRow>;
  }

  async findItemsByOrderId(orderId: string | number): Promise<OrderItemRow[]> {
    return this.db("order_line_items").where({ order_id: orderId }).select("*");
  }

  async findRecentOrders(filters: {
    tenantId: string | number;
    retailerId?: string | number;
    limit: number;
  }): Promise<OrderRow[]> {
    const query = this.db("orders")
      .where("tenant_id", filters.tenantId)
      .whereNot("status", "draft")
      .orderBy("created_at", "desc")
      .limit(filters.limit)
      .select("*");

    if (filters.retailerId !== undefined) {
      query.andWhere("retailer_id", filters.retailerId);
    }

    return query;
  }

  async findOrderWithItems(orderId: string | number): Promise<OrderWithItemsRow | null> {
    const order = await this.findById(orderId);
    if (!order) {
      return null;
    }

    const items = await this.findItemsByOrderId(orderId);
    return { order, items };
  }

  async findDistributorById(tenantId: string, trx: Knex.Transaction): Promise<DistributorRow | null> {
    const distributor = await trx("tenants")
      .where({ id: tenantId })
      .first("id", "name", "is_active");

    return distributor ?? null;
  }

  async lockActiveProducts(
    tenantId: string,
    productIds: string[],
    trx: Knex.Transaction,
  ): Promise<TenantProductRow[]> {
    return trx("tenant_products")
      .where("tenant_id", tenantId)
      .whereIn("id", productIds)
      .where("status", "active")
      // Deterministic ordering reduces deadlock risk when many carts overlap.
      .orderBy("id", "asc")
      .forUpdate()
      .select(
        "id",
        "tenant_id",
        "product_name",
        "pack_size",
        "sku_code",
        "base_price",
        "advance_price",
        "status",
      );
  }

  async getLatestStockSnapshots(
    tenantId: string,
    productIds: string[],
    trx: Knex.Transaction,
  ): Promise<ProductStockRow[]> {
    const rows = await trx("tenant_product_stock_snapshots")
      .where("tenant_id", tenantId)
      .whereIn("tenant_product_id", productIds)
      .orderBy("tenant_product_id", "asc")
      .orderBy("captured_at", "desc")
      .select("tenant_product_id", "stock_qty", "captured_at");

    const latestByProduct = new Map<string, ProductStockRow>();

    for (const row of rows) {
      const productId = String(row.tenant_product_id);
      if (!latestByProduct.has(productId)) {
        latestByProduct.set(productId, {
          tenant_product_id: productId,
          stock_qty: Number(row.stock_qty ?? 0),
          captured_at: row.captured_at ? String(row.captured_at) : undefined,
        });
      }
    }

    return [...latestByProduct.values()];
  }

  async createOrder(
    input: CreateOrderRepositoryInput,
    trx: Knex.Transaction,
  ): Promise<OrderRow> {
    const [orderId] = await trx("orders").insert({
      tenant_id: input.tenantId,
      retailer_id: input.retailerId ?? null,
      order_number: input.orderNumber,
      status: input.status,
      total_amount: input.totalAmount,
      metadata: {
        notes: input.notes ?? null,
        subtotal_amount: input.subtotalAmount,
        pricing_tier: input.pricingTier,
      },
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });

    return trx("orders").where({ id: orderId }).first() as Promise<OrderRow>;
  }

  async createOrderItems(
    orderId: string | number,
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>,
    trx: Knex.Transaction,
  ): Promise<OrderItemRow[]> {
    await trx("order_line_items").insert(
      items.map((item) => ({
        order_id: orderId,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        line_total: item.lineTotal,
        created_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      })),
    );

    return trx("order_line_items").where({ order_id: orderId }).select("*") as Promise<OrderItemRow[]>;
  }

  async reduceStock(
    tenantId: string,
    stockAdjustments: Array<{
      productId: string;
      nextStockQty: number;
    }>,
    trx: Knex.Transaction,
  ): Promise<void> {
    if (stockAdjustments.length === 0) {
      return;
    }

    const negativeAdjustment = stockAdjustments.find((adjustment) => adjustment.nextStockQty < 0);
    if (negativeAdjustment) {
      throw new Error(`Negative stock prevented for product ${negativeAdjustment.productId}`);
    }

    await trx("tenant_product_stock_snapshots").insert(
      stockAdjustments.map((adjustment) => ({
        tenant_id: tenantId,
        tenant_product_id: adjustment.productId,
        stock_qty: adjustment.nextStockQty,
        source: "order_placement",
        captured_at: this.db.fn.now(),
        created_at: this.db.fn.now(),
      })),
    );
  }
}
