import type { FastifyInstance } from "fastify";

import { buildAuthMiddleware } from "../../shared/middleware/authenticate";
import { RetailerController } from "./retailer.controller";

export const registerRetailerRoutes = async (fastify: FastifyInstance) => {
  const controller = new RetailerController();
  const authenticate = buildAuthMiddleware();

  fastify.get("/admin/retailers", { preHandler: authenticate }, controller.listAdminRetailers.bind(controller));
  fastify.get<{ Params: { id: string } }>(
    "/admin/retailers/:id",
    { preHandler: authenticate },
    controller.getAdminRetailer.bind(controller),
  );
  fastify.post("/retailers", { preHandler: authenticate }, controller.createRetailer.bind(controller));
  fastify.get("/retailers", { preHandler: authenticate }, controller.listRetailers.bind(controller));
  fastify.get<{ Params: { id: string } }>("/retailers/:id", { preHandler: authenticate }, controller.getRetailer.bind(controller));
  fastify.patch<{ Params: { id: string } }>("/retailers/:id", { preHandler: authenticate }, controller.updateRetailer.bind(controller));
  fastify.delete<{ Params: { id: string } }>("/retailers/:id", { preHandler: authenticate }, controller.deleteRetailer.bind(controller));
};
