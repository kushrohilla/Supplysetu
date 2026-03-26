import pino from "pino";

export const createLogger = (env: { LOG_LEVEL: string }) =>
  pino({
    level: env.LOG_LEVEL,
  });
