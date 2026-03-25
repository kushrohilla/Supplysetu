import pino from "pino";

import { env } from "./env";

/**
 * Logger Bootstrap Configuration
 *
 * Creates a singleton Pino logger instance with environment-based
 * log level and service identification. Should be initialized once
 * during application bootstrap.
 */
export const createLogger = () => {
  return pino({
    level: env.LOG_LEVEL,
    base: {
      service: "supplysetu-backend"
    }
  });
};

// Export a singleton instance for convenience
export const logger = createLogger();
