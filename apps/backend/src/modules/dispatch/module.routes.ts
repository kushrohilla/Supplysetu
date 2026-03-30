import type { FastifyInstance } from "fastify";

import { buildAuthMiddleware } from "../../shared/middleware/authenticate";
import { DispatchController } from "./module.controller";

export const registerDispatchRoutes = async (fastify: FastifyInstance) => {
  const controller = new DispatchController();
  const authenticate = buildAuthMiddleware();

  fastify.post("/admin/routes", { preHandler: authenticate }, controller.createRoute.bind(controller));
  fastify.get("/admin/routes", { preHandler: authenticate }, controller.listRoutes.bind(controller));
  fastify.post<{ Params: { id: string } }>(
    "/admin/routes/:id/retailers",
    { preHandler: authenticate },
    controller.assignRouteRetailers.bind(controller),
  );

  fastify.post("/admin/dispatch/batches", { preHandler: authenticate }, controller.createBatch.bind(controller));
  fastify.get("/admin/dispatch/batches", { preHandler: authenticate }, controller.listBatches.bind(controller));
  fastify.get<{ Params: { id: string } }>(
    "/admin/dispatch/batches/:id/sheet",
    { preHandler: authenticate },
    controller.getBatchSheet.bind(controller),
  );
  fastify.patch<{ Params: { id: string } }>(
    "/admin/dispatch/batches/:id/dispatch",
    { preHandler: authenticate },
    controller.dispatchBatch.bind(controller),
  );
  fastify.patch<{ Params: { orderId: string } }>(
    "/admin/orders/:orderId/deliver",
    { preHandler: authenticate },
    controller.deliverOrder.bind(controller),
  );
};
