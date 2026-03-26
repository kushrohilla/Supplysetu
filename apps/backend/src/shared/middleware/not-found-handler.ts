import type { FastifyReply, FastifyRequest } from "fastify";

import { HTTP_STATUS } from "../constants/http-status";

export const notFoundHandler = async (_request: FastifyRequest, reply: FastifyReply) => {
  reply.status(HTTP_STATUS.NOT_FOUND).send({
    success: false,
    error_code: "NOT_FOUND",
    message: "Route not found",
    details: null,
  });
};
