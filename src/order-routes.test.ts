import fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AppContainer } from "../apps/backend/src/core/config/container";
import { registerOrderRoutes } from "../apps/backend/src/modules/order/module.routes";
import { HTTP_STATUS } from "../apps/backend/src/shared/constants/http-status";
import { AppError } from "../apps/backend/src/shared/errors/app-error";
import { errorHandler } from "../apps/backend/src/shared/middleware/error-handler";

const createContainer = () =>
  ({
    authService: {
      verifyAccessToken: vi.fn(),
    },
    orderService: {
      createOrder: vi.fn(),
      listOrders: vi.fn(),
      getOrder: vi.fn(),
      updateStatus: vi.fn(),
    },
  }) as unknown as AppContainer;

describe("order routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates an order using tenantId from auth only", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const orderService = container.orderService as unknown as { createOrder: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
      role: "distributor_admin",
    });
    orderService.createOrder.mockResolvedValue({
      id: "order-1",
      order_number: "ORD-000001",
      status: "PLACED",
      total_amount: 500,
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerOrderRoutes(app);

    const response = await app.inject({
      method: "POST",
      url: "/orders",
      headers: { authorization: "Bearer admin-token" },
      payload: {
        retailer_id: "retailer-1",
        items: [
          { product_id: "product-1", quantity: 2 },
        ],
      },
    });

    expect(response.statusCode).toBe(201);
    expect(orderService.createOrder).toHaveBeenCalledWith("tenant-1", {
      retailer_id: "retailer-1",
      items: [{ product_id: "product-1", quantity: 2 }],
    });
  });

  it("rejects tenant_id in create payloads", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
      role: "distributor_admin",
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerOrderRoutes(app);

    const response = await app.inject({
      method: "POST",
      url: "/orders",
      headers: { authorization: "Bearer admin-token" },
      payload: {
        tenant_id: "tenant-2",
        retailer_id: "retailer-1",
        items: [{ product_id: "product-1", quantity: 1 }],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error_code: "VALIDATION_ERROR",
    });
  });

  it("lists tenant orders", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const orderService = container.orderService as unknown as { listOrders: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
      role: "distributor_admin",
    });
    orderService.listOrders.mockResolvedValue([{ id: "order-1", order_number: "ORD-000001" }]);

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerOrderRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: "/orders",
      headers: { authorization: "Bearer admin-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(orderService.listOrders).toHaveBeenCalledWith("tenant-1");
    expect(response.json()).toMatchObject({
      success: true,
      data: [{ id: "order-1", order_number: "ORD-000001" }],
    });
  });

  it("gets a single tenant order", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const orderService = container.orderService as unknown as { getOrder: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
      role: "distributor_admin",
    });
    orderService.getOrder.mockResolvedValue({ id: "order-1", order_number: "ORD-000001" });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerOrderRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: "/orders/order-1",
      headers: { authorization: "Bearer admin-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(orderService.getOrder).toHaveBeenCalledWith("tenant-1", "order-1");
  });

  it("returns 404 for cross-tenant order access", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const orderService = container.orderService as unknown as { getOrder: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-a",
      tokenType: "admin",
      role: "distributor_admin",
    });
    orderService.getOrder.mockRejectedValue(
      new AppError(HTTP_STATUS.NOT_FOUND, "ORDER_NOT_FOUND", "Order not found"),
    );

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerOrderRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: "/orders/order-b",
      headers: { authorization: "Bearer admin-token" },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      success: false,
      error_code: "ORDER_NOT_FOUND",
    });
  });

  it("updates order status", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const orderService = container.orderService as unknown as { updateStatus: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
      role: "distributor_admin",
    });
    orderService.updateStatus.mockResolvedValue({
      id: "order-1",
      status: "CONFIRMED",
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerOrderRoutes(app);

    const response = await app.inject({
      method: "PATCH",
      url: "/orders/order-1/status",
      headers: { authorization: "Bearer admin-token" },
      payload: {
        status: "CONFIRMED",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(orderService.updateStatus).toHaveBeenCalledWith("tenant-1", "order-1", "CONFIRMED");
  });

  it("rejects invalid order status payloads", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
      role: "distributor_admin",
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerOrderRoutes(app);

    const response = await app.inject({
      method: "PATCH",
      url: "/orders/order-1/status",
      headers: { authorization: "Bearer admin-token" },
      payload: {
        status: "DISPATCHED",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error_code: "VALIDATION_ERROR",
    });
  });
});
