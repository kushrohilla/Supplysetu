import fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AppContainer } from "../apps/backend/src/core/config/container";
import { registerInviteRoutes } from "../apps/backend/src/modules/invite/invite.routes";
import { errorHandler } from "../apps/backend/src/shared/middleware/error-handler";

const createContainer = () =>
  ({
    authService: {
      verifyAccessToken: vi.fn(),
    },
    inviteService: {
      createInvite: vi.fn(),
      validateInvite: vi.fn(),
      acceptInvite: vi.fn(),
    },
  }) as unknown as AppContainer;

describe("invite routes", () => {
  beforeEach(() => {
    process.env.INVITE_BASE_URL = "http://localhost:3000";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates an invite link using tenantId from admin auth only", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const inviteService = container.inviteService as unknown as { createInvite: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
      role: "distributor_admin",
    });
    inviteService.createInvite.mockResolvedValue({
      invite_link: "http://localhost:3000/invite?token=token-123",
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerInviteRoutes(app);

    const response = await app.inject({
      method: "POST",
      url: "/invites",
      headers: {
        authorization: "Bearer admin-token",
      },
      payload: {
        tenant_id: "tenant-2",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(inviteService.createInvite).toHaveBeenCalledWith("tenant-1");
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        invite_link: "http://localhost:3000/invite?token=token-123",
      },
    });
  });

  it("returns invite validation data without exposing tenant details", async () => {
    const container = createContainer();
    const inviteService = container.inviteService as unknown as { validateInvite: ReturnType<typeof vi.fn> };

    inviteService.validateInvite.mockResolvedValue({
      valid: true,
      distributor: {
        name: "General Supplies",
      },
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerInviteRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: "/invites/token-123",
    });

    expect(response.statusCode).toBe(200);
    expect(inviteService.validateInvite).toHaveBeenCalledWith("token-123");
    expect(response.json()).toEqual({
      success: true,
      data: {
        valid: true,
        distributor: {
          name: "General Supplies",
        },
      },
    });
  });

  it("returns valid false for invalid invite tokens", async () => {
    const container = createContainer();
    const inviteService = container.inviteService as unknown as { validateInvite: ReturnType<typeof vi.fn> };

    inviteService.validateInvite.mockResolvedValue({
      valid: false,
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerInviteRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: "/invites/token-404",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      success: true,
      data: {
        valid: false,
      },
    });
  });

  it("accepts an invite using retailer identity from JWT only", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const inviteService = container.inviteService as unknown as { acceptInvite: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      retailerId: "retailer-1",
      tokenType: "retailer",
    });
    inviteService.acceptInvite.mockResolvedValue({
      message: "Distributor invite accepted successfully",
    });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerInviteRoutes(app);

    const response = await app.inject({
      method: "POST",
      url: "/invites/accept",
      headers: {
        authorization: "Bearer retailer-token",
      },
      payload: {
        token: "token-123",
        retailer_id: "retailer-2",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(inviteService.acceptInvite).toHaveBeenCalledWith("retailer-1", "token-123");
    expect(response.json()).toEqual({
      success: true,
      data: {
        message: "Distributor invite accepted successfully",
      },
    });
  });
});
