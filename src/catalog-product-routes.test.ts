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
      createProducts: vi.fn(),
    },
  }) as unknown as AppContainer;

describe("catalog product routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts POST /catalogue/products payloads without a brandId", async () => {
    const container = createContainer();
    const catalogService = container.catalogService as unknown as { createProducts: ReturnType<typeof vi.fn> };

    catalogService.createProducts.mockResolvedValue([
      {
        id: "product-1",
        brandId: "default-brand",
        productName: "Tea",
        variantPackSize: "500g",
        baseSellingPrice: 120,
        mrp: 120,
        openingStock: 20,
        isActive: true,
        imageUrl: null,
        createdAt: "2026-03-28T00:00:00.000Z",
      },
    ]);

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerCatalogRoutes(app);

    const response = await app.inject({
      method: "POST",
      url: "/catalogue/products",
      payload: {
        tenant_id: "tenant-1",
        products: [
          {
            productName: "Tea",
            variantPackSize: "500g",
            baseSellingPrice: 120,
            mrp: 130,
            openingStock: 20,
            isActive: true,
          },
        ],
      },
    });

    expect(response.statusCode).toBe(201);
    expect(catalogService.createProducts).toHaveBeenCalledWith(
      "tenant-1",
      expect.arrayContaining([
        expect.objectContaining({
          productName: "Tea",
          variantPackSize: "500g",
        }),
      ]),
    );

    await app.close();
  });
});
