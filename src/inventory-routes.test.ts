import fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AppContainer } from "../apps/backend/src/core/config/container";
import { registerInventoryRoutes } from "../apps/backend/src/modules/inventory/module.routes";
import { HTTP_STATUS } from "../apps/backend/src/shared/constants/http-status";
import { AppError } from "../apps/backend/src/shared/errors/app-error";
import { errorHandler } from "../apps/backend/src/shared/middleware/error-handler";

const createContainer = () =>
  ({
    authService: {
      verifyAccessToken: vi.fn(),
    },
    inventoryService: {
      getAvailableStock: vi.fn(),
      listAdminInventory: vi.fn(),
      listAdminLowStockInventory: vi.fn(),
      syncAdminInventory: vi.fn(),
      updateAdminInventoryItem: vi.fn(),
    },
  }) as unknown as AppContainer;

describe("inventory routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists tenant inventory for admin users", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const inventoryService = container.inventoryService as unknown as { listAdminInventory: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
    });
    inventoryService.listAdminInventory.mockResolvedValue([
      {
        product_id: "product-1",
        product_name: "Milk 1L",
        brand_name: "Brand A",
        stock_quantity: 24,
        low_stock_threshold: 8,
        last_synced_at: "2026-03-30T10:00:00.000Z",
      },
    ]);

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerInventoryRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: "/admin/inventory?search=milk",
      headers: { authorization: "Bearer admin-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(inventoryService.listAdminInventory).toHaveBeenCalledWith("tenant-1", {
      search: "milk",
    });
    expect(response.json()).toMatchObject({
      success: true,
      data: [
        {
          product_id: "product-1",
          stock_quantity: 24,
        },
      ],
    });
  });

  it("lists low-stock inventory for admin users", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const inventoryService = container.inventoryService as unknown as { listAdminLowStockInventory: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
    });
    inventoryService.listAdminLowStockInventory.mockResolvedValue([
      {
        product_id: "product-1",
        product_name: "Milk 1L",
        brand_name: "Brand A",
        stock_quantity: 4,
        low_stock_threshold: 8,
        last_synced_at: "2026-03-30T10:00:00.000Z",
      },
    ]);

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerInventoryRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: "/admin/inventory/low-stock",
      headers: { authorization: "Bearer admin-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(inventoryService.listAdminLowStockInventory).toHaveBeenCalledWith("tenant-1", {
      search: undefined,
    });
  });

  it("triggers a manual tenant inventory sync for admins", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const inventoryService = container.inventoryService as unknown as { syncAdminInventory: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
    });
    inventoryService.syncAdminInventory.mockResolvedValue({
      tenant_id: "tenant-1",
      sync_status: "success",
      triggered_at: "2026-03-30T10:00:00.000Z",
      total_products: 3,
      low_stock_count: 1,
      rate_limited: false,
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerInventoryRoutes(app);

    const response = await app.inject({
      method: "POST",
      url: "/admin/inventory/sync",
      headers: { authorization: "Bearer admin-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(inventoryService.syncAdminInventory).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      actorId: "user-1",
    });
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        tenant_id: "tenant-1",
        sync_status: "success",
      },
    });
  });

  it("updates tenant inventory safely for admins", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const inventoryService = container.inventoryService as unknown as { updateAdminInventoryItem: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
    });
    inventoryService.updateAdminInventoryItem.mockResolvedValue({
      product_id: "product-1",
      product_name: "Milk 1L",
      brand_name: "Brand A",
      stock_quantity: 30,
      low_stock_threshold: 10,
      last_synced_at: "2026-03-30T10:05:00.000Z",
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerInventoryRoutes(app);

    const response = await app.inject({
      method: "PATCH",
      url: "/admin/inventory/product-1",
      headers: { authorization: "Bearer admin-token" },
      payload: {
        stock_quantity: 30,
        low_stock_threshold: 10,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(inventoryService.updateAdminInventoryItem).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      productId: "product-1",
      stockQuantity: 30,
      lowStockThreshold: 10,
      actorId: "user-1",
    });
  });

  it("rejects retailer access to admin inventory routes", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      retailerId: "retailer-1",
      tenantId: "tenant-1",
      tokenType: "retailer",
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerInventoryRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: "/admin/inventory",
      headers: { authorization: "Bearer retailer-token" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      success: false,
      error_code: "UNAUTHORIZED",
    });
  });

  it("rejects negative stock update payloads", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerInventoryRoutes(app);

    const response = await app.inject({
      method: "PATCH",
      url: "/admin/inventory/product-1",
      headers: { authorization: "Bearer admin-token" },
      payload: {
        stock_quantity: -1,
        low_stock_threshold: 2,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error_code: "VALIDATION_ERROR",
    });
  });

  it("preserves the legacy stock route", async () => {
    const container = createContainer();
    const inventoryService = container.inventoryService as unknown as { getAvailableStock: ReturnType<typeof vi.fn> };

    inventoryService.getAvailableStock.mockResolvedValue({
      "product-1": 12,
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerInventoryRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: "/inventory/stock?tenant_id=tenant-1",
    });

    expect(response.statusCode).toBe(200);
    expect(inventoryService.getAvailableStock).toHaveBeenCalledWith("tenant-1", []);
  });

  it("returns not found for unknown tenant-scoped inventory products", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const inventoryService = container.inventoryService as unknown as { updateAdminInventoryItem: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
    });
    inventoryService.updateAdminInventoryItem.mockRejectedValue(
      new AppError(HTTP_STATUS.NOT_FOUND, "INVENTORY_PRODUCT_NOT_FOUND", "Inventory product not found"),
    );

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerInventoryRoutes(app);

    const response = await app.inject({
      method: "PATCH",
      url: "/admin/inventory/product-2",
      headers: { authorization: "Bearer admin-token" },
      payload: {
        stock_quantity: 3,
        low_stock_threshold: 1,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      success: false,
      error_code: "INVENTORY_PRODUCT_NOT_FOUND",
    });
  });
});
