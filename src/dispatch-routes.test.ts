import fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AppContainer } from "../apps/backend/src/core/config/container";
import { registerDispatchRoutes } from "../apps/backend/src/modules/dispatch/module.routes";
import { errorHandler } from "../apps/backend/src/shared/middleware/error-handler";

const ROUTE_ID = "11111111-1111-1111-1111-111111111111";
const BATCH_ID = "22222222-2222-2222-2222-222222222222";
const ORDER_ID = "33333333-3333-3333-3333-333333333333";
const RETAILER_ID = "44444444-4444-4444-4444-444444444444";
const RETAILER_ID_TWO = "55555555-5555-5555-5555-555555555555";
const ITEM_ID = "66666666-6666-6666-6666-666666666666";
const PRODUCT_ID = "77777777-7777-7777-7777-777777777777";

const createContainer = () =>
  ({
    authService: {
      verifyAccessToken: vi.fn(),
    },
    dispatchService: {
      createRoute: vi.fn(),
      listRoutes: vi.fn(),
      assignRouteRetailers: vi.fn(),
      createBatch: vi.fn(),
      listBatches: vi.fn(),
      getBatchSheet: vi.fn(),
      dispatchBatch: vi.fn(),
      deliverOrder: vi.fn(),
    },
  }) as unknown as AppContainer;

describe("dispatch routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a route for admin users", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const dispatchService = container.dispatchService as unknown as { createRoute: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
    });
    dispatchService.createRoute.mockResolvedValue({
      id: ROUTE_ID,
      name: "North Route",
      retailer_count: 2,
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerDispatchRoutes(app);

    const response = await app.inject({
      method: "POST",
      url: "/admin/routes",
      headers: { authorization: "Bearer admin-token" },
      payload: {
        name: "North Route",
        description: "Morning trip",
        retailer_ids: [RETAILER_ID, RETAILER_ID_TWO],
      },
    });

    expect(response.statusCode).toBe(201);
    expect(dispatchService.createRoute).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      name: "North Route",
      description: "Morning trip",
      retailerIds: [RETAILER_ID, RETAILER_ID_TWO],
    });
  });

  it("lists tenant routes for admin users", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const dispatchService = container.dispatchService as unknown as { listRoutes: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
    });
    dispatchService.listRoutes.mockResolvedValue([{ id: ROUTE_ID, retailer_count: 2 }]);

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerDispatchRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: "/admin/routes",
      headers: { authorization: "Bearer admin-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(dispatchService.listRoutes).toHaveBeenCalledWith("tenant-1");
    expect(response.json()).toMatchObject({
      success: true,
      data: [{ id: ROUTE_ID }],
    });
  });

  it("creates a dispatch batch for admin users", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const dispatchService = container.dispatchService as unknown as { createBatch: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
    });
    dispatchService.createBatch.mockResolvedValue({
      id: BATCH_ID,
      status: "PENDING",
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerDispatchRoutes(app);

    const response = await app.inject({
      method: "POST",
      url: "/admin/dispatch/batches",
      headers: { authorization: "Bearer admin-token" },
      payload: {
        route_id: ROUTE_ID,
        delivery_date: "2026-03-31",
        order_ids: [ORDER_ID],
      },
    });

    expect(response.statusCode).toBe(201);
    expect(dispatchService.createBatch).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      actorId: "user-1",
      routeId: ROUTE_ID,
      deliveryDate: "2026-03-31",
      orderIds: [ORDER_ID],
    });
  });

  it("replaces route retailer assignments for admin users", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const dispatchService = container.dispatchService as unknown as { assignRouteRetailers: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
    });
    dispatchService.assignRouteRetailers.mockResolvedValue({
      id: ROUTE_ID,
      retailer_count: 1,
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerDispatchRoutes(app);

    const response = await app.inject({
      method: "POST",
      url: `/admin/routes/${ROUTE_ID}/retailers`,
      headers: { authorization: "Bearer admin-token" },
      payload: {
        retailer_ids: [RETAILER_ID],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(dispatchService.assignRouteRetailers).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      routeId: ROUTE_ID,
      retailerIds: [RETAILER_ID],
    });
  });

  it("lists dispatch batches for admin users", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const dispatchService = container.dispatchService as unknown as { listBatches: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
    });
    dispatchService.listBatches.mockResolvedValue([
      {
        id: BATCH_ID,
        route_name: "North Route",
        delivery_date: "2026-03-31",
        order_count: 2,
        status: "PENDING",
        created_at: "2026-03-30T10:00:00.000Z",
      },
    ]);

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerDispatchRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: "/admin/dispatch/batches",
      headers: { authorization: "Bearer admin-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(dispatchService.listBatches).toHaveBeenCalledWith("tenant-1");
    expect(response.json()).toMatchObject({
      success: true,
      data: [{ id: BATCH_ID, status: "PENDING" }],
    });
  });

  it("returns a delivery sheet for a tenant batch", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const dispatchService = container.dispatchService as unknown as { getBatchSheet: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
    });
    dispatchService.getBatchSheet.mockResolvedValue({
      batch: { id: BATCH_ID, status: "PENDING", delivery_date: "2026-03-31", created_at: "2026-03-30T10:00:00.000Z" },
      route: { id: ROUTE_ID, name: "North Route", description: "Morning trip" },
      retailers: [
        {
          retailer: { id: RETAILER_ID, name: "Shop 1", phone: "9999999999" },
          sequence_no: 1,
          totals: { order_count: 1, total_value: 250 },
          orders: [
            {
              id: ORDER_ID,
              order_number: "ORD-1",
              status: "PACKED",
              total_amount: 250,
              items: [
                {
                  id: ITEM_ID,
                  product_id: PRODUCT_ID,
                  product_name: "Tea",
                  brand_name: "Brand A",
                  quantity: 1,
                  price: 250,
                  total_price: 250,
                },
              ],
            },
          ],
        },
      ],
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerDispatchRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: `/admin/dispatch/batches/${BATCH_ID}/sheet`,
      headers: { authorization: "Bearer admin-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(dispatchService.getBatchSheet).toHaveBeenCalledWith("tenant-1", BATCH_ID);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        batch: { id: BATCH_ID },
        route: { id: ROUTE_ID },
        retailers: [
          {
            retailer: { id: RETAILER_ID },
            totals: { order_count: 1, total_value: 250 },
            orders: [
              {
                id: ORDER_ID,
                items: [{ id: ITEM_ID, product_id: PRODUCT_ID }],
              },
            ],
          },
        ],
      },
    });
  });

  it("dispatches a batch for admin users", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const dispatchService = container.dispatchService as unknown as { dispatchBatch: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
    });
    dispatchService.dispatchBatch.mockResolvedValue({
      id: BATCH_ID,
      status: "DISPATCHED",
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerDispatchRoutes(app);

    const response = await app.inject({
      method: "PATCH",
      url: `/admin/dispatch/batches/${BATCH_ID}/dispatch`,
      headers: { authorization: "Bearer admin-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(dispatchService.dispatchBatch).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      actorId: "user-1",
      batchId: BATCH_ID,
    });
  });

  it("delivers a tenant order for admin users", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const dispatchService = container.dispatchService as unknown as { deliverOrder: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
    });
    dispatchService.deliverOrder.mockResolvedValue({
      order: { id: ORDER_ID, status: "DELIVERED" },
      batch: { id: BATCH_ID, status: "COMPLETED" },
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerDispatchRoutes(app);

    const response = await app.inject({
      method: "PATCH",
      url: `/admin/orders/${ORDER_ID}/deliver`,
      headers: { authorization: "Bearer admin-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(dispatchService.deliverOrder).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      actorId: "user-1",
      orderId: ORDER_ID,
    });
  });

  it("rejects retailer tokens on admin dispatch routes", async () => {
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
    await registerDispatchRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: "/admin/routes",
      headers: { authorization: "Bearer retailer-token" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      success: false,
      error_code: "UNAUTHORIZED",
    });
  });

  it("rejects invalid dispatch batch payloads", async () => {
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
    await registerDispatchRoutes(app);

    const response = await app.inject({
      method: "POST",
      url: "/admin/dispatch/batches",
      headers: { authorization: "Bearer admin-token" },
      payload: {
        route_id: "route-1",
        delivery_date: "invalid-date",
        order_ids: [],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error_code: "VALIDATION_ERROR",
    });
  });

  it("rejects invalid UUID values on dispatch routes", async () => {
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
    await registerDispatchRoutes(app);

    const createBatchResponse = await app.inject({
      method: "POST",
      url: "/admin/dispatch/batches",
      headers: { authorization: "Bearer admin-token" },
      payload: {
        route_id: "not-a-uuid",
        delivery_date: "2026-03-31",
        order_ids: ["not-a-uuid"],
      },
    });

    const sheetResponse = await app.inject({
      method: "GET",
      url: "/admin/dispatch/batches/not-a-uuid/sheet",
      headers: { authorization: "Bearer admin-token" },
    });

    expect(createBatchResponse.statusCode).toBe(400);
    expect(createBatchResponse.json()).toMatchObject({
      success: false,
      error_code: "VALIDATION_ERROR",
    });
    expect(sheetResponse.statusCode).toBe(400);
    expect(sheetResponse.json()).toMatchObject({
      success: false,
      error_code: "VALIDATION_ERROR",
    });
  });
});
