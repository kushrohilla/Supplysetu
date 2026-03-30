import { describe, expect, it, vi } from "vitest";

import { HTTP_STATUS } from "../apps/backend/src/shared/constants/http-status";
import { AppError } from "../apps/backend/src/shared/errors/app-error";
import { OrderService } from "../apps/backend/src/modules/order/module.service";

describe("OrderService", () => {
  it("creates tenant-scoped orders in a transaction and calculates totals", async () => {
    const transaction = { trx: true };
    const db = {
      transaction: vi.fn(async (callback: (trx: unknown) => Promise<unknown>) => callback(transaction)),
    };
    const repository = {
      findRetailerById: vi.fn().mockResolvedValue({ id: "retailer-1", name: "Shop 1" }),
      getProductsForTenant: vi.fn().mockResolvedValue([
        { id: "product-1", product_name: "Tea", base_price: 120 },
        { id: "product-2", product_name: "Sugar", base_price: 50 },
      ]),
      getNextOrderSequence: vi.fn().mockResolvedValue(7),
      createOrderWithItems: vi.fn().mockResolvedValue({
        id: "order-1",
        order_number: "ORD-000007",
        status: "PLACED",
        total_amount: 290,
      }),
    };

    const service = new OrderService(db as never, repository as never);

    const result = await service.createOrder("tenant-1", {
      retailer_id: "retailer-1",
      items: [
        { product_id: "product-1", quantity: 2 },
        { product_id: "product-2", quantity: 1 },
      ],
    });

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(repository.findRetailerById).toHaveBeenCalledWith("tenant-1", "retailer-1", transaction);
    expect(repository.getProductsForTenant).toHaveBeenCalledWith("tenant-1", ["product-1", "product-2"], transaction);
    expect(repository.getNextOrderSequence).toHaveBeenCalledWith("tenant-1", transaction);
    expect(repository.createOrderWithItems).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({
        retailer_id: "retailer-1",
        order_number: "ORD-000007",
        status: "DRAFT",
        total_amount: 290,
      }),
      [
        expect.objectContaining({
          product_id: "product-1",
          quantity: 2,
          price: 120,
          total_price: 240,
        }),
        expect.objectContaining({
          product_id: "product-2",
          quantity: 1,
          price: 50,
          total_price: 50,
        }),
      ],
      transaction,
    );
    expect(result).toMatchObject({
      id: "order-1",
      order_number: "ORD-000007",
      total_amount: 290,
    });
  });

  it("returns 404 when the retailer does not belong to the tenant", async () => {
    const db = {
      transaction: vi.fn(async (callback: (trx: unknown) => Promise<unknown>) => callback({})),
    };
    const repository = {
      findRetailerById: vi.fn().mockResolvedValue(null),
    };

    const service = new OrderService(db as never, repository as never);

    await expect(
      service.createOrder("tenant-1", {
        retailer_id: "retailer-2",
        items: [{ product_id: "product-1", quantity: 1 }],
      }),
    ).rejects.toMatchObject({
      code: "RETAILER_NOT_FOUND",
      statusCode: HTTP_STATUS.NOT_FOUND,
    });
  });

  it("returns 404 when any product does not belong to the tenant", async () => {
    const db = {
      transaction: vi.fn(async (callback: (trx: unknown) => Promise<unknown>) => callback({})),
    };
    const repository = {
      findRetailerById: vi.fn().mockResolvedValue({ id: "retailer-1" }),
      getProductsForTenant: vi.fn().mockResolvedValue([{ id: "product-1", base_price: 100 }]),
    };

    const service = new OrderService(db as never, repository as never);

    await expect(
      service.createOrder("tenant-1", {
        retailer_id: "retailer-1",
        items: [
          { product_id: "product-1", quantity: 1 },
          { product_id: "product-2", quantity: 1 },
        ],
      }),
    ).rejects.toMatchObject({
      code: "PRODUCT_NOT_FOUND",
      statusCode: HTTP_STATUS.NOT_FOUND,
    });
  });

  it("returns 404 for cross-tenant order lookup", async () => {
    const repository = {
      getOrderById: vi.fn().mockResolvedValue(null),
    };

    const service = new OrderService({} as never, repository as never);

    await expect(service.getOrder("tenant-1", "order-2")).rejects.toMatchObject({
      code: "ORDER_NOT_FOUND",
    });
    expect(repository.getOrderById).toHaveBeenCalledWith("tenant-1", "order-2");
  });

  it("allows retailers to place draft orders through the status transition service", async () => {
    const transaction = { trx: true };
    const db = {
      transaction: vi.fn(async (callback: (trx: unknown) => Promise<unknown>) => callback(transaction)),
    };
    const repository = {
      getRetailerOrderById: vi.fn().mockResolvedValue({
        id: "order-1",
        retailer_id: "retailer-5",
        status: "DRAFT",
      }),
      updateStatus: vi.fn().mockResolvedValue({
        id: "order-1",
        retailer_id: "retailer-5",
        status: "PLACED",
      }),
      createHistoryEntry: vi.fn().mockResolvedValue(undefined),
    };

    const service = new OrderService(db as never, repository as never);
    const result = await service.updateStatus({
      tenantId: "tenant-1",
      orderId: "order-1",
      nextStatus: "PLACED",
      actorRole: "retailer",
      actorId: "retailer-5",
      retailerId: "retailer-5",
    });

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(repository.getRetailerOrderById).toHaveBeenCalledWith("tenant-1", "retailer-5", "order-1", transaction);
    expect(repository.updateStatus).toHaveBeenCalledWith("tenant-1", "order-1", "PLACED", transaction);
    expect(repository.createHistoryEntry).toHaveBeenCalledWith(
      {
        order_id: "order-1",
        from_status: "DRAFT",
        to_status: "PLACED",
        actor_role: "retailer",
        actor_id: "retailer-5",
      },
      transaction,
    );
    expect(result).toMatchObject({
      id: "order-1",
      status: "PLACED",
    });
  });

  it("allows admins to move confirmed orders to invoiced", async () => {
    const transaction = { trx: true };
    const db = {
      transaction: vi.fn(async (callback: (trx: unknown) => Promise<unknown>) => callback(transaction)),
    };
    const repository = {
      getOrderById: vi.fn().mockResolvedValue({
        id: "order-1",
        status: "CONFIRMED",
      }),
      updateStatus: vi.fn().mockResolvedValue({
        id: "order-1",
        status: "INVOICED",
      }),
      createHistoryEntry: vi.fn().mockResolvedValue(undefined),
    };

    const service = new OrderService(db as never, repository as never);
    const result = await service.updateStatus({
      tenantId: "tenant-1",
      orderId: "order-1",
      nextStatus: "INVOICED",
      actorRole: "admin",
      actorId: "user-1",
    });

    expect(repository.updateStatus).toHaveBeenCalledWith("tenant-1", "order-1", "INVOICED", transaction);
    expect(repository.createHistoryEntry).toHaveBeenCalledWith(
      {
        order_id: "order-1",
        from_status: "CONFIRMED",
        to_status: "INVOICED",
        actor_role: "admin",
        actor_id: "user-1",
      },
      transaction,
    );
    expect(result).toMatchObject({
      id: "order-1",
      status: "INVOICED",
    });
  });

  it("rejects retailer transitions to admin-only lifecycle states", async () => {
    const db = {
      transaction: vi.fn(async (callback: (trx: unknown) => Promise<unknown>) => callback({ trx: true })),
    };
    const repository = {
      getRetailerOrderById: vi.fn().mockResolvedValue({
        id: "order-1",
        retailer_id: "retailer-5",
        status: "CONFIRMED",
      }),
    };

    const service = new OrderService(db as never, repository as never);

    await expect(
      service.updateStatus({
        tenantId: "tenant-1",
        orderId: "order-1",
        nextStatus: "INVOICED",
        actorRole: "retailer",
        actorId: "retailer-5",
        retailerId: "retailer-5",
      }),
    ).rejects.toMatchObject({
      code: "ORDER_STATUS_FORBIDDEN",
      statusCode: HTTP_STATUS.FORBIDDEN,
    });
  });

  it("rejects invalid admin order status transitions", async () => {
    const db = {
      transaction: vi.fn(async (callback: (trx: unknown) => Promise<unknown>) => callback({ trx: true })),
    };
    const repository = {
      getOrderById: vi.fn().mockResolvedValue({
        id: "order-1",
        status: "CONFIRMED",
      }),
    };

    const service = new OrderService(db as never, repository as never);

    await expect(
      service.updateStatus({
        tenantId: "tenant-1",
        orderId: "order-1",
        nextStatus: "PLACED",
        actorRole: "admin",
        actorId: "user-1",
      }),
    ).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
      statusCode: HTTP_STATUS.CONFLICT,
    });
  });

  it("lists order history for a tenant-scoped order", async () => {
    const repository = {
      getOrderById: vi.fn().mockResolvedValue({
        id: "order-1",
        status: "DISPATCHED",
      }),
      listHistory: vi.fn().mockResolvedValue([
        {
          id: "history-1",
          order_id: "order-1",
          from_status: "PACKED",
          to_status: "DISPATCHED",
          actor_role: "admin",
          actor_id: "user-1",
          created_at: "2026-03-30T10:00:00.000Z",
        },
      ]),
    };

    const service = new OrderService({} as never, repository as never);
    const result = await service.getOrderHistory("tenant-1", "order-1");

    expect(repository.getOrderById).toHaveBeenCalledWith("tenant-1", "order-1");
    expect(repository.listHistory).toHaveBeenCalledWith("tenant-1", "order-1");
    expect(result).toEqual([
      expect.objectContaining({
        id: "history-1",
        to_status: "DISPATCHED",
        actor_role: "admin",
      }),
    ]);
  });
});
