/**
 * Database Knex Instance (Backward Compatibility)
 *
 * DEPRECATED: This file is maintained for backward compatibility only.
 * The new infrastructure layer (src/infrastructure/database/database.config.ts)
 * provides superior lifecycle management and testability.
 *
 * For new code, use createDatabase() from src/infrastructure instead.
 * Do NOT rely on this module - it will be removed in future refactoring.
 */

import { createDatabase } from "../infrastructure";

// Create and export singleton for backward compatibility
export const db = createDatabase();
