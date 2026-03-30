import type { FastifyInstance } from "fastify";

import { buildAuthMiddleware } from "../../shared/middleware/authenticate";
import { PaymentsController } from "./module.controller";

export const registerPaymentsRoutes = async (fastify: FastifyInstance) => {
  const controller = new PaymentsController();
  const authenticate = buildAuthMiddleware();

  fastify.post("/admin/payments", { preHandler: authenticate }, controller.recordPayment.bind(controller));
  fastify.get("/admin/payments", { preHandler: authenticate }, controller.listPayments.bind(controller));
  fastify.get<{ Params: { id: string } }>(
    "/admin/retailers/:id/credit-summary",
    { preHandler: authenticate },
    controller.getRetailerCreditSummary.bind(controller),
  );
  fastify.patch<{ Params: { id: string } }>(
    "/admin/retailers/:id/credit-limit",
    { preHandler: authenticate },
    controller.updateRetailerCreditLimit.bind(controller),
  );
};
