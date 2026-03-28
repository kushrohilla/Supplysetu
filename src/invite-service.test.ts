import { beforeEach, describe, expect, it, vi } from "vitest";

import { InviteService } from "../apps/backend/src/modules/invite/invite.service";

describe("InviteService", () => {
  beforeEach(() => {
    process.env.INVITE_BASE_URL = "http://localhost:3000";
  });

  it("generates a secure invite and returns a public invite link", async () => {
    const repository = {
      createInvite: vi.fn().mockResolvedValue({
        id: "invite-1",
        tenant_id: "tenant-1",
        invite_token: "secure-token",
        expires_at: "2026-03-29T00:00:00.000Z",
        is_used: false,
        created_at: "2026-03-28T00:00:00.000Z",
      }),
    };

    const service = new InviteService(repository as never);
    const result = await service.createInvite("tenant-1");

    expect(repository.createInvite).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: "tenant-1",
        invite_token: expect.any(String),
        is_used: false,
      }),
    );
    expect(result).toEqual({
      invite_link: "http://localhost:3000/invite?token=secure-token",
    });
  });

  it("returns valid false when the invite does not exist", async () => {
    const repository = {
      getInviteByToken: vi.fn().mockResolvedValue(null),
    };

    const service = new InviteService(repository as never);
    await expect(service.validateInvite("missing-token")).resolves.toEqual({
      valid: false,
    });
  });

  it("returns valid false when the invite is expired or already used", async () => {
    const repository = {
      getInviteByToken: vi
        .fn()
        .mockResolvedValueOnce({
          id: "invite-1",
          tenant_id: "tenant-1",
          invite_token: "expired-token",
          expires_at: "2026-03-27T00:00:00.000Z",
          is_used: false,
          created_at: "2026-03-26T00:00:00.000Z",
          distributor_name: "General Supplies",
        })
        .mockResolvedValueOnce({
          id: "invite-2",
          tenant_id: "tenant-1",
          invite_token: "used-token",
          expires_at: "2026-03-29T00:00:00.000Z",
          is_used: true,
          created_at: "2026-03-28T00:00:00.000Z",
          distributor_name: "General Supplies",
        }),
    };

    const service = new InviteService(repository as never);

    await expect(service.validateInvite("expired-token")).resolves.toEqual({ valid: false });
    await expect(service.validateInvite("used-token")).resolves.toEqual({ valid: false });
  });

  it("accepts a valid invite, creates the retailer link once, and marks the invite as used", async () => {
    const repository = {
      getInviteByToken: vi.fn().mockResolvedValue({
        id: "invite-1",
        tenant_id: "tenant-1",
        invite_token: "valid-token",
        expires_at: "2026-03-29T00:00:00.000Z",
        is_used: false,
        created_at: "2026-03-28T00:00:00.000Z",
        distributor_name: "General Supplies",
      }),
      getRetailerDistributorLink: vi.fn().mockResolvedValue(null),
      createRetailerDistributorLink: vi.fn().mockResolvedValue({
        id: "link-1",
      }),
      markInviteUsed: vi.fn().mockResolvedValue(undefined),
    };

    const service = new InviteService(repository as never);
    const result = await service.acceptInvite("retailer-1", "valid-token");

    expect(repository.getRetailerDistributorLink).toHaveBeenCalledWith("retailer-1", "tenant-1");
    expect(repository.createRetailerDistributorLink).toHaveBeenCalledWith("retailer-1", "tenant-1");
    expect(repository.markInviteUsed).toHaveBeenCalledWith("invite-1");
    expect(result).toEqual({
      message: "Distributor invite accepted successfully",
    });
  });

  it("prevents invite reuse after it has been accepted", async () => {
    const repository = {
      getInviteByToken: vi.fn().mockResolvedValue({
        id: "invite-1",
        tenant_id: "tenant-1",
        invite_token: "used-token",
        expires_at: "2026-03-29T00:00:00.000Z",
        is_used: true,
        created_at: "2026-03-28T00:00:00.000Z",
        distributor_name: "General Supplies",
      }),
    };

    const service = new InviteService(repository as never);

    await expect(service.acceptInvite("retailer-1", "used-token")).rejects.toMatchObject({
      code: "INVITE_NOT_FOUND",
    });
  });
});
