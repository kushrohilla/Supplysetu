import type { Knex } from "knex";

import { createKnexConfig } from "./index";
import { loadEnv } from "../utils/src/env";

const env = loadEnv();

const config: Record<string, Knex.Config> = {
  development: createKnexConfig(env),
  test: createKnexConfig({ ...env, NODE_ENV: "test" }),
  production: createKnexConfig({ ...env, NODE_ENV: "production" }),
};

export default config;
