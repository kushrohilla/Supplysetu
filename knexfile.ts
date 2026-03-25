/**
 * Knex Migration Configuration
 *
 * Used exclusively for the Knex CLI during migration commands:
 * - npm run migrate:make
 * - npm run migrate:latest
 * - npm run migrate:rollback
 *
 * ARCHITECTURE NOTE: This file is preserved for backward compatibility
 * with Knex's CLI, but is largely duplicated from the new architecture.
 *
 * New architecture location: src/infrastructure/database/database.config.ts
 * This centralized approach provides:
 * - Better lifecycle management (see src/bootstrap/server.bootstrap.ts)
 * - Single source of truth for DB configuration at runtime
 * - Easier testing and dependency injection
 *
 * Future work: Extract this configuration to avoid duplication
 */

import type { Knex } from "knex";

import { env } from "./src/config/env";

const config: Record<string, Knex.Config> = {
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
};

export default config;
