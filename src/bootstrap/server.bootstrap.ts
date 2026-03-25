import { Server } from "http";

import { env } from "../config/env";
import { logger } from "../config/logger.config";
import { createDatabase } from "../infrastructure";

/**
 * HTTP Server Bootstrap and Lifecycle Management
 *
 * Handles:
 * - Server initialization and startup
 * - Graceful shutdown with timeout enforcement
 * - Signal handling (SIGINT, SIGTERM)
 * - Database connection cleanup
 * - Dependency injection for app instance
 */

export interface BootstrapServerOptions {
  /**
   * Express app instance (from bootstrapApp())
   */
  app: any;

  /**
   * Environment-specific settings
   */
  env: typeof env;
}

interface ServerContext {
  httpServer: Server;
  db: ReturnType<typeof createDatabase>;
}

/**
 * Starts the HTTP server and initializes all dependencies
 * Returns server context for signal handler setup
 */
export const startServer = (options: BootstrapServerOptions): ServerContext => {
  const { app, env: envConfig } = options;

  // Initialize database connection
  const db = createDatabase();

  // Start HTTP server
  const httpServer = app.listen(envConfig.PORT, () => {
    logger.info(
      { port: envConfig.PORT, environment: envConfig.NODE_ENV },
      "HTTP server started and listening"
    );
  });

  return { httpServer, db };
};

/**
 * Graceful shutdown handler
 * Ensures proper cleanup of resources with timeout enforcement
 */
export const gracefulShutdown = async (context: ServerContext, signal: string) => {
  logger.info({ signal }, "Shutdown signal received, initiating graceful shutdown");

  const { httpServer, db } = context;

  // Force exit timer - prevents indefinite shutdown attempts
  const forceExitTimer = setTimeout(() => {
    logger.error(
      { timeoutMs: env.SHUTDOWN_TIMEOUT_MS },
      "Graceful shutdown timeout exceeded, forcing process exit"
    );
    process.exit(1);
  }, env.SHUTDOWN_TIMEOUT_MS);

  // Close HTTP server (stops accepting new connections)
  httpServer.close(async () => {
    try {
      // Close database connection pool
      await db.destroy();
      clearTimeout(forceExitTimer);
      logger.info("Graceful shutdown complete");
      process.exit(0);
    } catch (error) {
      logger.error({ error }, "Error during graceful shutdown");
      process.exit(1);
    }
  });
};

/**
 * Registers process signal handlers
 * Should be called immediately after server starts
 */
export const registerShutdownHandlers = (context: ServerContext) => {
  process.on("SIGINT", () => {
    void gracefulShutdown(context, "SIGINT");
  });

  process.on("SIGTERM", () => {
    void gracefulShutdown(context, "SIGTERM");
  });
};
