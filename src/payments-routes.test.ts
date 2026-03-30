import fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AppContainer } from "../apps/backend/src/core/config/container";
import { registerPaymentsRoutes } from "../apps/backend/src/modules/payments/module.routes";
import { HTTP_STATUS } from "../apps/backend/src/shared/constants/http-status";
import { AppError } from "../apps/backend/src/shared/errors/app-error";
import { errorHandler } from "../apps/backend/src/shared/middleware/error-handler";

const createContainer = () =>
  ({
    authService: {
      verifyAccessToken: vi.fn(),
    },
    paymentsService: {
      recordPayment: vi.fn(),
      listPayments: vi.fn(),
      getRetailerCreditSummary: vi.fn(),
      updateRetailerCreditLimit: vi.fn(),
    },
  }) as unknown as AppContainer;

describe("payments routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("records a tenant payment for admin users", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const paymentsService = container.paymentsService as unknown as { recordPayment: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
    });
    paymentsService.recordPayment.mockResolvedValue({
      id: "payment-1",
      retailer_name: "Shop 1",
      order_id: "order-1",
      amount: 5000,
      payment_mode: "advance",
      reference_note: "UPI",
      paid_at: "2026-03-30T10:00:00.000Z",
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerPaymentsRoutes(app);

    const response = await app.inject({
      method: "POST",
      url: "/admin/payments",
      headers: {
        authorization: "Bearer admin-token",
        "idempotency-key": "idem-1",
      },
      payload: {
        order_id: "order-1",
        amount: 5000,
        payment_mode: "advance",
        reference_note: "UPI",
        paid_at: "2026-03-30T10:00:00.000Z",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(paymentsService.recordPayment).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      actorId: "user-1",
      orderId: "order-1",
      amount: 5000,
      paymentMode: "advance",
      referenceNote: "UPI",
      paidAt: "2026-03-30T10:00:00.000Z",
      idempotencyKey: "idem-1",
    });
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        id: "payment-1",
        amount: 5000,
      },
    });
  });

  it("lists tenant payment history for admin users", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const paymentsService = container.paymentsService as unknown as { listPayments: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
    });
    paymentsService.listPayments.mockResolvedValue({
      items: [
        {
          id: "payment-1",
          retailer_id: "retailer-1",
          retailer_name: "Shop 1",
          order_id: "order-1",
          amount: 5000,
          payment_mode: "cod",
          reference_note: null,
          paid_at: "2026-03-30T10:00:00.000Z",
          created_at: "2026-03-30T10:00:00.000Z",
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        total_pages: 1,
      },
      summary: {
        total_outstanding: 22000,
        advance_collected_today: 5000,
        cod_pending: 22000,
      },
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerPaymentsRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: "/admin/payments?retailer_id=retailer-1&page=1&limit=10",
      headers: { authorization: "Bearer admin-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(paymentsService.listPayments).toHaveBeenCalledWith("tenant-1", {
      retailer_id: "retailer-1",
      page: 1,
      limit: 10,
    });
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        items: [{ order_id: "order-1" }],
        summary: {
          total_outstanding: 22000,
        },
      },
    });
  });

  it("returns a tenant-scoped retailer credit summary", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const paymentsService = container.paymentsService as unknown as { getRetailerCreditSummary: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
    });
    paymentsService.getRetailerCreditSummary.mockResolvedValue({
      credit_limit: 50000,
      current_outstanding: 22000,
      advance_balance: 3000,
      overdue_amount: 22000,
      last_payment_date: "2026-03-29T09:00:00.000Z",
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerPaymentsRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: "/admin/retailers/retailer-1/credit-summary",
      headers: { authorization: "Bearer admin-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(paymentsService.getRetailerCreditSummary).toHaveBeenCalledWith("tenant-1", "retailer-1");
  });

  it("updates a tenant retailer credit limit for admin users", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const paymentsService = container.paymentsService as unknown as { updateRetailerCreditLimit: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
    });
    paymentsService.updateRetailerCreditLimit.mockResolvedValue({
      retailer_id: "retailer-1",
      credit_limit: 85000,
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerPaymentsRoutes(app);

    const response = await app.inject({
      method: "PATCH",
      url: "/admin/retailers/retailer-1/credit-limit",
      headers: { authorization: "Bearer admin-token" },
      payload: { credit_limit: 85000 },
    });

    expect(response.statusCode).toBe(200);
    expect(paymentsService.updateRetailerCreditLimit).toHaveBeenCalledWith("tenant-1", "retailer-1", 85000);
  });

  it("rejects retailer access to admin payment routes", async () => {
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
    await registerPaymentsRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: "/admin/payments",
      headers: { authorization: "Bearer retailer-token" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      success: false,
      error_code: "UNAUTHORIZED",
    });
  });

  it("rejects invalid payment payloads", async () => {
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
    await registerPaymentsRoutes(app);

    const response = await app.inject({
      method: "POST",
      url: "/admin/payments",
      headers: { authorization: "Bearer admin-token" },
      payload: {
        order_id: "order-1",
        amount: 0,
        payment_mode: "advance",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error_code: "VALIDATION_ERROR",
    });
  });

  it("returns not found when updating credit for an unlinked retailer", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const paymentsService = container.paymentsService as unknown as { updateRetailerCreditLimit: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
    });
    paymentsService.updateRetailerCreditLimit.mockRejectedValue(
      new AppError(HTTP_STATUS.NOT_FOUND, "RETAILER_NOT_FOUND", "Retailer not found"),
    );

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerPaymentsRoutes(app);

    const response = await app.inject({
      method: "PATCH",
      url: "/admin/retailers/retailer-404/credit-limit",
      headers: { authorization: "Bearer admin-token" },
      payload: { credit_limit: 25000 },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      success: false,
      error_code: "RETAILER_NOT_FOUND",
    });
  });
});
