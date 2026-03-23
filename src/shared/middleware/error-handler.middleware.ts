import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "../errors/app-error";
import { toErrorResponse } from "../contracts/api-response";
import { logger } from "../logger";

export const errorHandler = (error: Error, _req: Request, res: Response, _next: NextFunction) => {
  const isKnownError = error instanceof AppError;
  const statusCode = isKnownError ? error.statusCode : StatusCodes.INTERNAL_SERVER_ERROR;
  const code = isKnownError ? error.code : "INTERNAL_SERVER_ERROR";

  logger.error(
    {
      err: error,
      code,
      statusCode
    },
    error.message
  );

  res.status(statusCode).json(
    toErrorResponse(code, isKnownError ? error.message : "An unexpected error occurred", isKnownError ? {
      ...(typeof error.details === "object" && error.details !== null ? (error.details as Record<string, unknown>) : {})
    } : null)
  );
};
