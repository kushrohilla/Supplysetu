import type { FastifyInstance } from "fastify";

import { CatalogController } from "./module.controller";

export const registerCatalogRoutes = async (fastify: FastifyInstance) => {
  const controller = new CatalogController();

  fastify.get("/catalogue/brands", controller.getBrands.bind(controller));
  fastify.get("/catalogue/brands/:brandId/products", controller.getProductsByBrand.bind(controller));
  fastify.get("/catalogue/search", controller.searchProducts.bind(controller));
  fastify.get("/catalogue/products/:productId", controller.getProduct.bind(controller));
  fastify.post("/catalogue/stock/batch", controller.getStockBatch.bind(controller));

  fastify.get("/catalog/brands", controller.getBrands.bind(controller));
  fastify.get("/catalog/brands/:brandId/products", controller.getProductsByBrand.bind(controller));
};
