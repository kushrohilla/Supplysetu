import type { FastifyInstance } from "fastify";

import { buildAuthMiddleware } from "../../shared/middleware/authenticate";
import { NotificationsController } from "./module.controller";

export const registerNotificationsRoutes = async (fastify: FastifyInstance) => {
  const controller = new NotificationsController();
  const authenticate = buildAuthMiddleware();

  fastify.get("/admin/notifications/log", { preHandler: authenticate }, controller.listLog.bind(controller));
  fastify.get<{ Params: { id: string } }>(
    "/admin/notifications/log/:id",
    { preHandler: authenticate },
    controller.getLogById.bind(controller),
  );
  fastify.get(
    "/notifications/in-app/latest",
    { preHandler: authenticate },
    controller.getLatestRetailerInAppNotification.bind(controller),
  );
};
