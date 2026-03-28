import type { FastifyInstance } from "fastify";

import { buildAuthMiddleware, buildOptionalAuthMiddleware } from "../../shared/middleware/authenticate";
import { CatalogController } from "./module.controller";

export const registerCatalogRoutes = async (fastify: FastifyInstance) => {
  const controller = new CatalogController();
  const authenticate = buildAuthMiddleware();
  const optionalAuth = buildOptionalAuthMiddleware();

  fastify.get("/catalogue/brands", { preHandler: optionalAuth }, controller.getBrands.bind(controller));
  fastify.post("/catalogue/brands", { preHandler: authenticate }, controller.createBrand.bind(controller));
  fastify.get<{ Params: { brandId: string } }>(
    "/catalogue/brands/:brandId/products",
    { preHandler: optionalAuth },
    controller.getProductsByBrand.bind(controller),
  );
  fastify.post("/catalogue/products", controller.createProducts.bind(controller));
  fastify.get("/catalogue/search", { preHandler: optionalAuth }, controller.searchProducts.bind(controller));
  fastify.get<{ Params: { productId: string } }>(
    "/catalogue/products/:productId",
    { preHandler: optionalAuth },
    controller.getProduct.bind(controller),
  );
  fastify.post("/catalogue/stock/batch", controller.getStockBatch.bind(controller));
  fastify.post("/brands", { preHandler: authenticate }, controller.createBrand.bind(controller));

  fastify.get("/catalog/brands", { preHandler: optionalAuth }, controller.getBrands.bind(controller));
  fastify.get<{ Params: { brandId: string } }>(
    "/catalog/brands/:brandId/products",
    { preHandler: optionalAuth },
    controller.getProductsByBrand.bind(controller),
  );
};
