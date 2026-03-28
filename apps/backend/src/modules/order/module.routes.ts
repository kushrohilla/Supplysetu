import type { FastifyInstance } from "fastify";

import { buildAuthMiddleware } from "../../shared/middleware/authenticate";
import { OrderController } from "./module.controller";

export const registerOrderRoutes = async (fastify: FastifyInstance) => {
  const controller = new OrderController();
  const authenticate = buildAuthMiddleware();

  fastify.post("/orders", { preHandler: authenticate }, controller.createOrder.bind(controller));
  fastify.get("/orders", { preHandler: authenticate }, controller.listOrders.bind(controller));
  fastify.get<{ Params: { id: string } }>("/orders/:id", { preHandler: authenticate }, controller.getOrder.bind(controller));
  fastify.patch<{ Params: { id: string } }>("/orders/:id/status", { preHandler: authenticate }, controller.updateStatus.bind(controller));
};
