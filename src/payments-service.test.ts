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

  it("throws RETAILER_NOT_FOUND when credit summary retailer does not exist", async () => {
    const repository = {
      findRetailerCreditSummary: vi.fn().mockResolvedValue(null),
    };

    const service = new PaymentsService({} as never, repository as never);

    await expect(
      service.getRetailerCreditSummary("tenant-1", "retailer-404"),
    ).rejects.toMatchObject({
      code: "RETAILER_NOT_FOUND",
      statusCode: HTTP_STATUS.NOT_FOUND,
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

  it("throws RETAILER_NOT_FOUND when updating credit limit for unlinked retailer", async () => {
    const repository = {
      updateRetailerCreditLimit: vi.fn().mockResolvedValue(null),
    };

    const service = new PaymentsService({} as never, repository as never);

    await expect(
      service.updateRetailerCreditLimit("tenant-1", "retailer-404", 25000),
    ).rejects.toMatchObject({
      code: "RETAILER_NOT_FOUND",
      statusCode: HTTP_STATUS.NOT_FOUND,
    });
  });

  it("rejects payment with invalid paid_at date string", async () => {
    const db = {
      transaction: vi.fn(),
    };
    const repository = {
      findPaymentByIdempotencyKey: vi.fn().mockResolvedValue(null),
    };

    const service = new PaymentsService(db as never, repository as never);

    await expect(
      service.recordPayment({
        tenantId: "tenant-1",
        actorId: "user-1",
        orderId: "order-1",
        amount: 5000,
        paymentMode: "advance",
        referenceNote: undefined,
        paidAt: "not-a-valid-date",
        idempotencyKey: undefined,
      }),
    ).rejects.toMatchObject({
      code: "INVALID_PAID_AT",
      statusCode: HTTP_STATUS.BAD_REQUEST,
    });

    // Transaction should never be started if paid_at is invalid.
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("normalizes paid_at to ISO string when valid", async () => {
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
        total_amount: 10000,
      }),
      createPaymentTransaction: vi.fn().mockResolvedValue({
        id: "payment-1",
        tenant_id: "tenant-1",
        retailer_id: "retailer-1",
        retailer_name: "Shop 1",
        order_id: "order-1",
        amount: 5000,
        payment_mode: "advance",
        reference_note: null,
        paid_at: "2026-03-30T04:30:00.000Z",
        created_at: "2026-03-30T04:30:00.000Z",
      }),
    };

    const service = new PaymentsService(db as never, repository as never);
    await service.recordPayment({
      tenantId: "tenant-1",
      actorId: "user-1",
      orderId: "order-1",
      amount: 5000,
      paymentMode: "advance",
      paidAt: "2026-03-30T10:00:00+05:30", // IST timezone
      idempotencyKey: "idem-3",
    });

    const createCall = repository.createPaymentTransaction.mock.calls[0]![0] as { paidAt: string };
    // Should be normalized to UTC ISO string
    expect(createCall.paidAt).toBe("2026-03-30T04:30:00.000Z");
  });

  it("uses current time when paid_at is omitted", async () => {
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
        total_amount: 10000,
      }),
      createPaymentTransaction: vi.fn().mockResolvedValue({
        id: "payment-1",
        tenant_id: "tenant-1",
        retailer_id: "retailer-1",
        retailer_name: "Shop 1",
        order_id: "order-1",
        amount: 5000,
        payment_mode: "advance",
        reference_note: null,
        paid_at: "2026-03-30T10:00:00.000Z",
        created_at: "2026-03-30T10:00:00.000Z",
      }),
    };

    const service = new PaymentsService(db as never, repository as never);
    await service.recordPayment({
      tenantId: "tenant-1",
      actorId: "user-1",
      orderId: "order-1",
      amount: 5000,
      paymentMode: "advance",
      // paidAt omitted
    });

    const createCall = repository.createPaymentTransaction.mock.calls[0]![0] as { paidAt: string };
    // Should be a valid ISO string (auto-generated)
    expect(() => new Date(createCall.paidAt)).not.toThrow();
    expect(createCall.paidAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("handles unique violation race by returning existing payment", async () => {
    const uniqueError = { code: "23505", message: "unique violation" };
    const db = {
      transaction: vi.fn().mockRejectedValue(uniqueError),
    };
    const existingPayment = {
      id: "payment-1",
      tenant_id: "tenant-1",
      retailer_id: "retailer-1",
      retailer_name: "Shop 1",
      order_id: "order-1",
      amount: 5000,
      payment_mode: "advance",
      reference_note: null,
      paid_at: "2026-03-30T10:00:00.000Z",
      created_at: "2026-03-30T10:00:00.000Z",
    };
    const repository = {
      findPaymentByIdempotencyKey: vi.fn()
        .mockResolvedValueOnce(null) // First call (fast-path) returns null
        .mockResolvedValueOnce(existingPayment), // Second call (after race) returns existing
    };

    const service = new PaymentsService(db as never, repository as never);
    const result = await service.recordPayment({
      tenantId: "tenant-1",
      actorId: "user-1",
      orderId: "order-1",
      amount: 5000,
      paymentMode: "advance",
      idempotencyKey: "idem-race",
    });

    expect(result).toMatchObject({ id: "payment-1" });
  });
});
