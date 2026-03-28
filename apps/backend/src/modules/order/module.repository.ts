import crypto from "crypto";
import type { Knex } from "knex";

import { BaseRepository } from "../../shared/base-repository";
import type { OrderStatus } from "./order-status";

type DbExecutor = Knex | Knex.Transaction;

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

  async getNextOrderSequence(_tenantId: string, db: DbExecutor = this.db) {
    await db.raw("SELECT pg_advisory_xact_lock(?, ?)", [2026, 328]);

    const row = await db("orders").count<{ count: string }>({ count: "*" }).first();
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

    return rows.map((row) => this.mapOrder(row));
  }

  async listRetailerOrders(tenantId: string, retailerId: string, db: DbExecutor = this.db): Promise<OrderRecord[]> {
    const rows = await this.baseOrderListQuery(db)
      .where("orders.tenant_id", tenantId)
      .andWhere("orders.retailer_id", retailerId)
      .orderBy("orders.created_at", "desc");

    return rows.map((row) => this.mapOrder(row));
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
      ...this.mapOrder(orderRow),
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
      ...this.mapOrder(orderRow),
      items: itemRows.map((row) => this.mapOrderItem(row)),
    };
  }

  async updateStatus(tenantId: string, orderId: string, status: OrderStatus, db: DbExecutor = this.db) {
    const updatedCount = await db("orders")
      .where({
        id: orderId,
        tenant_id: tenantId,
      })
      .update({
        status,
        updated_at: this.db.fn.now(),
      });

    if (!updatedCount) {
      return null;
    }

    return this.getOrderById(tenantId, orderId, db);
  }

  private mapOrder(row: any): OrderRecord {
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
      items_count: row.items_count === undefined ? undefined : Number(row.items_count ?? 0),
    };
  }

  private mapOrderItem(row: any): OrderItemRecord {
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
        this.db.raw("COUNT(order_items.id) as items_count"),
      );
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
        this.db.raw("COUNT(order_items.id) as items_count"),
      );
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
