import { describe, expect, it, vi } from "vitest";

import { DispatchService } from "./module.service";

describe("DispatchService notification triggers", () => {
  it("emits order_dispatched for every batch order after dispatch succeeds", async () => {
    const dispatchRepository = {
      getBatchById: vi.fn().mockResolvedValue({
        id: "batch-1",
        tenant_id: "tenant-1",
        delivery_route_id: "route-1",
        planned_date: "2026-03-30",
        status: "PENDING",
        created_at: "2026-03-30T00:00:00.000Z",
      }),
      listBatchOrders: vi.fn().mockResolvedValue([{ order_id: "order-1" }, { order_id: "order-2" }]),
      updateBatchStatus: vi.fn().mockResolvedValue({
        id: "batch-1",
        route_name: "North Route",
        delivery_date: "2026-03-30",
        order_count: 2,
        status: "DISPATCHED",
        created_at: "2026-03-30T00:00:00.000Z",
        route_id: "route-1",
        route_description: null,
      }),
    };
    const orderRepository = {
      getOrderById: vi
        .fn()
        .mockResolvedValueOnce({
          id: "order-1",
          tenant_id: "tenant-1",
          retailer_id: "retailer-1",
          retailer_name: "Fresh Mart",
          order_number: "ORD-000001",
          status: "PACKED",
          total_amount: 1250,
        })
        .mockResolvedValueOnce({
          id: "order-2",
          tenant_id: "tenant-1",
          retailer_id: "retailer-2",
          retailer_name: "Metro Stores",
          order_number: "ORD-000002",
          status: "PACKED",
          total_amount: 990,
        }),
      updateStatus: vi
        .fn()
        .mockResolvedValueOnce({
          id: "order-1",
          tenant_id: "tenant-1",
          retailer_id: "retailer-1",
          retailer_name: "Fresh Mart",
          order_number: "ORD-000001",
          status: "DISPATCHED",
          total_amount: 1250,
        })
        .mockResolvedValueOnce({
          id: "order-2",
          tenant_id: "tenant-1",
          retailer_id: "retailer-2",
          retailer_name: "Metro Stores",
          order_number: "ORD-000002",
          status: "DISPATCHED",
          total_amount: 990,
        }),
      createHistoryEntry: vi.fn().mockResolvedValue(undefined),
    };
    const notificationsService = {
      dispatchOperationalEvent: vi.fn().mockResolvedValue(undefined),
    };
    const db = {
      transaction: vi.fn(async (callback: (trx: unknown) => Promise<unknown>) => callback({})),
    };

    const service = new DispatchService(
      db as never,
      dispatchRepository as never,
      orderRepository as never,
      notificationsService as never,
    );

    await service.dispatchBatch({
      tenantId: "tenant-1",
      batchId: "batch-1",
      actorId: "user-1",
    });

    expect(notificationsService.dispatchOperationalEvent).toHaveBeenCalledTimes(2);
    expect(notificationsService.dispatchOperationalEvent).toHaveBeenNthCalledWith(1, {
      tenantId: "tenant-1",
      eventType: "order_dispatched",
      resourceType: "order",
      resourceId: "order-1",
      recipientType: "retailer",
      recipientId: "retailer-1",
      payload: {
        orderId: "order-1",
        orderNumber: "ORD-000001",
        totalAmount: 1250,
      },
    });
    expect(notificationsService.dispatchOperationalEvent).toHaveBeenNthCalledWith(2, {
      tenantId: "tenant-1",
      eventType: "order_dispatched",
      resourceType: "order",
      resourceId: "order-2",
      recipientType: "retailer",
      recipientId: "retailer-2",
      payload: {
        orderId: "order-2",
        orderNumber: "ORD-000002",
        totalAmount: 990,
      },
    });
  });

  it("emits order_delivered after delivery succeeds", async () => {
    const dispatchRepository = {
      findBatchByOrderId: vi.fn().mockResolvedValue({
        id: "batch-1",
        tenant_id: "tenant-1",
        status: "DISPATCHED",
      }),
      markBatchStopsCompletedIfDelivered: vi.fn().mockResolvedValue(undefined),
      listBatchOrdersWithStatuses: vi.fn().mockResolvedValue([
        { order_id: "order-1", status: "DELIVERED" },
      ]),
      updateBatchStatus: vi.fn().mockResolvedValue({
        id: "batch-1",
        route_name: "North Route",
        delivery_date: "2026-03-30",
        order_count: 1,
        status: "COMPLETED",
        created_at: "2026-03-30T00:00:00.000Z",
        route_id: "route-1",
        route_description: null,
      }),
      getBatchById: vi.fn(),
    };
    const orderRepository = {
      getOrderById: vi.fn().mockResolvedValue({
        id: "order-1",
        tenant_id: "tenant-1",
        retailer_id: "retailer-1",
        retailer_name: "Fresh Mart",
        order_number: "ORD-000001",
        status: "DISPATCHED",
        total_amount: 1250,
      }),
      updateStatus: vi.fn().mockResolvedValue({
        id: "order-1",
        tenant_id: "tenant-1",
        retailer_id: "retailer-1",
        retailer_name: "Fresh Mart",
        order_number: "ORD-000001",
        status: "DELIVERED",
        total_amount: 1250,
      }),
      createHistoryEntry: vi.fn().mockResolvedValue(undefined),
    };
    const notificationsService = {
      dispatchOperationalEvent: vi.fn().mockResolvedValue(undefined),
    };
    const db = {
      transaction: vi.fn(async (callback: (trx: unknown) => Promise<unknown>) => callback({})),
    };

    const service = new DispatchService(
      db as never,
      dispatchRepository as never,
      orderRepository as never,
      notificationsService as never,
    );

    await service.deliverOrder({
      tenantId: "tenant-1",
      orderId: "order-1",
      actorId: "user-1",
    });

    expect(notificationsService.dispatchOperationalEvent).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      eventType: "order_delivered",
      resourceType: "order",
      resourceId: "order-1",
      recipientType: "retailer",
      recipientId: "retailer-1",
      payload: {
        orderId: "order-1",
        orderNumber: "ORD-000001",
        totalAmount: 1250,
      },
    });
  });
});
