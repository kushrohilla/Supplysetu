import { describe, expect, it, vi } from "vitest";

import { OrderService } from "./module.service";
import { ORDER_STATUS } from "./order-status";

describe("OrderService notification triggers", () => {
  it("emits order_confirmed after a successful status transition", async () => {
    const repository = {
      getOrderById: vi
        .fn()
        .mockResolvedValueOnce({
          id: "order-1",
          tenant_id: "tenant-1",
          retailer_id: "retailer-1",
          retailer_name: "Fresh Mart",
          order_number: "ORD-000001",
          status: ORDER_STATUS.PLACED,
          total_amount: 1250,
          created_at: "2026-03-30T00:00:00.000Z",
          updated_at: "2026-03-30T00:00:00.000Z",
          packed_at: null,
          dispatched_at: null,
          delivered_at: null,
          closed_at: null,
          items: [],
        })
        .mockResolvedValueOnce({
          id: "order-1",
          tenant_id: "tenant-1",
          retailer_id: "retailer-1",
          retailer_name: "Fresh Mart",
          order_number: "ORD-000001",
          status: ORDER_STATUS.CONFIRMED,
          total_amount: 1250,
          created_at: "2026-03-30T00:00:00.000Z",
          updated_at: "2026-03-30T00:05:00.000Z",
          packed_at: null,
          dispatched_at: null,
          delivered_at: null,
          closed_at: null,
          items: [],
        }),
      getRetailerOrderById: vi.fn(),
      updateStatus: vi.fn().mockResolvedValue({
        id: "order-1",
        tenant_id: "tenant-1",
        retailer_id: "retailer-1",
        retailer_name: "Fresh Mart",
        order_number: "ORD-000001",
        status: ORDER_STATUS.CONFIRMED,
        total_amount: 1250,
        created_at: "2026-03-30T00:00:00.000Z",
        updated_at: "2026-03-30T00:05:00.000Z",
        packed_at: null,
        dispatched_at: null,
        delivered_at: null,
        closed_at: null,
        items: [],
      }),
      createHistoryEntry: vi.fn().mockResolvedValue(undefined),
    };
    const notificationsService = {
      dispatchOperationalEvent: vi.fn().mockResolvedValue(undefined),
    };
    const db = {
      transaction: vi.fn(async (callback: (trx: unknown) => Promise<unknown>) => callback({})),
    };

    const service = new OrderService(db as never, repository as never, notificationsService as never);

    await service.updateStatus({
      tenantId: "tenant-1",
      orderId: "order-1",
      nextStatus: ORDER_STATUS.CONFIRMED,
      actorRole: "admin",
      actorId: "user-1",
    });

    expect(notificationsService.dispatchOperationalEvent).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      eventType: "order_confirmed",
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
