import { describe, expect, it, vi } from "vitest";

import { CatalogService } from "../apps/backend/src/modules/catalog/module.service";

describe("CatalogService default brand handling", () => {
  it("creates products with a tenant default brand when no brand is provided", async () => {
    const repository = {
      findDefaultBrandForTenant: vi.fn().mockResolvedValue(null),
      createDefaultBrandForTenant: vi.fn().mockResolvedValue({
        id: "default-brand",
        name: "General",
        updated_at: "2026-03-28T00:00:00.000Z",
      }),
      createTenantProducts: vi.fn().mockImplementation(async (_tenantId: string, products: Array<Record<string, unknown>>) =>
        products.map((product, index) => ({
          id: `product-${index + 1}`,
          brand_id: product.brandId,
          name: product.productName,
          pack_size: product.variantPackSize,
          base_price: product.baseSellingPrice,
          advance_price: product.baseSellingPrice,
        })),
      ),
    };

    const service = new CatalogService(repository as any);

    await service.createProducts("tenant-1", [
      {
        productName: "Tea",
        variantPackSize: "500g",
        baseSellingPrice: 120,
        mrp: 130,
        openingStock: 20,
        isActive: true,
      },
    ]);

    expect(repository.createDefaultBrandForTenant).toHaveBeenCalledWith("tenant-1", "General");
    expect(repository.createTenantProducts).toHaveBeenCalledWith(
      "tenant-1",
      expect.arrayContaining([
        expect.objectContaining({
          brandId: "default-brand",
          productName: "Tea",
        }),
      ]),
    );
  });

  it("reuses the existing tenant default brand instead of creating duplicates", async () => {
    const repository = {
      findDefaultBrandForTenant: vi.fn().mockResolvedValue({
        id: "default-brand",
        name: "General",
        updated_at: "2026-03-28T00:00:00.000Z",
      }),
      createDefaultBrandForTenant: vi.fn(),
      createTenantProducts: vi.fn().mockResolvedValue([]),
    };

    const service = new CatalogService(repository as any);

    await service.createProducts("tenant-1", [
      {
        productName: "Sugar",
        variantPackSize: "1kg",
        baseSellingPrice: 45,
        mrp: 50,
        openingStock: 12,
        isActive: true,
      },
    ]);

    expect(repository.findDefaultBrandForTenant).toHaveBeenCalledWith("tenant-1");
    expect(repository.createDefaultBrandForTenant).not.toHaveBeenCalled();
    expect(repository.createTenantProducts).toHaveBeenCalledWith(
      "tenant-1",
      expect.arrayContaining([
        expect.objectContaining({
          brandId: "default-brand",
          productName: "Sugar",
        }),
      ]),
    );
  });
});
