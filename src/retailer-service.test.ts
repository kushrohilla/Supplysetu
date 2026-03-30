import { describe, expect, it, vi } from "vitest";

import { HTTP_STATUS } from "../apps/backend/src/shared/constants/http-status";
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

  it("lists admin retailers through the tenant-scoped repository with pagination", async () => {
    const repository = {
      listAdminRetailers: vi.fn().mockResolvedValue({
        items: [{ id: "retailer-1", total_orders: 2, total_value: 30500 }],
        pagination: { page: 1, limit: 10, total: 1, total_pages: 1 },
      }),
    };

    const service = new RetailerService(repository as never);
    const result = await service.listAdminRetailers("tenant-1", {
      search: "shop",
      page: 1,
      limit: 10,
    });

    expect(repository.listAdminRetailers).toHaveBeenCalledWith("tenant-1", {
      search: "shop",
      page: 1,
      limit: 10,
    });
    expect(result).toMatchObject({
      items: [{ id: "retailer-1", total_value: 30500 }],
      pagination: { total: 1 },
    });
  });

  it("returns admin retailer detail for a linked retailer", async () => {
    const repository = {
      findAdminRetailerDetailById: vi.fn().mockResolvedValue({
        retailer: { id: "retailer-1", name: "Shop 1" },
        summary: { total_orders: 4, total_value: 120000 },
        recent_orders: [{ id: "order-1", order_number: "ORD-000001" }],
      }),
    };

    const service = new RetailerService(repository as never);
    const result = await service.getAdminRetailerDetail("tenant-1", "retailer-1");

    expect(repository.findAdminRetailerDetailById).toHaveBeenCalledWith("tenant-1", "retailer-1");
    expect(result).toMatchObject({
      retailer: { id: "retailer-1" },
      summary: { total_value: 120000 },
      recent_orders: [{ id: "order-1" }],
    });
  });

  it("throws when admin retailer detail is requested for an unlinked retailer", async () => {
    const repository = {
      findAdminRetailerDetailById: vi.fn().mockResolvedValue(null),
    };

    const service = new RetailerService(repository as never);

    await expect(service.getAdminRetailerDetail("tenant-1", "retailer-2")).rejects.toMatchObject({
      code: "RETAILER_NOT_FOUND",
      statusCode: HTTP_STATUS.NOT_FOUND,
    });
  });
});
