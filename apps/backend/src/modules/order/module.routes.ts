import type { FastifyInstance } from "fastify";

import { buildAuthMiddleware } from "../../shared/middleware/authenticate";
import { OrderController } from "./module.controller";

export const registerOrderRoutes = async (fastify: FastifyInstance) => {
  const controller = new OrderController();
  const authenticate = buildAuthMiddleware();

  fastify.post("/orders/create", { preHandler: authenticate }, controller.createOrder.bind(controller));
  fastify.get("/orders/list", { preHandler: authenticate }, controller.listOrders.bind(controller));
  fastify.get<{ Params: { orderId: string } }>("/orders/:orderId", { preHandler: authenticate }, controller.getOrder.bind(controller));
  fastify.get("/orders/quick-reorder", { preHandler: authenticate }, controller.getQuickReorder.bind(controller));
  fastify.patch<{ Params: { orderId: string } }>("/orders/:orderId/status", controller.updateStatus.bind(controller));
};
