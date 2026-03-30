import type { Knex } from "knex";

import { HTTP_STATUS } from "../../shared/constants/http-status";
import { AppError } from "../../shared/errors/app-error";
import type { InventoryAdminFilters, InventoryRepository } from "./module.repository";

export type SyncAdminInventoryInput = {
  tenantId: string;
  actorId: string | null;
  now?: Date;
};

export type UpdateAdminInventoryItemInput = {
  tenantId: string;
  productId: string;
  stockQuantity: number;
  lowStockThreshold: number;
  actorId: string | null;
};

const ONE_MINUTE_MS = 60_000;

export class InventoryService {
  constructor(
    private readonly db: Knex,
    private readonly inventoryRepository: InventoryRepository,
  ) {}

  async getAvailableStock(tenantId: string, productIds: string[]) {
    return this.inventoryRepository.getAvailableStock(tenantId, productIds);
  }

  async listAdminInventory(tenantId: string, filters: InventoryAdminFilters) {
    return this.inventoryRepository.listAdminInventory(tenantId, filters);
  }

  async listAdminLowStockInventory(tenantId: string, filters: InventoryAdminFilters) {
    return this.inventoryRepository.listAdminLowStockInventory(tenantId, filters);
  }

  async syncAdminInventory(input: SyncAdminInventoryInput) {
    const now = input.now ?? new Date();
    const latestSync = await this.inventoryRepository.getLatestSyncLog(input.tenantId);

    if (latestSync) {
      const elapsedMs = now.getTime() - new Date(latestSync.triggered_at).getTime();
      if (elapsedMs < ONE_MINUTE_MS) {
        return {
          ...latestSync,
          rate_limited: true,
        };
      }
    }

    return this.db.transaction(async (trx) => {
      const items = await this.inventoryRepository.listAdminInventory(input.tenantId, {}, trx);
      const lowStockCount = items.filter((item) => item.stock_quantity < item.low_stock_threshold).length;

      await this.inventoryRepository.refreshAdminInventoryFreshness(input.tenantId, now, trx);

      return this.inventoryRepository.createSyncLog({
        tenantId: input.tenantId,
        actorId: input.actorId,
        syncStatus: "success",
        totalProducts: items.length,
        lowStockCount,
        triggeredAt: now,
      }, trx);
    });
  }

  async updateAdminInventoryItem(input: UpdateAdminInventoryItemInput) {
    if (input.stockQuantity < 0 || input.lowStockThreshold < 0) {
      throw new AppError(HTTP_STATUS.BAD_REQUEST, "INVALID_INVENTORY_INPUT", "Inventory values must be non-negative");
    }

    const existing = await this.inventoryRepository.findAdminInventoryItemByProductId(input.tenantId, input.productId);
    if (!existing) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, "INVENTORY_PRODUCT_NOT_FOUND", "Inventory product not found");
    }

    return this.db.transaction(async (trx) => {
      await this.inventoryRepository.updateLowStockThreshold(
        input.tenantId,
        input.productId,
        input.lowStockThreshold,
        trx,
      );

      if (existing.stock_quantity !== input.stockQuantity) {
        await this.inventoryRepository.createStockSnapshot(
          {
            tenantId: input.tenantId,
            productId: input.productId,
            stockQuantity: input.stockQuantity,
            source: "admin-manual-update",
          },
          trx,
        );
      }

      const updated = await this.inventoryRepository.findAdminInventoryItemByProductId(input.tenantId, input.productId, trx);
      if (!updated) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, "INVENTORY_PRODUCT_NOT_FOUND", "Inventory product not found");
      }

      return updated;
    });
  }
}
