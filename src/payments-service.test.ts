import { describe, expect, it, vi } from "vitest";

import { HTTP_STATUS } from "../apps/backend/src/shared/constants/http-status";
import { PaymentsService } from "../apps/backend/src/modules/payments/module.service";

describe("PaymentsService", () => {
  it("returns an existing tenant payment when the idempotency key already exists", async () => {
    const repository = {
      findPaymentByIdempotencyKey: vi.fn().mockResolvedValue({
        id: "payment-1",
        tenant_id: "tenant-1",
        retailer_id: "retailer-1",
        retailer_name: "Shop 1",
        order_id: "order-1",
        amount: 5000,
        payment_mode: "advance",
        reference_note: "UPI",
        paid_at: "2026-03-30T10:00:00.000Z",
        created_at: "2026-03-30T10:00:00.000Z",
      }),
    };

    const service = new PaymentsService({} as never, repository as never);
    const result = await service.recordPayment({
      tenantId: "tenant-1",
      actorId: "user-1",
      orderId: "order-1",
      amount: 5000,
      paymentMode: "advance",
      referenceNote: "UPI",
      paidAt: "2026-03-30T10:00:00.000Z",
      idempotencyKey: "idem-1",
    });

    expect(repository.findPaymentByIdempotencyKey).toHaveBeenCalledWith("tenant-1", "idem-1");
    expect(result).toMatchObject({
      id: "payment-1",
      amount: 5000,
    });
  });

  it("creates a tenant-scoped payment inside a transaction when no idempotency hit exists", async () => {
    const trx = { tx: true };
    const db = {
      transaction: vi.fn(async (callback: (value: unknown) => Promise<unknown>) => callback(trx)),
    };
    const repository = {
      findPaymentByIdempotencyKey: vi.fn().mockResolvedValue(null),
      findOrderForPayment: vi.fn().mockResolvedValue({
        id: "order-1",
        tenant_id: "tenant-1",
        retailer_id: "retailer-1",
        retailer_name: "Shop 1",
        total_amount: 12500,
      }),
      createPaymentTransaction: vi.fn().mockResolvedValue({
        id: "payment-1",
        tenant_id: "tenant-1",
        retailer_id: "retailer-1",
        retailer_name: "Shop 1",
        order_id: "order-1",
        amount: 5000,
        payment_mode: "credit",
        reference_note: null,
        paid_at: "2026-03-30T10:00:00.000Z",
        created_at: "2026-03-30T10:00:00.000Z",
      }),
    };

    const service = new PaymentsService(db as never, repository as never);
    const result = await service.recordPayment({
      tenantId: "tenant-1",
      actorId: "user-1",
      orderId: "order-1",
      amount: 5000,
      paymentMode: "credit",
      referenceNote: undefined,
      paidAt: "2026-03-30T10:00:00.000Z",
      idempotencyKey: "idem-2",
    });

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(repository.findOrderForPayment).toHaveBeenCalledWith("tenant-1", "order-1", trx);
    expect(repository.createPaymentTransaction).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      retailerId: "retailer-1",
      orderId: "order-1",
      amount: 5000,
      paymentMode: "credit",
      referenceNote: null,
      paidAt: "2026-03-30T10:00:00.000Z",
      actorId: "user-1",
      idempotencyKey: "idem-2",
    }, trx);
    expect(result).toMatchObject({
      id: "payment-1",
      payment_mode: "credit",
    });
  });

  it("throws when recording a payment for an order outside the tenant scope", async () => {
    const db = {
      transaction: vi.fn(async (callback: (value: unknown) => Promise<unknown>) => callback({ tx: true })),
    };
    const repository = {
      findOrderForPayment: vi.fn().mockResolvedValue(null),
      findPaymentByIdempotencyKey: vi.fn().mockResolvedValue(null),
    };

    const service = new PaymentsService(db as never, repository as never);

    await expect(
      service.recordPayment({
        tenantId: "tenant-1",
        actorId: "user-1",
        orderId: "order-404",
        amount: 1000,
        paymentMode: "advance",
        referenceNote: undefined,
        paidAt: undefined,
        idempotencyKey: undefined,
      }),
    ).rejects.toMatchObject({
      code: "ORDER_NOT_FOUND",
      statusCode: HTTP_STATUS.NOT_FOUND,
    });
  });

  it("returns a tenant-scoped credit summary", async () => {
    const repository = {
      findRetailerCreditSummary: vi.fn().mockResolvedValue({
        credit_limit: 50000,
        current_outstanding: 22000,
        advance_balance: 3000,
        overdue_amount: 22000,
        last_payment_date: "2026-03-29T09:00:00.000Z",
      }),
    };

    const service = new PaymentsService({} as never, repository as never);
    const result = await service.getRetailerCreditSummary("tenant-1", "retailer-1");

    expect(repository.findRetailerCreditSummary).toHaveBeenCalledWith("tenant-1", "retailer-1");
    expect(result).toMatchObject({
      credit_limit: 50000,
      current_outstanding: 22000,
    });
  });

  it("updates a tenant retailer credit limit", async () => {
    const repository = {
      updateRetailerCreditLimit: vi.fn().mockResolvedValue({
        retailer_id: "retailer-1",
        credit_limit: 75000,
      }),
    };

    const service = new PaymentsService({} as never, repository as never);
    const result = await service.updateRetailerCreditLimit("tenant-1", "retailer-1", 75000);

    expect(repository.updateRetailerCreditLimit).toHaveBeenCalledWith("tenant-1", "retailer-1", 75000);
    expect(result).toMatchObject({
      retailer_id: "retailer-1",
      credit_limit: 75000,
    });
  });
});
