import type { Knex } from "knex";

import { BaseRepository } from "../../shared/base-repository";
import type { OrderStatus } from "./order-status";

type TransactionOrDb = Knex | Knex.Transaction;

type OrderHeaderInsert = {
  tenant_id: string;
  retailer_id: string;
  order_number: string;
  total_amount: number;
  status: OrderStatus;
  idempotency_key: string;
  metadata: Record<string, unknown>;
};

type OrderLineInsert = {
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  product_name?: string;
  pack_size?: string;
};

type OrderPaymentInsert = {
  order_id: string;
  payment_type: string;
  amount: number;
  payment_status: string;
};

export class OrderRepository extends BaseRepository {
  async findExistingByIdempotencyKey(idempotencyKey: string, db: TransactionOrDb = this.db) {
    return db("orders").where({ idempotency_key: idempotencyKey }).first();
  }

  async getProductsForOrder(tenantId: string, productIds: string[], db: TransactionOrDb = this.db) {
    return db("tenant_products")
      .where("tenant_id", tenantId)
      .whereIn("id", productIds)
      .select(
        "id",
        "product_name",
        "pack_size",
        "base_price",
        "advance_price",
        "brand_id",
      );
  }

  async createOrderHeader(payload: OrderHeaderInsert, db: TransactionOrDb) {
    const [orderId] = await db("orders").insert({
      ...payload,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });

    return String(orderId);
  }

  async createOrderLines(orderId: string, lineItems: OrderLineInsert[], db: TransactionOrDb) {
    const lineIds = await db("order_line_items").insert(
      lineItems.map((lineItem) => ({
        order_id: orderId,
        product_id: lineItem.product_id,
        quantity: lineItem.quantity,
        unit_price: lineItem.unit_price,
        line_total: lineItem.line_total,
        scheme_discount: 0,
        created_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      })),
    );

    return lineIds.map((value) => String(value));
  }

  async createPayment(payload: OrderPaymentInsert, tenantId: string, db: TransactionOrDb) {
    await db("order_payments").insert({
      order_id: payload.order_id,
      tenant_id: tenantId,
      payment_type: payload.payment_type,
      amount: payload.amount,
      payment_status: payload.payment_status,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });
  }

  async createStockLocks(
    orderId: string,
    tenantId: string,
    lineIds: string[],
    lineItems: Array<{ product_id: string; quantity: number }>,
    db: TransactionOrDb,
  ) {
    await db("order_stock_locks").insert(
      lineItems.map((lineItem, index) => ({
        order_id: orderId,
        order_line_item_id: lineIds[index] ?? null,
        tenant_id: tenantId,
        product_id: lineItem.product_id,
        locked_quantity: lineItem.quantity,
        status: "active",
        locked_at: this.db.fn.now(),
        metadata: JSON.stringify({ source: "order_placement" }),
        created_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      })),
    );
  }

  async releaseStockLocks(orderId: string, db: TransactionOrDb) {
    await db("order_stock_locks")
      .where({ order_id: orderId, status: "active" })
      .update({
        status: "released",
        released_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      });
  }

  async markRetailerLinkOrder(tenantId: string, retailerId: string, orderTotal: number, db: TransactionOrDb) {
    const existingLink = await db("retailer_distributor_links")
      .where({ tenant_id: tenantId, retailer_id: retailerId })
      .first("id", "total_orders", "total_order_value");

    if (!existingLink) {
      return;
    }

    await db("retailer_distributor_links")
      .where({ id: existingLink.id })
      .update({
        total_orders: Number(existingLink.total_orders ?? 0) + 1,
        total_order_value: Number(existingLink.total_order_value ?? 0) + orderTotal,
        last_ordered_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      });
  }

  async getRetailerOrders(retailerId: string, tenantId: string, limit: number) {
    return this.db("orders")
      .where({ retailer_id: retailerId, tenant_id: tenantId })
      .orderBy("created_at", "desc")
      .limit(limit)
      .select("id", "status", "total_amount", "created_at", "order_number");
  }

  async getOrderById(orderId: string, retailerId?: string) {
    const orderQuery = this.db("orders").where({ id: orderId });
    if (retailerId) {
      orderQuery.andWhere({ retailer_id: retailerId });
    }

    const order = await orderQuery.first();
    if (!order) {
      return null;
    }

    const items = await this.db("order_line_items")
      .join("tenant_products", "order_line_items.product_id", "tenant_products.id")
      .leftJoin("global_brands", "tenant_products.brand_id", "global_brands.id")
      .where("order_line_items.order_id", orderId)
      .select(
        "order_line_items.id as line_item_id",
        "order_line_items.quantity",
        "order_line_items.unit_price",
        "order_line_items.line_total",
        "tenant_products.id",
        "tenant_products.product_name as name",
        "tenant_products.pack_size",
        "tenant_products.base_price",
        "tenant_products.advance_price",
        "tenant_products.brand_id",
        "global_brands.name as brand_name",
      );

    const payment = await this.db("order_payments").where({ order_id: orderId }).first();
    const stockLocks = await this.db("order_stock_locks")
      .where({ order_id: orderId })
      .select("product_id", "locked_quantity", "status");

    return {
      order: this.mapOrder(order),
      items: items.map((item) => this.mapOrderItem(item)),
      payment,
      stockLocks,
    };
  }

  async updateStatus(orderId: string, status: OrderStatus, db: TransactionOrDb = this.db) {
    await db("orders")
      .where({ id: orderId })
      .update({
        status,
        updated_at: this.db.fn.now(),
        ...(status === "confirmed" ? { invoice_confirmed_at: this.db.fn.now() } : {}),
        ...(status === "dispatched" ? { dispatched_at: this.db.fn.now() } : {}),
        ...(status === "delivered" ? { delivered_at: this.db.fn.now() } : {}),
        ...(status === "closed" || status === "cancelled" ? { closed_at: this.db.fn.now() } : {}),
      });
  }

  private mapOrder(row: any) {
    return {
      id: String(row.id),
      retailer_id: String(row.retailer_id),
      tenant_id: String(row.tenant_id),
      order_number: row.order_number,
      status: row.status,
      total_amount: Number(row.total_amount ?? 0),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapOrderItem(row: any) {
    return {
      line_item_id: String(row.line_item_id),
      quantity: Number(row.quantity),
      unit_price: Number(row.unit_price),
      line_total: Number(row.line_total),
      product: {
        id: String(row.id),
        brand_id: row.brand_id ? String(row.brand_id) : null,
        brand_name: row.brand_name ?? "Unknown",
        name: row.name,
        pack_size: row.pack_size,
        base_price: Number(row.base_price),
        advance_price: Number(row.advance_price ?? row.base_price),
      },
    };
  }
}
