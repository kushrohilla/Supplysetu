import type { FastifyInstance } from "fastify";

import { buildAuthMiddleware } from "../../shared/middleware/authenticate";
import { ReportingController } from "./module.controller";

export const registerReportingRoutes = async (fastify: FastifyInstance) => {
  const controller = new ReportingController();
  const authenticate = buildAuthMiddleware();

  fastify.get("/admin/reports/summary", { preHandler: authenticate }, controller.getSummary.bind(controller));
  fastify.get("/admin/reports/orders-trend", { preHandler: authenticate }, controller.getOrdersTrend.bind(controller));
  fastify.get("/admin/reports/retailers", { preHandler: authenticate }, controller.getRetailers.bind(controller));
  fastify.get("/admin/reports/route-performance", { preHandler: authenticate }, controller.getRoutePerformance.bind(controller));
};
