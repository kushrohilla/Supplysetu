import { bootstrapApp, registerShutdownHandlers, startServer } from "./bootstrap";
import { env } from "./config/env";
import { logger } from "./config/logger.config";

/**
 * Application Entry Point
 *
 * Orchestrates the complete bootstrap sequence:
 * 1. Initializes configuration (env, logger already loaded)
 * 2. Creates Express app
 * 3. Starts HTTP server and dependencies
 * 4. Registers graceful shutdown handlers
 *
 * This file is intentionally minimal - all bootstrap logic is delegated
 * to the dedicated bootstrap layer modules.
 */

const main = async () => {
  try {
    // Bootstrap Express application
    const app = bootstrapApp();

    // Start HTTP server and initialize dependencies
    const serverContext = startServer({ app, env });

    // Register graceful shutdown handlers
    registerShutdownHandlers(serverContext);

    logger.info("Application bootstrap complete");
  } catch (error) {
    logger.error({ error }, "Fatal error during application bootstrap");
    process.exit(1);
  }
};

void main();
