import type { FastifyInstance } from "fastify";

import { buildAuthMiddleware } from "../../shared/middleware/authenticate";
import { InventoryController } from "./module.controller";

export const registerInventoryRoutes = async (fastify: FastifyInstance) => {
  const controller = new InventoryController();
  const authenticate = buildAuthMiddleware();

  fastify.get("/admin/inventory", { preHandler: authenticate }, controller.listAdminInventory.bind(controller));
  fastify.get("/admin/inventory/low-stock", { preHandler: authenticate }, controller.listLowStockInventory.bind(controller));
  fastify.post("/admin/inventory/sync", { preHandler: authenticate }, controller.syncInventory.bind(controller));
  fastify.patch<{ Params: { productId: string } }>(
    "/admin/inventory/:productId",
    { preHandler: authenticate },
    controller.updateInventoryItem.bind(controller),
  );

  fastify.get("/inventory/stock", controller.getStock.bind(controller));
};
