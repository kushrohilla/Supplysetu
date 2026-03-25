/**
 * Shared Logger Export
 *
 * Re-exports logger instance from centralized configuration.
 * This module maintains backward compatibility while consolidating
 * all logger setup into config/logger.config.ts
 *
 * @deprecated Use direct import from src/config/logger.config instead
 */

export { logger } from "../../config/logger.config";
