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
        status: "PLACED",
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

  it("allows only the configured admin order status transitions", async () => {
    const repository = {
      getOrderById: vi.fn().mockResolvedValue({
        id: "order-1",
        status: "PLACED",
      }),
      updateStatus: vi.fn().mockResolvedValue({
        id: "order-1",
        status: "CONFIRMED",
      }),
    };

    const service = new OrderService({} as never, repository as never);
    const result = await service.updateStatus("tenant-1", "order-1", "CONFIRMED");

    expect(repository.updateStatus).toHaveBeenCalledWith("tenant-1", "order-1", "CONFIRMED");
    expect(result).toMatchObject({
      id: "order-1",
      status: "CONFIRMED",
    });
  });

  it("rejects invalid admin order status transitions", async () => {
    const repository = {
      getOrderById: vi.fn().mockResolvedValue({
        id: "order-1",
        status: "CONFIRMED",
      }),
    };

    const service = new OrderService({} as never, repository as never);

    await expect(service.updateStatus("tenant-1", "order-1", "PLACED")).rejects.toBeInstanceOf(AppError);
  });
});
