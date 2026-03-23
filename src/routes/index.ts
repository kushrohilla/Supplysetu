import { Router } from "express";

import { adminProductManagementRouter } from "./admin-product-management.routes";
import { healthRouter } from "./health.routes";

export const registerRoutes = () => {
  const router = Router();

  router.use("/health", healthRouter);
  router.use(adminProductManagementRouter);

  return router;
};
