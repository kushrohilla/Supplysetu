import { describe, expect, it, vi } from "vitest";

import { HTTP_STATUS } from "../apps/backend/src/shared/constants/http-status";
import { InventoryService } from "../apps/backend/src/modules/inventory/module.service";

describe("InventoryService", () => {
  it("lists admin inventory through the tenant-scoped repository", async () => {
    const repository = {
      listAdminInventory: vi.fn().mockResolvedValue([
        {
          product_id: "product-1",
          stock_quantity: 20,
          low_stock_threshold: 5,
        },
      ]),
    };

    const service = new InventoryService({} as never, repository as never);
    const result = await service.listAdminInventory("tenant-1", { search: "milk" });

    expect(repository.listAdminInventory).toHaveBeenCalledWith("tenant-1", { search: "milk" });
    expect(result).toMatchObject([{ product_id: "product-1" }]);
  });

  it("lists low-stock inventory through the tenant-scoped repository", async () => {
    const repository = {
      listAdminLowStockInventory: vi.fn().mockResolvedValue([
        {
          product_id: "product-1",
          stock_quantity: 2,
          low_stock_threshold: 5,
        },
      ]),
    };

    const service = new InventoryService({} as never, repository as never);
    const result = await service.listAdminLowStockInventory("tenant-1", { search: undefined });

    expect(repository.listAdminLowStockInventory).toHaveBeenCalledWith("tenant-1", { search: undefined });
    expect(result).toHaveLength(1);
  });

  it("returns the recent sync metadata instead of duplicating work within one minute", async () => {
    const repository = {
      getLatestSyncLog: vi.fn().mockResolvedValue({
        tenant_id: "tenant-1",
        sync_status: "success",
        triggered_at: "2026-03-30T10:00:30.000Z",
        total_products: 8,
        low_stock_count: 2,
        rate_limited: true,
      }),
      listAdminInventory: vi.fn(),
      refreshAdminInventoryFreshness: vi.fn(),
      createSyncLog: vi.fn(),
    };

    const service = new InventoryService({} as never, repository as never);
    const result = await service.syncAdminInventory({
      tenantId: "tenant-1",
      actorId: "user-1",
      now: new Date("2026-03-30T10:01:00.000Z"),
    });

    expect(repository.getLatestSyncLog).toHaveBeenCalledWith("tenant-1");
    expect(result).toMatchObject({
      tenant_id: "tenant-1",
      rate_limited: true,
    });
    expect(repository.listAdminInventory).not.toHaveBeenCalled();
    expect(repository.refreshAdminInventoryFreshness).not.toHaveBeenCalled();
    expect(repository.createSyncLog).not.toHaveBeenCalled();
  });

  it("refreshes per-product last_synced_at when syncing inventory", async () => {
    let items = [
      {
        product_id: "product-1",
        product_name: "Milk 1L",
        brand_name: "Brand A",
        stock_quantity: 4,
        low_stock_threshold: 5,
        last_synced_at: "2026-03-30T09:30:00.000Z",
      },
      {
        product_id: "product-2",
        product_name: "Oil 1L",
        brand_name: "Brand B",
        stock_quantity: 9,
        low_stock_threshold: 3,
        last_synced_at: null,
      },
    ];
    const syncTime = new Date("2026-03-30T10:00:00.000Z");
    const trx = { tx: true };
    const db = {
      transaction: vi.fn(async (callback: (value: unknown) => Promise<unknown>) => callback(trx)),
    };
    const repository = {
      getLatestSyncLog: vi.fn().mockResolvedValue(null),
      listAdminInventory: vi.fn().mockImplementation(async () => items.map((item) => ({ ...item }))),
      refreshAdminInventoryFreshness: vi.fn().mockImplementation(async (_tenantId: string, syncedAt: Date) => {
        items = items.map((item) => ({
          ...item,
          last_synced_at: syncedAt.toISOString(),
        }));
      }),
      createSyncLog: vi.fn().mockImplementation(async (input: {
        tenantId: string;
        actorId: string | null;
        syncStatus: string;
        totalProducts: number;
        lowStockCount: number;
        triggeredAt: Date;
      }) => ({
        tenant_id: input.tenantId,
        sync_status: input.syncStatus,
        triggered_at: input.triggeredAt.toISOString(),
        total_products: input.totalProducts,
        low_stock_count: input.lowStockCount,
        rate_limited: false,
      })),
    };

    const service = new InventoryService(db as never, repository as never);

    const result = await service.syncAdminInventory({
      tenantId: "tenant-1",
      actorId: "user-1",
      now: syncTime,
    });
    const refreshedItems = await service.listAdminInventory("tenant-1", {});

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(repository.refreshAdminInventoryFreshness).toHaveBeenCalledWith("tenant-1", syncTime, trx);
    expect(repository.createSyncLog).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      actorId: "user-1",
      syncStatus: "success",
      totalProducts: 2,
      lowStockCount: 1,
      triggeredAt: syncTime,
    }, trx);
    expect(refreshedItems).toMatchObject([
      { product_id: "product-1", last_synced_at: "2026-03-30T10:00:00.000Z" },
      { product_id: "product-2", last_synced_at: "2026-03-30T10:00:00.000Z" },
    ]);
    expect(result).toMatchObject({
      tenant_id: "tenant-1",
      rate_limited: false,
    });
  });

  it("updates stock snapshots and thresholds safely inside a transaction", async () => {
    const trx = { tx: true };
    const db = {
      transaction: vi.fn(async (callback: (value: unknown) => Promise<unknown>) => callback(trx)),
    };
    const repository = {
      findAdminInventoryItemByProductId: vi.fn()
        .mockResolvedValueOnce({
          product_id: "product-1",
          stock_quantity: 10,
          low_stock_threshold: 3,
        })
        .mockResolvedValueOnce({
          product_id: "product-1",
          product_name: "Milk 1L",
          brand_name: "Brand A",
          stock_quantity: 25,
          low_stock_threshold: 7,
          last_synced_at: "2026-03-30T10:05:00.000Z",
        }),
      updateLowStockThreshold: vi.fn().mockResolvedValue(undefined),
      createStockSnapshot: vi.fn().mockResolvedValue(undefined),
    };

    const service = new InventoryService(db as never, repository as never);
    const result = await service.updateAdminInventoryItem({
      tenantId: "tenant-1",
      productId: "product-1",
      stockQuantity: 25,
      lowStockThreshold: 7,
      actorId: "user-1",
    });

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(repository.updateLowStockThreshold).toHaveBeenCalledWith("tenant-1", "product-1", 7, trx);
    expect(repository.createStockSnapshot).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      productId: "product-1",
      stockQuantity: 25,
      source: "admin-manual-update",
    }, trx);
    expect(repository.findAdminInventoryItemByProductId).toHaveBeenNthCalledWith(2, "tenant-1", "product-1", trx);
    expect(result).toMatchObject({
      product_id: "product-1",
      low_stock_threshold: 7,
    });
  });

  it("throws when updating an inventory product outside the tenant scope", async () => {
    const repository = {
      findAdminInventoryItemByProductId: vi.fn().mockResolvedValue(null),
    };

    const service = new InventoryService({ transaction: vi.fn() } as never, repository as never);

    await expect(
      service.updateAdminInventoryItem({
        tenantId: "tenant-1",
        productId: "product-2",
        stockQuantity: 5,
        lowStockThreshold: 1,
        actorId: "user-1",
      }),
    ).rejects.toMatchObject({
      code: "INVENTORY_PRODUCT_NOT_FOUND",
      statusCode: HTTP_STATUS.NOT_FOUND,
    });
  });
});
