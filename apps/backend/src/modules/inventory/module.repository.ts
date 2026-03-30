import crypto from "crypto";
import type { Knex } from "knex";

import { BaseRepository } from "../../shared/base-repository";

type TransactionOrDb = Knex | Knex.Transaction;

type InventoryProductRow = {
  product_id: string;
  product_name: string;
  brand_name?: string | null;
  low_stock_threshold?: number | string | null;
};

type StockSnapshotRow = {
  id: string;
  tenant_product_id: string;
  stock_qty: number | string | null;
  captured_at: string | Date;
};

type InventorySyncLogRow = {
  id: string;
  tenant_id: string;
  sync_status: string;
  total_products: number | string;
  low_stock_count: number | string;
  last_synced_at: string | Date;
  created_at: string | Date;
};

export type InventoryAdminFilters = {
  search?: string;
};

export type InventoryAdminItem = {
  product_id: string;
  product_name: string;
  brand_name: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  last_synced_at: string | null;
};

export type InventorySyncMetadata = {
  tenant_id: string;
  sync_status: string;
  triggered_at: string;
  total_products: number;
  low_stock_count: number;
  rate_limited: boolean;
};

export class InventoryRepository extends BaseRepository {
  async lockProductsForUpdate(tenantId: string, productIds: string[], db: TransactionOrDb = this.db) {
    if (productIds.length === 0) {
      return [];
    }

    return db("tenant_products").where("tenant_id", tenantId).whereIn("id", productIds).forUpdate().select("id");
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
      .select<StockSnapshotRow[]>("tenant_product_id", "stock_qty", "captured_at");

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

  async listAdminInventory(tenantId: string, filters: InventoryAdminFilters, db: TransactionOrDb = this.db): Promise<InventoryAdminItem[]> {
    const products = await this.listInventoryProducts(tenantId, filters, db);
    return this.buildInventoryItems(tenantId, products, db);
  }

  async listAdminLowStockInventory(tenantId: string, filters: InventoryAdminFilters, db: TransactionOrDb = this.db): Promise<InventoryAdminItem[]> {
    const items = await this.listAdminInventory(tenantId, filters, db);
    return items.filter((item) => item.stock_quantity < item.low_stock_threshold);
  }

  async findAdminInventoryItemByProductId(
    tenantId: string,
    productId: string,
    db: TransactionOrDb = this.db,
  ): Promise<InventoryAdminItem | null> {
    const products = await this.listInventoryProducts(tenantId, {}, db, productId);
    if (products.length === 0) {
      return null;
    }

    const items = await this.buildInventoryItems(tenantId, products, db);
    return items[0] ?? null;
  }

  async updateLowStockThreshold(
    tenantId: string,
    productId: string,
    lowStockThreshold: number,
    db: TransactionOrDb = this.db,
  ) {
    await db("tenant_products")
      .where({
        tenant_id: tenantId,
        id: productId,
      })
      .update({
        low_stock_threshold: lowStockThreshold,
        updated_at: db.fn.now(),
      });
  }

  async createStockSnapshot(
    input: {
      tenantId: string;
      productId: string;
      stockQuantity: number;
      source: string;
    },
    db: TransactionOrDb = this.db,
  ) {
    await db("tenant_product_stock_snapshots").insert({
      id: crypto.randomUUID(),
      tenant_id: input.tenantId,
      tenant_product_id: input.productId,
      stock_qty: input.stockQuantity,
      source: input.source,
      captured_at: db.fn.now(),
      created_at: db.fn.now(),
    });
  }

  async getLatestSyncLog(tenantId: string, db: TransactionOrDb = this.db): Promise<InventorySyncMetadata | null> {
    const row = await db("inventory_sync_logs")
      .where("tenant_id", tenantId)
      .orderBy("last_synced_at", "desc")
      .first<InventorySyncLogRow>("id", "tenant_id", "sync_status", "total_products", "low_stock_count", "last_synced_at", "created_at");

    return row ? this.mapSyncLog(row, false) : null;
  }

  async createSyncLog(
    input: {
      tenantId: string;
      actorId: string | null;
      syncStatus: string;
      totalProducts: number;
      lowStockCount: number;
      triggeredAt: Date;
    },
    db: TransactionOrDb = this.db,
  ): Promise<InventorySyncMetadata> {
    const id = crypto.randomUUID();

    await db("inventory_sync_logs").insert({
      id,
      tenant_id: input.tenantId,
      triggered_by_user_id: input.actorId,
      sync_status: input.syncStatus,
      total_products: input.totalProducts,
      low_stock_count: input.lowStockCount,
      last_synced_at: input.triggeredAt,
      created_at: db.fn.now(),
    });

    return {
      tenant_id: input.tenantId,
      sync_status: input.syncStatus,
      triggered_at: input.triggeredAt.toISOString(),
      total_products: input.totalProducts,
      low_stock_count: input.lowStockCount,
      rate_limited: false,
    };
  }

  async refreshAdminInventoryFreshness(
    tenantId: string,
    syncedAt: Date,
    db: TransactionOrDb = this.db,
  ) {
    const products = await this.listInventoryProducts(tenantId, {}, db);
    const productIds = products.map((product) => product.product_id);
    const latestSnapshotMap = await this.getLatestSnapshotMap(tenantId, productIds, db);

    const snapshotIdsToRefresh = productIds
      .map((productId) => latestSnapshotMap[productId]?.id)
      .filter((snapshotId): snapshotId is string => Boolean(snapshotId));

    if (snapshotIdsToRefresh.length > 0) {
      await db("tenant_product_stock_snapshots")
        .where("tenant_id", tenantId)
        .whereIn("id", snapshotIdsToRefresh)
        .update({
          captured_at: syncedAt,
        });
    }

    const missingProducts = products.filter((product) => !latestSnapshotMap[product.product_id]);
    if (missingProducts.length > 0) {
      await db("tenant_product_stock_snapshots").insert(
        missingProducts.map((product) => ({
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          tenant_product_id: product.product_id,
          stock_qty: 0,
          source: "admin-manual-sync",
          captured_at: syncedAt,
          created_at: db.fn.now(),
        })),
      );
    }
  }

  private async listInventoryProducts(
    tenantId: string,
    filters: InventoryAdminFilters,
    db: TransactionOrDb = this.db,
    productId?: string,
  ): Promise<InventoryProductRow[]> {
    const query = db("tenant_products")
      .leftJoin("global_brands", "tenant_products.brand_id", "global_brands.id")
      .where("tenant_products.tenant_id", tenantId)
      .select<InventoryProductRow[]>(
        "tenant_products.id as product_id",
        "tenant_products.product_name",
        "global_brands.name as brand_name",
        "tenant_products.low_stock_threshold",
      )
      .orderBy("tenant_products.product_name", "asc");

    if (productId) {
      query.andWhere("tenant_products.id", productId);
    }

    const trimmedSearch = filters.search?.trim();
    if (trimmedSearch) {
      const term = `%${trimmedSearch}%`;
      query.andWhere((builder) => {
        builder
          .where("tenant_products.product_name", "ilike", term)
          .orWhere("tenant_products.sku_code", "ilike", term)
          .orWhere("global_brands.name", "ilike", term);
      });
    }

    return query;
  }

  private async buildInventoryItems(
    tenantId: string,
    products: InventoryProductRow[],
    db: TransactionOrDb = this.db,
  ): Promise<InventoryAdminItem[]> {
    const productIds = products.map((product) => product.product_id);
    const latestSnapshotMap = await this.getLatestSnapshotMap(tenantId, productIds, db);

    return products.map((product) => {
      const snapshot = latestSnapshotMap[product.product_id];
      return {
        product_id: product.product_id,
        product_name: product.product_name,
        brand_name: product.brand_name ?? null,
        stock_quantity: snapshot ? Number(snapshot.stock_qty ?? 0) : 0,
        low_stock_threshold: Number(product.low_stock_threshold ?? 0),
        last_synced_at: snapshot ? new Date(snapshot.captured_at).toISOString() : null,
      };
    });
  }

  private async getLatestSnapshotMap(
    tenantId: string,
    productIds: string[],
    db: TransactionOrDb = this.db,
  ): Promise<Record<string, StockSnapshotRow>> {
    if (productIds.length === 0) {
      return {};
    }

    const rows = await db("tenant_product_stock_snapshots")
      .where("tenant_id", tenantId)
      .whereIn("tenant_product_id", productIds)
      .orderBy("tenant_product_id", "asc")
      .orderBy("captured_at", "desc")
      .select<StockSnapshotRow[]>("id", "tenant_product_id", "stock_qty", "captured_at");

    return rows.reduce<Record<string, StockSnapshotRow>>((accumulator, row) => {
      const key = String(row.tenant_product_id);
      if (!(key in accumulator)) {
        accumulator[key] = row;
      }

      return accumulator;
    }, {});
  }

  private mapSyncLog(row: InventorySyncLogRow, rateLimited: boolean): InventorySyncMetadata {
    return {
      tenant_id: String(row.tenant_id),
      sync_status: row.sync_status,
      triggered_at: new Date(row.last_synced_at).toISOString(),
      total_products: Number(row.total_products ?? 0),
      low_stock_count: Number(row.low_stock_count ?? 0),
      rate_limited: rateLimited,
    };
  }
}
