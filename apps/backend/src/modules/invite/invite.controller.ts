import type { FastifyReply, FastifyRequest } from "fastify";

import { HTTP_STATUS } from "../../shared/constants/http-status";
import { AppError } from "../../shared/errors/app-error";
import { acceptInviteSchema, inviteTokenParamsSchema } from "./invite.schema";

const getAdminTenantIdOrThrow = (request: FastifyRequest) => {
  const tenantId = request.auth?.tenantId;
  if (!tenantId || request.auth?.tokenType !== "admin") {
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized");
  }

  return tenantId;
};

const getRetailerIdOrThrow = (request: FastifyRequest) => {
  const retailerId = request.auth?.retailerId;
  if (!retailerId || request.auth?.tokenType !== "retailer") {
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized");
  }

  return retailerId;
};

export class InviteController {
  async createInvite(request: FastifyRequest, reply: FastifyReply) {
    const invite = await request.server.container.inviteService.createInvite(getAdminTenantIdOrThrow(request));
    return reply.status(HTTP_STATUS.CREATED).send({
      success: true,
      data: invite,
    });
  }

  async validateInvite(request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) {
    const { token } = inviteTokenParamsSchema.parse(request.params);
    const result = await request.server.container.inviteService.validateInvite(token);

    return reply.send({
      success: true,
      data: result,
    });
  }

  async acceptInvite(request: FastifyRequest, reply: FastifyReply) {
    const retailerId = getRetailerIdOrThrow(request);
    const payload = acceptInviteSchema.parse(request.body);
    const result = await request.server.container.inviteService.acceptInvite(retailerId, payload.token);

    return reply.send({
      success: true,
      data: result,
    });
  }
}
