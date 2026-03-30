import { describe, expect, it, vi } from "vitest";

import { PaymentsService } from "./module.service";

describe("PaymentsService notification triggers", () => {
  it("returns the payment even if notification dispatch fails after commit", async () => {
    const paymentRecord = {
      id: "payment-1",
      tenant_id: "tenant-1",
      retailer_id: "retailer-1",
      retailer_name: "Fresh Mart",
      order_id: "order-1",
      amount: 50000,
      payment_mode: "advance" as const,
      reference_note: null,
      paid_at: "2026-03-30T10:00:00.000Z",
      created_at: "2026-03-30T10:00:00.000Z",
    };
    const repository = {
      findPaymentByIdempotencyKey: vi.fn().mockResolvedValue(null),
      findOrderForPayment: vi.fn().mockResolvedValue({
        id: "order-1",
        tenant_id: "tenant-1",
        retailer_id: "retailer-1",
        retailer_name: "Fresh Mart",
        total_amount: 125000,
      }),
      createPaymentTransaction: vi.fn().mockResolvedValue(paymentRecord),
    };
    const notificationsService = {
      dispatchOperationalEvent: vi.fn().mockRejectedValue(new Error("notification pipeline unavailable")),
    };
    const db = {
      transaction: vi.fn(async (callback: (trx: unknown) => Promise<unknown>) => callback({})),
    };

    const service = new PaymentsService(db as never, repository as never, notificationsService as never);

    await expect(
      service.recordPayment({
        tenantId: "tenant-1",
        actorId: "user-1",
        orderId: "order-1",
        amount: 50000,
        paymentMode: "advance",
        paidAt: "2026-03-30T10:00:00.000Z",
      }),
    ).resolves.toEqual(paymentRecord);
  });
});
