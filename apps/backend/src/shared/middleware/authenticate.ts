import type { FastifyReply, FastifyRequest } from "fastify";

import { HTTP_STATUS } from "../constants/http-status";

declare module "fastify" {
  interface FastifyRequest {
    auth?: {
      retailerId: string;
      phone: string;
      tenantIds: string[];
    };
  }
}

export const buildAuthMiddleware = () => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
        success: false,
        error_code: "UNAUTHORIZED",
        message: "Missing authorization token",
        details: null,
      });
    }

    const authService = request.server.container.authService;
    const token = authHeader.slice(7);
    const payload = authService.verifyAccessToken(token);

    if (!payload) {
      return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
        success: false,
        error_code: "UNAUTHORIZED",
        message: "Invalid authorization token",
        details: null,
      });
    }

    request.auth = {
      retailerId: payload.retailerId,
      phone: payload.phone,
      tenantIds: payload.tenantIds,
    };
  };
};
