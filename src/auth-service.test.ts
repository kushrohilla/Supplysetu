import { describe, expect, it, vi } from "vitest";

import { HTTP_STATUS } from "../apps/backend/src/shared/constants/http-status";
import { AuthService } from "../apps/backend/src/modules/auth/module.service";

describe("AuthService", () => {
  it("issues a tenant-scoped retailer token after distributor selection", async () => {
    const retailerRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "retailer-1",
        phone: "9999999999",
        name: "Retail Shop",
      }),
    };
    const distributorRepository = {
      assertRetailerTenantLink: vi.fn().mockResolvedValue({
        retailer_id: "retailer-1",
        tenant_id: "tenant-1",
      }),
    };

    const service = new AuthService({} as never, retailerRepository as never, distributorRepository as never);

    const result = await (service as any).selectDistributor("retailer-1", "tenant-1");
    const decoded = service.verifyAccessToken(result.accessToken);

    expect(distributorRepository.assertRetailerTenantLink).toHaveBeenCalledWith("retailer-1", "tenant-1");
    expect(decoded).toMatchObject({
      retailerId: "retailer-1",
      tenantId: "tenant-1",
      tokenType: "retailer",
    });
  });

  it("rejects distributor selection when the retailer is not linked to the tenant", async () => {
    const retailerRepository = {
      findById: vi.fn(),
    };
    const distributorRepository = {
      assertRetailerTenantLink: vi.fn().mockResolvedValue(null),
    };

    const service = new AuthService({} as never, retailerRepository as never, distributorRepository as never);

    await expect((service as any).selectDistributor("retailer-1", "tenant-2")).rejects.toMatchObject({
      statusCode: HTTP_STATUS.NOT_FOUND,
      code: "DISTRIBUTOR_NOT_FOUND",
    });
  });
});
