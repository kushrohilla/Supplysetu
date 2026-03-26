import type { FastifyInstance } from "fastify";

import { PricingController } from "./module.controller";

export const registerPricingRoutes = async (fastify: FastifyInstance) => {
  const controller = new PricingController();
  fastify.get("/pricing/health", controller.health.bind(controller));
};
