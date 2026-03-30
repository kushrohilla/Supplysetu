import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import fastify from "fastify";
import type { Knex } from "knex";

import { registerAuthRoutes } from "../modules/auth/module.routes";
import { registerCatalogRoutes } from "../modules/catalog/module.routes";
import { registerDistributorRoutes } from "../modules/distributor/module.routes";
import { registerDispatchRoutes } from "../modules/dispatch/module.routes";
import { registerInventoryRoutes } from "../modules/inventory/module.routes";
import { registerNotificationsRoutes } from "../modules/notifications/module.routes";
import { startNotificationsScheduler } from "../modules/notifications/lib/scheduler";
import { registerOrderRoutes } from "../modules/order/module.routes";
import { registerPaymentsRoutes } from "../modules/payments/module.routes";
import { registerPricingRoutes } from "../modules/pricing/module.routes";
import { registerReportingRoutes } from "../modules/reporting/module.routes";
import { registerRetailerRoutes } from "../modules/retailer/retailer.routes";
import { errorHandler } from "../shared/middleware/error-handler";
import { notFoundHandler } from "../shared/middleware/not-found-handler";
import { createContainer } from "./config/container";
import { env, logger } from "./config";
import { containerPlugin } from "./plugins/container";

export const buildApp = async (db: Knex) => {
  const container = createContainer(db);
  const app = fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
    trustProxy: env.TRUST_PROXY,
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });
  await app.register(helmet);
  await app.register(containerPlugin, { container });

  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  app.get("/health", async () => ({ status: "ok" }));

  await app.register(async (api) => {
    await registerAuthRoutes(api);
    await registerDistributorRoutes(api);
    await registerDispatchRoutes(api);
    await registerCatalogRoutes(api);
    await registerOrderRoutes(api);
    await registerInventoryRoutes(api);
    await registerNotificationsRoutes(api);
    await registerPaymentsRoutes(api);
    await registerPricingRoutes(api);
    await registerReportingRoutes(api);
    await registerRetailerRoutes(api);
  }, { prefix: env.API_PREFIX });

  const stopNotificationsScheduler = startNotificationsScheduler({
    notificationsService: container.notificationsService,
    enabled: env.NOTIFICATIONS_SCHEDULER_ENABLED && env.NODE_ENV !== "test",
    inactivityCron: env.NOTIFICATIONS_INACTIVITY_CRON,
  });

  app.addHook("onClose", async () => {
    stopNotificationsScheduler();
    await db.destroy();
  });

  return app;
};
