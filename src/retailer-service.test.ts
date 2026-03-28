import { describe, expect, it, vi } from "vitest";

import { RetailerService } from "../apps/backend/src/modules/retailer/retailer.service";

describe("RetailerService", () => {
  it("rejects duplicate mobile numbers within the same tenant", async () => {
    const repository = {
      findByMobileNumber: vi.fn().mockResolvedValue({
        id: "retailer-1",
        tenant_id: "tenant-1",
        mobile_number: "9999999999",
      }),
    };

    const service = new RetailerService(repository as never);

    await expect(
      service.createRetailer("tenant-1", {
        name: "Shop 2",
        mobile_number: "9999999999",
      }),
    ).rejects.toMatchObject({
      code: "RETAILER_MOBILE_NUMBER_EXISTS",
    });
    expect(repository.findByMobileNumber).toHaveBeenCalledWith("tenant-1", "9999999999");
  });

  it("throws when a tenant tries to fetch a retailer from another tenant", async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue(null),
    };

    const service = new RetailerService(repository as never);

    await expect(service.getRetailer("tenant-1", "retailer-2")).rejects.toMatchObject({
      code: "RETAILER_NOT_FOUND",
    });
    expect(repository.findById).toHaveBeenCalledWith("tenant-1", "retailer-2");
  });

  it("soft deletes a retailer through the tenant-scoped repository", async () => {
    const repository = {
      softDelete: vi.fn().mockResolvedValue({
        id: "retailer-1",
        tenant_id: "tenant-1",
        is_active: false,
      }),
    };

    const service = new RetailerService(repository as never);
    const result = await service.softDeleteRetailer("tenant-1", "retailer-1");

    expect(repository.softDelete).toHaveBeenCalledWith("tenant-1", "retailer-1");
    expect(result).toMatchObject({
      id: "retailer-1",
      is_active: false,
    });
  });
});
