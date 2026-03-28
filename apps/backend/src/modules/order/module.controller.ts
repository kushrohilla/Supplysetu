import type { FastifyReply, FastifyRequest } from "fastify";

import { HTTP_STATUS } from "../../shared/constants/http-status";
import { AppError } from "../../shared/errors/app-error";
import { createAdminOrderSchema, createRetailerOrderSchema, orderParamsSchema, updateOrderStatusSchema } from "./module.schema";

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

  async updateStatus(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    if (request.auth?.tokenType === "retailer") {
      throw new AppError(HTTP_STATUS.FORBIDDEN, "FORBIDDEN", "Retailers cannot update order status");
    }

    const tenantId = getTenantIdOrThrow(request);
    const { id } = orderParamsSchema.parse(request.params);
    const payload = updateOrderStatusSchema.parse(request.body);
    const order = await request.server.container.orderService.updateStatus(tenantId, id, payload.status);

    return reply.send({
      success: true,
      data: order,
    });
  }
}
