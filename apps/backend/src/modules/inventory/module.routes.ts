import type { FastifyInstance } from "fastify";

import { InventoryController } from "./module.controller";

export const registerInventoryRoutes = async (fastify: FastifyInstance) => {
  const controller = new InventoryController();
  fastify.get("/inventory/stock", controller.getStock.bind(controller));
};
