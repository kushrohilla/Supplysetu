import type { FastifyReply, FastifyRequest } from "fastify";

import { HTTP_STATUS } from "../../shared/constants/http-status";
import { AppError } from "../../shared/errors/app-error";
import { notificationLogParamsSchema, notificationLogQuerySchema } from "./module.schema";

const getAdminTenantIdOrThrow = (request: FastifyRequest) => {
  const tenantId = request.auth?.tenantId;
  if (!tenantId || request.auth?.tokenType !== "admin") {
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized");
  }

  return tenantId;
};

const getRetailerContextOrThrow = (request: FastifyRequest) => {
  const tenantId = request.auth?.tenantId;
  const retailerId = request.auth?.retailerId;
  if (!tenantId || !retailerId || request.auth?.tokenType !== "retailer") {
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized");
  }

  return {
    tenantId,
    retailerId,
  };
};

export class NotificationsController {
  async listLog(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = getAdminTenantIdOrThrow(request);
    const query = notificationLogQuerySchema.parse(request.query);
    const notifications = await request.server.container.notificationsService.listNotificationLog(tenantId, query);

    return reply.send({
      success: true,
      data: notifications,
    });
  }

  async getLogById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const tenantId = getAdminTenantIdOrThrow(request);
    const { id } = notificationLogParamsSchema.parse(request.params);
    const notification = await request.server.container.notificationsService.getNotificationLogById(tenantId, id);

    return reply.send({
      success: true,
      data: notification,
    });
  }

  async getLatestRetailerInAppNotification(request: FastifyRequest, reply: FastifyReply) {
    const { tenantId, retailerId } = getRetailerContextOrThrow(request);
    const notification = await request.server.container.notificationsService.getLatestRetailerInAppNotification(tenantId, retailerId);

    return reply.send({
      success: true,
      data: notification,
    });
  }
}
