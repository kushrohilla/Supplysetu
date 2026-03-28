import fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AppContainer } from "../apps/backend/src/core/config/container";
import { errorHandler } from "../apps/backend/src/shared/middleware/error-handler";
import { registerCatalogRoutes } from "../apps/backend/src/modules/catalog/module.routes";

const createContainer = () =>
  ({
    authService: {
      verifyAccessToken: vi.fn(),
    },
    catalogService: {
      createBrand: vi.fn(),
    },
  }) as unknown as AppContainer;

describe("catalog brand routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects unauthenticated POST /brands requests", async () => {
    const app = fastify();
    app.decorate("container", createContainer());
    app.setErrorHandler(errorHandler);
    await registerCatalogRoutes(app);

    const response = await app.inject({
      method: "POST",
      url: "/brands",
      payload: {
        name: "Amul",
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      success: false,
      error_code: "UNAUTHORIZED",
    });

    await app.close();
  });

  it("creates a brand through POST /brands for authenticated requests", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const catalogService = container.catalogService as unknown as { createBrand: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({ tokenType: "admin" });
    catalogService.createBrand.mockResolvedValue({
      id: "brand-1",
      name: "Amul",
      totalProductCount: 0,
      skuCount: 0,
      updatedAt: "2026-03-28T00:00:00.000Z",
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerCatalogRoutes(app);

    const response = await app.inject({
      method: "POST",
      url: "/brands",
      headers: {
        authorization: "Bearer admin-token",
      },
      payload: {
        name: "Amul",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(catalogService.createBrand).toHaveBeenCalledWith("Amul", undefined);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        id: "brand-1",
        name: "Amul",
      },
    });

    await app.close();
  });

  it("returns validation errors for invalid POST /brands payloads", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    authService.verifyAccessToken.mockReturnValue({ tokenType: "admin" });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerCatalogRoutes(app);

    const response = await app.inject({
      method: "POST",
      url: "/brands",
      headers: {
        authorization: "Bearer admin-token",
      },
      payload: {
        name: "",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error_code: "VALIDATION_ERROR",
    });

    await app.close();
  });
});
