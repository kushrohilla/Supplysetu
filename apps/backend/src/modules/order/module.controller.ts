import type { FastifyReply, FastifyRequest } from "fastify";

import { HTTP_STATUS } from "../../shared/constants/http-status";
import { AppError } from "../../shared/errors/app-error";
import { createAdminOrderSchema, createRetailerOrderSchema, orderParamsSchema, updateOrderStatusSchema } from "./module.schema";
import type { OrderStatusActorRole } from "./order-status";

const getTenantIdOrThrow = (request: FastifyRequest) => {
  const tenantId = request.auth?.tenantId;
  if (!tenantId) {
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized");
  }

  return tenantId;
};

const getRetailerIdOrThrow = (request: FastifyRequest) => {
  const retailerId = request.auth?.retailerId;
  if (!retailerId) {
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized");
  }

  return retailerId;
};

const getActorContext = (request: FastifyRequest): {
  actorRole: OrderStatusActorRole;
  actorId: string | null;
  retailerId?: string;
} => {
  if (request.auth?.tokenType === "retailer") {
    const retailerId = getRetailerIdOrThrow(request);

    return {
      actorRole: "retailer",
      actorId: retailerId,
      retailerId,
    };
  }

  if (request.auth?.tokenType === "admin") {
    return {
      actorRole: "admin",
      actorId: request.auth?.userId ?? null,
    };
  }

  throw new AppError(HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized");
};

export class OrderController {
  async createOrder(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = getTenantIdOrThrow(request);
    const result =
      request.auth?.tokenType === "retailer"
        ? await request.server.container.orderService.createRetailerOrder(
            tenantId,
            getRetailerIdOrThrow(request),
            createRetailerOrderSchema.parse(request.body),
          )
        : await request.server.container.orderService.createOrder(tenantId, createAdminOrderSchema.parse(request.body));

    return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: result });
  }

  async listOrders(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = getTenantIdOrThrow(request);
    const orders =
      request.auth?.tokenType === "retailer"
        ? await request.server.container.orderService.listRetailerOrders(tenantId, getRetailerIdOrThrow(request))
        : await request.server.container.orderService.listOrders(tenantId);
    return reply.send({ success: true, data: orders });
  }

  async getOrder(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const tenantId = getTenantIdOrThrow(request);
    const { id } = orderParamsSchema.parse(request.params);
    const order =
      request.auth?.tokenType === "retailer"
        ? await request.server.container.orderService.getRetailerOrder(tenantId, getRetailerIdOrThrow(request), id)
        : await request.server.container.orderService.getOrder(tenantId, id);
    return reply.send({ success: true, data: order });
  }

  async getHistory(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const tenantId = getTenantIdOrThrow(request);
    const { id } = orderParamsSchema.parse(request.params);
    const history =
      request.auth?.tokenType === "retailer"
        ? await request.server.container.orderService.getRetailerOrderHistory(tenantId, getRetailerIdOrThrow(request), id)
        : await request.server.container.orderService.getOrderHistory(tenantId, id);

    return reply.send({
      success: true,
      data: history,
    });
  }

  async updateStatus(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const tenantId = getTenantIdOrThrow(request);
    const { id } = orderParamsSchema.parse(request.params);
    const payload = updateOrderStatusSchema.parse(request.body);
    const actor = getActorContext(request);
    const order = await request.server.container.orderService.updateStatus({
      tenantId,
      orderId: id,
      nextStatus: payload.status,
      actorRole: actor.actorRole,
      actorId: actor.actorId,
      retailerId: actor.retailerId,
    });

    return reply.send({
      success: true,
      data: order,
    });
  }
}
