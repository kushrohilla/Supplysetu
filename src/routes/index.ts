import { Router } from "express";
import { db } from "../database/knex";
import { createOrderRouter } from "../modules/order/order.routes";
import { createInviteRouter } from "../modules/invite/routes/invite.routes";
import { createRetailerRoutes } from "./retailer-api";

import { adminProductManagementRouter } from "./admin-product-management.routes";
import { healthRouter } from "./health.routes";

export const registerRoutes = () => {
  const router = Router();

  router.use("/health", healthRouter);
  router.use(adminProductManagementRouter);
  router.use("/orders", createOrderRouter(db));
  router.use("/retailer-api", createRetailerRoutes(db));
  router.use(createInviteRouter(db));

  return router;
};
