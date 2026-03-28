import fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AppContainer } from "../apps/backend/src/core/config/container";
import { registerAuthRoutes } from "../apps/backend/src/modules/auth/module.routes";
import { errorHandler } from "../apps/backend/src/shared/middleware/error-handler";

const createContainer = () =>
  ({
    authService: {
      verifyAccessToken: vi.fn(),
      selectDistributor: vi.fn(),
    },
    distributorService: {
      listDistributors: vi.fn(),
    },
  }) as unknown as AppContainer;

describe("auth routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists linked distributors for authenticated retailers", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const distributorService = container.distributorService as unknown as { listDistributors: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      retailerId: "retailer-1",
      tokenType: "retailer",
    });
    distributorService.listDistributors.mockResolvedValue([
      {
        id: "tenant-1",
        name: "General Supplies",
      },
    ]);

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerAuthRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: "/auth/distributors",
      headers: {
        authorization: "Bearer retailer-token",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(distributorService.listDistributors).toHaveBeenCalledWith("retailer-1");
    expect(response.json()).toMatchObject({
      success: true,
      data: [
        {
          id: "tenant-1",
          name: "General Supplies",
        },
      ],
    });
  });

  it("selects a linked distributor using the authenticated retailer identity", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as {
      verifyAccessToken: ReturnType<typeof vi.fn>;
      selectDistributor: ReturnType<typeof vi.fn>;
    };

    authService.verifyAccessToken.mockReturnValue({
      retailerId: "retailer-1",
      tokenType: "retailer",
    });
    authService.selectDistributor.mockResolvedValue({
      accessToken: "selected-token",
      refreshToken: "selected-refresh-token",
      expiresInSeconds: 86400,
      tenantId: "tenant-1",
      retailerId: "retailer-1",
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerAuthRoutes(app);

    const response = await app.inject({
      method: "POST",
      url: "/auth/select-distributor",
      headers: {
        authorization: "Bearer retailer-token",
      },
      payload: {
        distributor_id: "tenant-1",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(authService.selectDistributor).toHaveBeenCalledWith("retailer-1", "tenant-1");
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        access_token: "selected-token",
        refresh_token: "selected-refresh-token",
        expires_in: 86400,
        token_type: "Bearer",
        tenant_id: "tenant-1",
        retailer_id: "retailer-1",
      },
    });
  });
});
