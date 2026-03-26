import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

import { HTTP_STATUS } from "../constants/http-status";
import { AppError } from "../errors/app-error";

export const errorHandler = (
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  request.log.error({ err: error }, "Request failed");

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error_code: error.code,
      message: error.message,
      details: error.details ?? null,
    });
  }

  if (error instanceof ZodError) {
    return reply.status(HTTP_STATUS.BAD_REQUEST).send({
      success: false,
      error_code: "VALIDATION_ERROR",
      message: "Request validation failed",
      details: {
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
  }

  return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
    success: false,
    error_code: "INTERNAL_SERVER_ERROR",
    message: "Something went wrong",
    details: null,
  });
};
