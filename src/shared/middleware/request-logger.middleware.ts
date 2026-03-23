import pinoHttp from "pino-http";

import { logger } from "../logger";

export const requestLogger = pinoHttp({
  logger,
  customSuccessMessage(req, res) {
    return `${req.method} ${req.url} completed with ${res.statusCode}`;
  },
  customErrorMessage(req, res, error) {
    return `${req.method} ${req.url} failed with ${res.statusCode}: ${error.message}`;
  }
});
