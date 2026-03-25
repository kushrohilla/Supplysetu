import knex, { type Knex } from "knex";

import { env } from "../../config/env";
import { logger } from "../../config/logger.config";

/**
 * Database Configuration and Connection Pool
 *
 * Manages Knex database instance initialization with environment-based
 * configuration. Handles pooling strategy and connection lifecycle.
 *
 * Connection pooling strategy:
 * - Development: No pooling (direct connections)
 * - Test: No pooling
 * - Production: Pooled connections (2-10 range)
 */

const dbConfig = {
  development: {
    client: "pg",
    connection: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      ssl: env.DB_SSL ? { rejectUnauthorized: false } : false
    },
    migrations: {
      directory: "./src/database/migrations",
      extension: "ts"
    }
  },
  test: {
    client: "pg",
    connection: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      ssl: env.DB_SSL ? { rejectUnauthorized: false } : false
    },
    migrations: {
      directory: "./src/database/migrations",
      extension: "ts"
    }
  },
  production: {
    client: "pg",
    connection: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      ssl: env.DB_SSL ? { rejectUnauthorized: false } : false
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: "./dist/database/migrations",
      extension: "js"
    }
  }
} as const satisfies Record<string, Knex.Config>;

/**
 * Creates and initializes the Knex database instance
 * Must be called during application bootstrap
 */
export const createDatabase = () => {
  const config = dbConfig[env.NODE_ENV];

  logger.info(
    {
      environment: env.NODE_ENV,
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME
    },
    "Initializing database connection"
  );

  return knex(config);
};

/**
 * Gracefully closes database connection pool
 */
export const closeDatabase = async (db: ReturnType<typeof createDatabase>) => {
  await db.destroy();
  logger.info("Database connection pool closed");
};
