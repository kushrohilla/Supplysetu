import fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AppContainer } from "../apps/backend/src/core/config/container";
import { registerRetailerRoutes } from "../apps/backend/src/modules/retailer/retailer.routes";
import { HTTP_STATUS } from "../apps/backend/src/shared/constants/http-status";
import { AppError } from "../apps/backend/src/shared/errors/app-error";
import { errorHandler } from "../apps/backend/src/shared/middleware/error-handler";

const createContainer = () =>
  ({
    authService: {
      verifyAccessToken: vi.fn(),
    },
    retailerService: {
      createRetailer: vi.fn(),
      listRetailers: vi.fn(),
      getRetailer: vi.fn(),
      updateRetailer: vi.fn(),
      softDeleteRetailer: vi.fn(),
    },
  }) as unknown as AppContainer;

describe("retailer routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a retailer using tenantId from auth", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const retailerService = container.retailerService as unknown as { createRetailer: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
      role: "distributor_admin",
    });
    retailerService.createRetailer.mockResolvedValue({
      id: "retailer-1",
      tenant_id: "tenant-1",
      name: "Shop 1",
      mobile_number: "9999999999",
      is_active: true,
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerRetailerRoutes(app);

    const response = await app.inject({
      method: "POST",
      url: "/retailers",
      headers: { authorization: "Bearer admin-token" },
      payload: {
        name: "Shop 1",
        mobile_number: "9999999999",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(retailerService.createRetailer).toHaveBeenCalledWith("tenant-1", {
      name: "Shop 1",
      mobile_number: "9999999999",
    });
  });

  it("lists retailers for the authenticated tenant", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const retailerService = container.retailerService as unknown as { listRetailers: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
      role: "distributor_admin",
    });
    retailerService.listRetailers.mockResolvedValue([{ id: "retailer-1", name: "Shop 1" }]);

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerRetailerRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: "/retailers",
      headers: { authorization: "Bearer admin-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(retailerService.listRetailers).toHaveBeenCalledWith("tenant-1");
    expect(response.json()).toMatchObject({
      success: true,
      data: [{ id: "retailer-1", name: "Shop 1" }],
    });
  });

  it("gets a single retailer for the authenticated tenant", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const retailerService = container.retailerService as unknown as { getRetailer: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
      role: "distributor_admin",
    });
    retailerService.getRetailer.mockResolvedValue({ id: "retailer-1", name: "Shop 1" });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerRetailerRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: "/retailers/retailer-1",
      headers: { authorization: "Bearer admin-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(retailerService.getRetailer).toHaveBeenCalledWith("tenant-1", "retailer-1");
  });

  it("updates a retailer for the authenticated tenant", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const retailerService = container.retailerService as unknown as { updateRetailer: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
      role: "distributor_admin",
    });
    retailerService.updateRetailer.mockResolvedValue({ id: "retailer-1", name: "Updated Shop" });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerRetailerRoutes(app);

    const response = await app.inject({
      method: "PATCH",
      url: "/retailers/retailer-1",
      headers: { authorization: "Bearer admin-token" },
      payload: {
        name: "Updated Shop",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(retailerService.updateRetailer).toHaveBeenCalledWith("tenant-1", "retailer-1", {
      name: "Updated Shop",
    });
  });

  it("soft deletes a retailer for the authenticated tenant", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const retailerService = container.retailerService as unknown as { softDeleteRetailer: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
      role: "distributor_admin",
    });
    retailerService.softDeleteRetailer.mockResolvedValue({ id: "retailer-1", is_active: false });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerRetailerRoutes(app);

    const response = await app.inject({
      method: "DELETE",
      url: "/retailers/retailer-1",
      headers: { authorization: "Bearer admin-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(retailerService.softDeleteRetailer).toHaveBeenCalledWith("tenant-1", "retailer-1");
    expect(response.json()).toMatchObject({
      success: true,
      data: { id: "retailer-1", is_active: false },
    });
  });

  it("rejects invalid retailer creation payloads", async () => {
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
    await registerRetailerRoutes(app);

    const response = await app.inject({
      method: "POST",
      url: "/retailers",
      headers: { authorization: "Bearer admin-token" },
      payload: {
        name: "",
        mobile_number: "",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error_code: "VALIDATION_ERROR",
    });
  });

  it("rejects tenant_id in the retailer creation payload", async () => {
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
    await registerRetailerRoutes(app);

    const response = await app.inject({
      method: "POST",
      url: "/retailers",
      headers: { authorization: "Bearer admin-token" },
      payload: {
        tenant_id: "tenant-2",
        name: "Shop 1",
        mobile_number: "9999999999",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error_code: "VALIDATION_ERROR",
    });
  });

  it("returns 404 when a tenant requests another tenant's retailer", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const retailerService = container.retailerService as unknown as { getRetailer: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-a",
      tokenType: "admin",
      role: "distributor_admin",
    });
    retailerService.getRetailer.mockRejectedValue(
      new AppError(HTTP_STATUS.NOT_FOUND, "RETAILER_NOT_FOUND", "Retailer not found"),
    );

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerRetailerRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: "/retailers/retailer-b",
      headers: { authorization: "Bearer admin-token" },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      success: false,
      error_code: "RETAILER_NOT_FOUND",
    });
  });
});
