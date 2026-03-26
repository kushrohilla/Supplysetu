import { loadEnv } from "../../../../../packages/utils/src/env";
import { createLogger } from "../../../../../packages/utils/src/logger";

export const env = loadEnv();
export const logger = createLogger(env);
