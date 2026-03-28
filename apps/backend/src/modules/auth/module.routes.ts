import type { FastifyInstance } from "fastify";

import { buildAuthMiddleware } from "../../shared/middleware/authenticate";
import { AuthController } from "./module.controller";

export const registerAuthRoutes = async (fastify: FastifyInstance) => {
  const controller = new AuthController();
  const authenticate = buildAuthMiddleware();

  fastify.post("/auth/login", controller.login.bind(controller));
  fastify.post("/auth/register", controller.registerDistributor.bind(controller));
  fastify.post("/auth/verify", controller.verifyOtp.bind(controller));
  fastify.post("/auth/refresh", controller.refreshToken.bind(controller));
  fastify.get("/auth/distributors", { preHandler: authenticate }, controller.getDistributors.bind(controller));
  fastify.post("/auth/select-distributor", { preHandler: authenticate }, controller.selectDistributor.bind(controller));
  fastify.post("/auth/profile", { preHandler: authenticate }, controller.updateProfile.bind(controller));
};
