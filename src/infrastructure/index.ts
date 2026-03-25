/**
 * Infrastructure Layer Index
 *
 * Re-exports core infrastructure services for easy access throughout the application.
 * This includes database connection pooling and lifecycle management.
 */

export { createDatabase, closeDatabase } from "./database/database.config";
