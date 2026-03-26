import type { FastifyInstance } from "fastify";

import { buildAuthMiddleware } from "../../shared/middleware/authenticate";
import { DistributorController } from "./module.controller";

export const registerDistributorRoutes = async (fastify: FastifyInstance) => {
  const controller = new DistributorController();
  const authenticate = buildAuthMiddleware();

  fastify.get("/distributors/home", { preHandler: authenticate }, controller.getRetailerHome.bind(controller));
};
