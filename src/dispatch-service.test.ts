import { describe, expect, it, vi } from "vitest";

import { HTTP_STATUS } from "../apps/backend/src/shared/constants/http-status";
import { DispatchService } from "../apps/backend/src/modules/dispatch/module.service";

describe("DispatchService", () => {
  it("creates a tenant route with linked retailers inside a transaction", async () => {
    const trx = { tx: true };
    const db = {
      transaction: vi.fn(async (callback: (value: unknown) => Promise<unknown>) => callback(trx)),
    };
    const dispatchRepository = {
      listLinkedRetailersByIds: vi.fn().mockResolvedValue([
        { id: "retailer-1" },
        { id: "retailer-2" },
      ]),
      createRouteWithRetailers: vi.fn().mockResolvedValue({
        id: "route-1",
        name: "North Route",
        description: "Morning trip",
        retailer_count: 2,
      }),
    };

    const service = new DispatchService(
      db as never,
      dispatchRepository as never,
      {} as never,
    );

    const result = await service.createRoute({
      tenantId: "tenant-1",
      name: "North Route",
      description: "Morning trip",
      retailerIds: ["retailer-1", "retailer-2"],
    });

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(dispatchRepository.listLinkedRetailersByIds).toHaveBeenCalledWith(
      "tenant-1",
      ["retailer-1", "retailer-2"],
      trx,
    );
    expect(dispatchRepository.createRouteWithRetailers).toHaveBeenCalledWith(
      {
        tenantId: "tenant-1",
        name: "North Route",
        description: "Morning trip",
        retailerIds: ["retailer-1", "retailer-2"],
      },
      trx,
    );
    expect(result).toMatchObject({
      id: "route-1",
      retailer_count: 2,
    });
  });

  it("replaces route retailer assignments atomically", async () => {
    const trx = { tx: true };
    const db = {
      transaction: vi.fn(async (callback: (value: unknown) => Promise<unknown>) => callback(trx)),
    };
    const dispatchRepository = {
      getRouteById: vi.fn().mockResolvedValue({ id: "route-1", tenant_id: "tenant-1" }),
      listLinkedRetailersByIds: vi.fn().mockResolvedValue([{ id: "retailer-1" }]),
      replaceRouteRetailers: vi.fn().mockResolvedValue(undefined),
      getRouteByIdWithRetailerCount: vi.fn().mockResolvedValue({
        id: "route-1",
        name: "North Route",
        retailer_count: 1,
      }),
    };

    const service = new DispatchService(
      db as never,
      dispatchRepository as never,
      {} as never,
    );

    const result = await service.assignRouteRetailers({
      tenantId: "tenant-1",
      routeId: "route-1",
      retailerIds: ["retailer-1"],
    });

    expect(dispatchRepository.replaceRouteRetailers).toHaveBeenCalledWith(
      "tenant-1",
      "route-1",
      ["retailer-1"],
      trx,
    );
    expect(result).toMatchObject({
      id: "route-1",
      retailer_count: 1,
    });
  });

  it("rejects route creation when a retailer is not linked to the tenant", async () => {
    const trx = { tx: true };
    const db = {
      transaction: vi.fn(async (callback: (value: unknown) => Promise<unknown>) => callback(trx)),
    };
    const dispatchRepository = {
      listLinkedRetailersByIds: vi.fn().mockResolvedValue([{ id: "retailer-1" }]),
    };

    const service = new DispatchService(
      db as never,
      dispatchRepository as never,
      {} as never,
    );

    await expect(
      service.createRoute({
        tenantId: "tenant-1",
        name: "North Route",
        retailerIds: ["retailer-1", "retailer-2"],
      }),
    ).rejects.toMatchObject({
      code: "RETAILER_NOT_FOUND",
      statusCode: HTTP_STATUS.NOT_FOUND,
    });
  });

  it("creates a dispatch batch and transitions confirmed orders through invoiced to packed", async () => {
    const trx = { tx: true };
    const db = {
      transaction: vi.fn(async (callback: (value: unknown) => Promise<unknown>) => callback(trx)),
    };
    const dispatchRepository = {
      getRouteWithRetailers: vi.fn().mockResolvedValue({
        id: "route-1",
        tenant_id: "tenant-1",
        retailers: [
          { retailer_id: "retailer-1", sequence_no: 1 },
          { retailer_id: "retailer-2", sequence_no: 2 },
        ],
      }),
      listOrdersForBatch: vi.fn().mockResolvedValue([
        { id: "order-1", retailer_id: "retailer-1", status: "CONFIRMED", total_amount: 100, order_number: "ORD-1" },
        { id: "order-2", retailer_id: "retailer-2", status: "PACKED", total_amount: 200, order_number: "ORD-2" },
      ]),
      findOpenBatchForOrders: vi.fn().mockResolvedValue([]),
      createDispatchBatch: vi.fn().mockResolvedValue({
        id: "batch-1",
        route_name: "North Route",
        delivery_date: "2026-03-31",
        order_count: 2,
        status: "PENDING",
      }),
    };
    const orderRepository = {
      getOrderById: vi.fn()
        .mockResolvedValueOnce({ id: "order-1", status: "CONFIRMED" })
        .mockResolvedValueOnce({ id: "order-1", status: "INVOICED" })
        .mockResolvedValueOnce({ id: "order-2", status: "PACKED" }),
      updateStatus: vi.fn()
        .mockResolvedValueOnce({ id: "order-1", status: "INVOICED" })
        .mockResolvedValueOnce({ id: "order-1", status: "PACKED" }),
      createHistoryEntry: vi.fn().mockResolvedValue(undefined),
    };

    const service = new DispatchService(
      db as never,
      dispatchRepository as never,
      orderRepository as never,
    );

    const result = await service.createBatch({
      tenantId: "tenant-1",
      actorId: "user-1",
      routeId: "route-1",
      deliveryDate: "2026-03-31",
      orderIds: ["order-1", "order-2"],
    });

    expect(dispatchRepository.createDispatchBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        routeId: "route-1",
        deliveryDate: "2026-03-31",
        orderIds: ["order-1", "order-2"],
      }),
      trx,
    );
    expect(orderRepository.updateStatus).toHaveBeenNthCalledWith(1, "tenant-1", "order-1", "INVOICED", trx);
    expect(orderRepository.updateStatus).toHaveBeenNthCalledWith(2, "tenant-1", "order-1", "PACKED", trx);
    expect(result).toMatchObject({
      id: "batch-1",
      status: "PENDING",
    });
  });

  it("rejects batching orders outside the allowed source states", async () => {
    const trx = { tx: true };
    const db = {
      transaction: vi.fn(async (callback: (value: unknown) => Promise<unknown>) => callback(trx)),
    };
    const dispatchRepository = {
      getRouteWithRetailers: vi.fn().mockResolvedValue({
        id: "route-1",
        tenant_id: "tenant-1",
        retailers: [{ retailer_id: "retailer-1", sequence_no: 1 }],
      }),
      listOrdersForBatch: vi.fn().mockResolvedValue([
        { id: "order-1", retailer_id: "retailer-1", status: "CANCELLED", total_amount: 100, order_number: "ORD-1" },
      ]),
      findOpenBatchForOrders: vi.fn().mockResolvedValue([]),
    };

    const service = new DispatchService(
      db as never,
      dispatchRepository as never,
      {} as never,
    );

    await expect(
      service.createBatch({
        tenantId: "tenant-1",
        actorId: "user-1",
        routeId: "route-1",
        deliveryDate: "2026-03-31",
        orderIds: ["order-1"],
      }),
    ).rejects.toMatchObject({
      code: "ORDER_NOT_ELIGIBLE_FOR_BATCH",
      statusCode: HTTP_STATUS.CONFLICT,
    });
  });

  it("rejects batch creation when the route does not exist", async () => {
    const trx = { tx: true };
    const db = {
      transaction: vi.fn(async (callback: (value: unknown) => Promise<unknown>) => callback(trx)),
    };
    const dispatchRepository = {
      getRouteWithRetailers: vi.fn().mockResolvedValue(null),
    };

    const service = new DispatchService(
      db as never,
      dispatchRepository as never,
      {} as never,
    );

    await expect(
      service.createBatch({
        tenantId: "tenant-1",
        actorId: "user-1",
        routeId: "route-404",
        deliveryDate: "2026-03-31",
        orderIds: ["11111111-1111-1111-1111-111111111111"],
      }),
    ).rejects.toMatchObject({
      code: "ROUTE_NOT_FOUND",
      statusCode: HTTP_STATUS.NOT_FOUND,
    });
  });

  it("rejects batch creation when an order is already assigned to an open batch", async () => {
    const trx = { tx: true };
    const db = {
      transaction: vi.fn(async (callback: (value: unknown) => Promise<unknown>) => callback(trx)),
    };
    const dispatchRepository = {
      getRouteWithRetailers: vi.fn().mockResolvedValue({
        id: "route-1",
        tenant_id: "tenant-1",
        retailers: [{ retailer_id: "retailer-1", sequence_no: 1 }],
      }),
      listOrdersForBatch: vi.fn().mockResolvedValue([
        { id: "order-1", retailer_id: "retailer-1", status: "PACKED", total_amount: 100, order_number: "ORD-1" },
      ]),
      findOpenBatchForOrders: vi.fn().mockResolvedValue([{ order_id: "order-1", dispatch_route_id: "batch-9" }]),
    };

    const service = new DispatchService(
      db as never,
      dispatchRepository as never,
      {} as never,
    );

    await expect(
      service.createBatch({
        tenantId: "tenant-1",
        actorId: "user-1",
        routeId: "route-1",
        deliveryDate: "2026-03-31",
        orderIds: ["order-1"],
      }),
    ).rejects.toMatchObject({
      code: "ORDER_ALREADY_BATCHED",
      statusCode: HTTP_STATUS.CONFLICT,
    });
  });

  it("dispatches a batch atomically and updates packed orders to dispatched", async () => {
    const trx = { tx: true };
    const db = {
      transaction: vi.fn(async (callback: (value: unknown) => Promise<unknown>) => callback(trx)),
    };
    const dispatchRepository = {
      getBatchById: vi.fn().mockResolvedValue({
        id: "batch-1",
        tenant_id: "tenant-1",
        status: "PENDING",
      }),
      listBatchOrders: vi.fn().mockResolvedValue([
        { order_id: "order-1" },
        { order_id: "order-2" },
      ]),
      updateBatchStatus: vi.fn().mockResolvedValue({
        id: "batch-1",
        status: "DISPATCHED",
      }),
    };
    const orderRepository = {
      getOrderById: vi.fn()
        .mockResolvedValueOnce({ id: "order-1", status: "PACKED" })
        .mockResolvedValueOnce({ id: "order-2", status: "PACKED" }),
      updateStatus: vi.fn()
        .mockResolvedValueOnce({ id: "order-1", status: "DISPATCHED" })
        .mockResolvedValueOnce({ id: "order-2", status: "DISPATCHED" }),
      createHistoryEntry: vi.fn().mockResolvedValue(undefined),
    };

    const service = new DispatchService(
      db as never,
      dispatchRepository as never,
      orderRepository as never,
    );

    const result = await service.dispatchBatch({
      tenantId: "tenant-1",
      actorId: "user-1",
      batchId: "batch-1",
    });

    expect(orderRepository.updateStatus).toHaveBeenNthCalledWith(1, "tenant-1", "order-1", "DISPATCHED", trx);
    expect(orderRepository.updateStatus).toHaveBeenNthCalledWith(2, "tenant-1", "order-2", "DISPATCHED", trx);
    expect(dispatchRepository.updateBatchStatus).toHaveBeenCalledWith("tenant-1", "batch-1", "DISPATCHED", trx);
    expect(result).toMatchObject({
      id: "batch-1",
      status: "DISPATCHED",
    });
  });

  it("rejects dispatch when the batch does not exist", async () => {
    const trx = { tx: true };
    const db = {
      transaction: vi.fn(async (callback: (value: unknown) => Promise<unknown>) => callback(trx)),
    };
    const dispatchRepository = {
      getBatchById: vi.fn().mockResolvedValue(null),
    };

    const service = new DispatchService(
      db as never,
      dispatchRepository as never,
      {} as never,
    );

    await expect(
      service.dispatchBatch({
        tenantId: "tenant-1",
        actorId: "user-1",
        batchId: "batch-404",
      }),
    ).rejects.toMatchObject({
      code: "DISPATCH_BATCH_NOT_FOUND",
      statusCode: HTTP_STATUS.NOT_FOUND,
    });
  });

  it("delivers an order and completes the batch when all orders are delivered", async () => {
    const trx = { tx: true };
    const db = {
      transaction: vi.fn(async (callback: (value: unknown) => Promise<unknown>) => callback(trx)),
    };
    const dispatchRepository = {
      findBatchByOrderId: vi.fn().mockResolvedValue({
        id: "batch-1",
        tenant_id: "tenant-1",
        status: "DISPATCHED",
      }),
      listBatchOrdersWithStatuses: vi.fn().mockResolvedValue([
        { order_id: "order-1", status: "DELIVERED" },
        { order_id: "order-2", status: "DELIVERED" },
      ]),
      markBatchStopsCompletedIfDelivered: vi.fn().mockResolvedValue(undefined),
      updateBatchStatus: vi.fn().mockResolvedValue({
        id: "batch-1",
        status: "COMPLETED",
      }),
    };
    const orderRepository = {
      getOrderById: vi.fn().mockResolvedValue({ id: "order-2", status: "DISPATCHED" }),
      updateStatus: vi.fn().mockResolvedValue({ id: "order-2", status: "DELIVERED" }),
      createHistoryEntry: vi.fn().mockResolvedValue(undefined),
    };

    const service = new DispatchService(
      db as never,
      dispatchRepository as never,
      orderRepository as never,
    );

    const result = await service.deliverOrder({
      tenantId: "tenant-1",
      actorId: "user-1",
      orderId: "order-2",
    });

    expect(orderRepository.updateStatus).toHaveBeenCalledWith("tenant-1", "order-2", "DELIVERED", trx);
    expect(dispatchRepository.updateBatchStatus).toHaveBeenCalledWith("tenant-1", "batch-1", "COMPLETED", trx);
    expect(result).toMatchObject({
      order: {
        id: "order-2",
        status: "DELIVERED",
      },
      batch: {
        id: "batch-1",
        status: "COMPLETED",
      },
    });
  });

  it("rejects delivery when the order is not in dispatched state", async () => {
    const trx = { tx: true };
    const db = {
      transaction: vi.fn(async (callback: (value: unknown) => Promise<unknown>) => callback(trx)),
    };
    const dispatchRepository = {
      findBatchByOrderId: vi.fn().mockResolvedValue({
        id: "batch-1",
        tenant_id: "tenant-1",
        status: "DISPATCHED",
      }),
    };
    const orderRepository = {
      getOrderById: vi.fn().mockResolvedValue({ id: "order-2", status: "PACKED" }),
    };

    const service = new DispatchService(
      db as never,
      dispatchRepository as never,
      orderRepository as never,
    );

    await expect(
      service.deliverOrder({
        tenantId: "tenant-1",
        actorId: "user-1",
        orderId: "order-2",
      }),
    ).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
      statusCode: HTTP_STATUS.CONFLICT,
    });
  });
});
