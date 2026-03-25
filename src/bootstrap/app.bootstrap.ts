import cors from "cors";
import express, { Express } from "express";
import helmet from "helmet";

import { env } from "../config/env";
import { logger } from "../config/logger.config";
import { errorHandler } from "../shared/middleware/error-handler.middleware";
import { notFoundHandler } from "../shared/middleware/not-found.middleware";
import { requestLogger } from "../shared/middleware/request-logger.middleware";
import { registerRoutes } from "../routes";

/**
 * Express Application Bootstrap
 *
 * Configures and assembles the Express application with:
 * - Security middleware (Helmet)
 * - CORS validation
 * - Request/response handling
 * - Error handling pipeline
 * - Route registration
 *
 * This isolated factory function decouples app setup from server lifecycle.
 */

const allowedOrigins = env.CORS_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

/**
 * Configures and returns a bootstrapped Express application
 * Does not start the server - that responsibility is in server.bootstrap.ts
 */
export const bootstrapApp = (): Express => {
  logger.debug("Bootstrapping Express application");

  const app = express();

  // Security & Trust
  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY);
  app.use(helmet());

  // CORS Configuration with origin validation
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`CORS origin not allowed: ${origin}`));
      }
    })
  );

  // Body Parsing
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Request Logging
  app.use(requestLogger);

  // Health Check Endpoint
  app.get("/", (_req, res) => {
    res.status(200).json({
      service: "SupplySetu",
      version: "v1",
      status: "ok"
    });
  });

  // Feature Module Routes
  app.use(env.API_PREFIX, registerRoutes());

  // Error Handling Pipeline (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  logger.info("Express application bootstrapped successfully");

  return app;
};
