import type { FastifyReply, FastifyRequest } from "fastify";

import { HTTP_STATUS } from "../constants/http-status";

declare module "fastify" {
  interface FastifyRequest {
    auth?: {
      retailerId?: string;
      phone?: string;
      tenantIds?: string[];
      userId?: string;
      tenantId?: string;
      role?: string;
      mobileNumber?: string;
      tokenType?: string;
    };
  }
}

const buildParsedAuthMiddleware = ({ required }: { required: boolean }) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      if (!required) {
        return;
      }

      return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
        success: false,
        data: null,
        error: {
          code: "UNAUTHORIZED",
          message: "Missing authorization token",
        },
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
        data: null,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid authorization token",
        },
        error_code: "UNAUTHORIZED",
        message: "Invalid authorization token",
        details: null,
      });
    }

    const authPayload = payload as Record<string, unknown>;

    request.auth = {
      retailerId: typeof authPayload.retailerId === "string" ? authPayload.retailerId : undefined,
      phone: typeof authPayload.phone === "string" ? authPayload.phone : undefined,
      tenantIds: Array.isArray(authPayload.tenantIds) ? authPayload.tenantIds.map(String) : undefined,
      userId: typeof authPayload.userId === "string" ? authPayload.userId : undefined,
      tenantId: typeof authPayload.tenantId === "string" ? authPayload.tenantId : undefined,
      role: typeof authPayload.role === "string" ? authPayload.role : undefined,
      mobileNumber: typeof authPayload.mobileNumber === "string" ? authPayload.mobileNumber : undefined,
      tokenType: typeof authPayload.tokenType === "string" ? authPayload.tokenType : undefined,
    };
  };
};

export const buildAuthMiddleware = () => buildParsedAuthMiddleware({ required: true });

export const buildOptionalAuthMiddleware = () => buildParsedAuthMiddleware({ required: false });
