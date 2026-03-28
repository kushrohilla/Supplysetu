import type { FastifyInstance } from "fastify";

import { buildAuthMiddleware } from "../../shared/middleware/authenticate";
import { CatalogController } from "./module.controller";

export const registerCatalogRoutes = async (fastify: FastifyInstance) => {
  const controller = new CatalogController();
  const authenticate = buildAuthMiddleware();

  fastify.get("/catalogue/brands", controller.getBrands.bind(controller));
  fastify.post("/catalogue/brands", { preHandler: authenticate }, controller.createBrand.bind(controller));
  fastify.get("/catalogue/brands/:brandId/products", controller.getProductsByBrand.bind(controller));
  fastify.post("/catalogue/products", controller.createProducts.bind(controller));
  fastify.get("/catalogue/search", controller.searchProducts.bind(controller));
  fastify.get("/catalogue/products/:productId", controller.getProduct.bind(controller));
  fastify.post("/catalogue/stock/batch", controller.getStockBatch.bind(controller));
  fastify.post("/brands", { preHandler: authenticate }, controller.createBrand.bind(controller));

  fastify.get("/catalog/brands", controller.getBrands.bind(controller));
  fastify.get("/catalog/brands/:brandId/products", controller.getProductsByBrand.bind(controller));
};
