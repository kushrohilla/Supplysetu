import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env";
import { errorHandler } from "./shared/middleware/error-handler.middleware";
import { notFoundHandler } from "./shared/middleware/not-found.middleware";
import { requestLogger } from "./shared/middleware/request-logger.middleware";
import { registerRoutes } from "./routes";

const allowedOrigins = env.CORS_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY);
  app.use(helmet());
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
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  app.get("/", (_req, res) => {
    res.status(200).json({
      service: "SupplySetu",
      version: "v1",
      status: "ok"
    });
  });

  app.use(env.API_PREFIX, registerRoutes());
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
