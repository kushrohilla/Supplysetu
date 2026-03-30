import crypto from "crypto";
import type { Knex } from "knex";

import { BaseRepository } from "../../shared/base-repository";
import { ORDER_STATUS, type OrderStatus, type OrderStatusActorRole } from "./order-status";

type DbExecutor = Knex | Knex.Transaction;

const toIsoStringOrNull = (value: unknown) => {
  if (!value) {
    return null;
  }

  return new Date(String(value)).toISOString();
};

type OrderRow = {
  id: string;
  tenant_id: string;
  retailer_id: string;
  retailer_name?: string | null;
  order_number: string;
  status: OrderStatus;
  total_amount: number | string | null;
  created_at: string | Date;
  updated_at: string | Date;
  packed_at?: string | Date | null;
  dispatched_at?: string | Date | null;
  delivered_at?: string | Date | null;
  closed_at?: string | Date | null;
  items_count?: number | string;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  brand_name?: string | null;
  quantity: number | string;
  price: number | string;
  total_price: number | string;
};

type OrderHistoryRow = {
  id: string;
  order_id: string;
  from_status: OrderStatus;
  to_status: OrderStatus;
  actor_role: OrderStatusActorRole;
  actor_id?: string | null;
  created_at: string | Date;
};

export type OrderRecord = {
  id: string;
  tenant_id: string;
  retailer_id: string;
  retailer_name: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  updated_at: string;
  packed_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  closed_at: string | null;
  items_count?: number;
};

export type OrderItemRecord = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  brand_name: string | null;
  quantity: number;
  price: number;
  total_price: number;
};

export type OrderHistoryRecord = {
  id: string;
  order_id: string;
  from_status: OrderStatus;
  to_status: OrderStatus;
  actor_role: OrderStatusActorRole;
  actor_id: string | null;
  created_at: string;
};

export type CreateOrderInput = {
  retailer_id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
};

export type CreateOrderItemInput = {
  product_id: string;
  quantity: number;
  price: number;
  total_price: number;
};

export type CreateOrderHistoryInput = {
  order_id: string;
  from_status: OrderStatus;
  to_status: OrderStatus;
  actor_role: OrderStatusActorRole;
  actor_id: string | null;
};

export class OrderRepository extends BaseRepository {
  async findRetailerById(tenantId: string, retailerId: string, db: DbExecutor = this.db) {
    const retailer = await db("retailer_distributor_links")
      .join("retailers", "retailer_distributor_links.retailer_id", "retailers.id")
      .where("retailer_distributor_links.tenant_id", tenantId)
      .andWhere("retailer_distributor_links.retailer_id", retailerId)
      .andWhere("retailers.is_active", true)
      .first(
        "retailers.id",
        "retailer_distributor_links.tenant_id as tenant_id",
        "retailers.name",
        "retailers.phone as mobile_number",
      );

    return retailer ?? null;
  }

  async getProductsForTenant(tenantId: string, productIds: string[], db: DbExecutor = this.db) {
    if (productIds.length === 0) {
      return [];
    }

    return db("tenant_products")
      .leftJoin("global_brands", "tenant_products.brand_id", "global_brands.id")
      .where("tenant_products.tenant_id", tenantId)
      .where("tenant_products.status", "active")
      .whereIn("tenant_products.id", productIds)
      .select(
        "tenant_products.id",
        "tenant_products.product_name",
        "tenant_products.base_price",
        "global_brands.name as brand_name",
      );
  }

  async getNextOrderSequence(tenantId: string, db: DbExecutor = this.db) {
    await db.raw("SELECT pg_advisory_xact_lock(?, ?)", [2026, 328]);

    const row = await db("orders")
      .where("tenant_id", tenantId)
      .count<{ count: string }>({ count: "*" })
      .first();
    return Number(row?.count ?? 0) + 1;
  }

  async createOrderWithItems(
    tenantId: string,
    order: CreateOrderInput,
    items: CreateOrderItemInput[],
    db: DbExecutor,
  ) {
    const id = crypto.randomUUID();

    await db("orders").insert({
      id,
      tenant_id: tenantId,
      retailer_id: order.retailer_id,
      order_number: order.order_number,
      status: order.status,
      total_amount: order.total_amount,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });

    await db("order_items").insert(
      items.map((item) => ({
        id: crypto.randomUUID(),
        order_id: id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        total_price: item.total_price,
      })),
    );

    return this.getOrderById(tenantId, id, db);
  }

  async listOrders(tenantId: string, db: DbExecutor = this.db): Promise<OrderRecord[]> {
    const rows = await this.baseOrderListQuery(db)
      .where("orders.tenant_id", tenantId)
      .orderBy("orders.created_at", "desc");

    return rows.map((row) => this.mapOrder(row as OrderRow));
  }

  async listRetailerOrders(tenantId: string, retailerId: string, db: DbExecutor = this.db): Promise<OrderRecord[]> {
    const rows = await this.baseOrderListQuery(db)
      .where("orders.tenant_id", tenantId)
      .andWhere("orders.retailer_id", retailerId)
      .orderBy("orders.created_at", "desc");

    return rows.map((row) => this.mapOrder(row as OrderRow));
  }

  async getOrderById(tenantId: string, orderId: string, db: DbExecutor = this.db) {
    const orderRow = await this.baseOrderDetailQuery(orderId, db)
      .andWhere("orders.tenant_id", tenantId)
      .first();

    if (!orderRow) {
      return null;
    }

    const itemRows = await this.getOrderItems(orderId, db);

    return {
      ...this.mapOrder(orderRow as OrderRow),
      items: itemRows.map((row) => this.mapOrderItem(row)),
    };
  }

  async getRetailerOrderById(tenantId: string, retailerId: string, orderId: string, db: DbExecutor = this.db) {
    const orderRow = await this.baseOrderDetailQuery(orderId, db)
      .andWhere("orders.tenant_id", tenantId)
      .andWhere("orders.retailer_id", retailerId)
      .first();

    if (!orderRow) {
      return null;
    }

    const itemRows = await this.getOrderItems(orderId, db);

    return {
      ...this.mapOrder(orderRow as OrderRow),
      items: itemRows.map((row) => this.mapOrderItem(row)),
    };
  }

  async updateStatus(tenantId: string, orderId: string, status: OrderStatus, db: DbExecutor = this.db) {
    const lifecyclePatch = this.getLifecycleTimestampPatch(status);
    const updatedCount = await db("orders")
      .where({
        id: orderId,
        tenant_id: tenantId,
      })
      .update({
        status,
        updated_at: this.db.fn.now(),
        ...lifecyclePatch,
      });

    if (!updatedCount) {
      return null;
    }

    return this.getOrderById(tenantId, orderId, db);
  }

  async createHistoryEntry(input: CreateOrderHistoryInput, db: DbExecutor = this.db) {
    await db("order_history").insert({
      id: crypto.randomUUID(),
      order_id: input.order_id,
      from_status: input.from_status,
      to_status: input.to_status,
      actor_role: input.actor_role,
      actor_id: input.actor_id,
      created_at: this.db.fn.now(),
    });
  }

  async listHistory(tenantId: string, orderId: string, db: DbExecutor = this.db): Promise<OrderHistoryRecord[]> {
    const rows = await db("order_history")
      .join("orders", "order_history.order_id", "orders.id")
      .where("orders.tenant_id", tenantId)
      .andWhere("order_history.order_id", orderId)
      .orderBy("order_history.created_at", "asc")
      .select(
        "order_history.id",
        "order_history.order_id",
        "order_history.from_status",
        "order_history.to_status",
        "order_history.actor_role",
        "order_history.actor_id",
        "order_history.created_at",
      );

    return rows.map((row) => this.mapOrderHistory(row));
  }

  private getLifecycleTimestampPatch(status: OrderStatus) {
    switch (status) {
      case ORDER_STATUS.PACKED:
        return { packed_at: this.db.fn.now() };
      case ORDER_STATUS.DISPATCHED:
        return { dispatched_at: this.db.fn.now() };
      case ORDER_STATUS.DELIVERED:
        return { delivered_at: this.db.fn.now() };
      case ORDER_STATUS.CLOSED:
        return { closed_at: this.db.fn.now() };
      default:
        return {};
    }
  }

  private mapOrder(row: OrderRow): OrderRecord {
    return {
      id: String(row.id),
      tenant_id: String(row.tenant_id),
      retailer_id: String(row.retailer_id),
      retailer_name: row.retailer_name ?? "Unknown retailer",
      order_number: row.order_number,
      status: row.status,
      total_amount: Number(row.total_amount ?? 0),
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
      packed_at: toIsoStringOrNull(row.packed_at),
      dispatched_at: toIsoStringOrNull(row.dispatched_at),
      delivered_at: toIsoStringOrNull(row.delivered_at),
      closed_at: toIsoStringOrNull(row.closed_at),
      items_count: row.items_count === undefined ? undefined : Number(row.items_count ?? 0),
    };
  }

  private mapOrderItem(row: OrderItemRow): OrderItemRecord {
    return {
      id: String(row.id),
      order_id: String(row.order_id),
      product_id: String(row.product_id),
      product_name: row.product_name,
      brand_name: row.brand_name ?? null,
      quantity: Number(row.quantity ?? 0),
      price: Number(row.price ?? 0),
      total_price: Number(row.total_price ?? 0),
    };
  }

  private mapOrderHistory(row: OrderHistoryRow): OrderHistoryRecord {
    return {
      id: String(row.id),
      order_id: String(row.order_id),
      from_status: row.from_status,
      to_status: row.to_status,
      actor_role: row.actor_role,
      actor_id: row.actor_id ? String(row.actor_id) : null,
      created_at: new Date(row.created_at).toISOString(),
    };
  }

  private baseOrderListQuery(db: DbExecutor) {
    return db("orders")
      .leftJoin("retailers", "orders.retailer_id", "retailers.id")
      .leftJoin("order_items", "orders.id", "order_items.order_id")
      .groupBy(
        "orders.id",
        "orders.tenant_id",
        "orders.retailer_id",
        "retailers.name",
        "orders.order_number",
        "orders.status",
        "orders.total_amount",
        "orders.created_at",
        "orders.updated_at",
        "orders.packed_at",
        "orders.dispatched_at",
        "orders.delivered_at",
        "orders.closed_at",
      )
      .select(
        "orders.id",
        "orders.tenant_id",
        "orders.retailer_id",
        "retailers.name as retailer_name",
        "orders.order_number",
        "orders.status",
        "orders.total_amount",
        "orders.created_at",
        "orders.updated_at",
        "orders.packed_at",
        "orders.dispatched_at",
        "orders.delivered_at",
        "orders.closed_at",
      )
      .count({ items_count: "order_items.id" });
  }

  private baseOrderDetailQuery(orderId: string, db: DbExecutor) {
    return db("orders")
      .leftJoin("retailers", "orders.retailer_id", "retailers.id")
      .leftJoin("order_items", "orders.id", "order_items.order_id")
      .where("orders.id", orderId)
      .groupBy(
        "orders.id",
        "orders.tenant_id",
        "orders.retailer_id",
        "retailers.name",
        "orders.order_number",
        "orders.status",
        "orders.total_amount",
        "orders.created_at",
        "orders.updated_at",
        "orders.packed_at",
        "orders.dispatched_at",
        "orders.delivered_at",
        "orders.closed_at",
      )
      .select(
        "orders.id",
        "orders.tenant_id",
        "orders.retailer_id",
        "retailers.name as retailer_name",
        "orders.order_number",
        "orders.status",
        "orders.total_amount",
        "orders.created_at",
        "orders.updated_at",
        "orders.packed_at",
        "orders.dispatched_at",
        "orders.delivered_at",
        "orders.closed_at",
      )
      .count({ items_count: "order_items.id" });
  }

  private getOrderItems(orderId: string, db: DbExecutor) {
    return db("order_items")
      .join("tenant_products", "order_items.product_id", "tenant_products.id")
      .leftJoin("global_brands", "tenant_products.brand_id", "global_brands.id")
      .where("order_items.order_id", orderId)
      .select(
        "order_items.id",
        "order_items.order_id",
        "order_items.product_id",
        "tenant_products.product_name",
        "global_brands.name as brand_name",
        "order_items.quantity",
        "order_items.price",
        "order_items.total_price",
      );
  }
}
