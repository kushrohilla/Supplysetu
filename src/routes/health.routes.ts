import { Router } from "express";

import { healthController } from "../shared/controllers/health.controller";
import { asyncHandler } from "../shared/utils/async-handler";

export const healthRouter = Router();

healthRouter.get("/", asyncHandler(healthController.getStatus));
