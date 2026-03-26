import type { Knex } from "knex";

import { BaseRepository } from "../../shared/base-repository";

type TransactionOrDb = Knex | Knex.Transaction;

export class InventoryRepository extends BaseRepository {
  async lockProductsForUpdate(tenantId: string, productIds: string[], db: TransactionOrDb = this.db) {
    if (productIds.length === 0) {
      return [];
    }

    return db("tenant_products")
      .where("tenant_id", tenantId)
      .whereIn("id", productIds)
      .forUpdate()
      .select("id");
  }

  async getAvailableStock(tenantId: string, productIds: string[], db: TransactionOrDb = this.db) {
    if (productIds.length === 0) {
      return {};
    }

    const rows = await db("tenant_product_stock_snapshots")
      .where("tenant_id", tenantId)
      .whereIn("tenant_product_id", productIds)
      .orderBy("tenant_product_id", "asc")
      .orderBy("captured_at", "desc")
      .select("tenant_product_id", "stock_qty");

    const stockMap: Record<string, number> = {};
    for (const row of rows) {
      const key = String(row.tenant_product_id);
      if (!(key in stockMap)) {
        stockMap[key] = Number(row.stock_qty ?? 0);
      }
    }

    return stockMap;
  }

  async getActiveLockedStock(tenantId: string, productIds: string[], db: TransactionOrDb = this.db) {
    if (productIds.length === 0) {
      return {};
    }

    const rows = await db("order_stock_locks")
      .where("tenant_id", tenantId)
      .whereIn("product_id", productIds)
      .where("status", "active")
      .groupBy("product_id")
      .select("product_id")
      .sum<{ product_id: number | string; locked_quantity: string }[]>("locked_quantity as locked_quantity");

    return rows.reduce<Record<string, number>>((accumulator, row) => {
      accumulator[String(row.product_id)] = Number(row.locked_quantity ?? 0);
      return accumulator;
    }, {});
  }
}
