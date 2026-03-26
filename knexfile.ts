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

import { createKnexConfig } from "./packages/database/src";
import { loadEnv } from "./packages/utils/src/env";

const env = loadEnv();

const config: Record<string, Knex.Config> = {
  development: createKnexConfig(env),
  test: createKnexConfig({ ...env, NODE_ENV: "test" }),
  production: createKnexConfig({ ...env, NODE_ENV: "production" }),
};

export default config;
