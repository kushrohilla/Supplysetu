import { createApp } from "./app";
import { env } from "./config/env";
import { db } from "./database/knex";
import { logger } from "./shared/logger";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "HTTP server started");
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutdown signal received");

  const forceExitTimer = setTimeout(() => {
    logger.error({ timeoutMs: env.SHUTDOWN_TIMEOUT_MS }, "Forcing process exit after shutdown timeout");
    process.exit(1);
  }, env.SHUTDOWN_TIMEOUT_MS);

  server.close(async () => {
    await db.destroy();
    clearTimeout(forceExitTimer);
    logger.info("HTTP server stopped");
    process.exit(0);
  });
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
