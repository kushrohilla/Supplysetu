import type { FastifyReply, FastifyRequest } from "fastify";

import { HTTP_STATUS } from "../../shared/constants/http-status";
import { AppError } from "../../shared/errors/app-error";
import { createOrderSchema, orderParamsSchema, updateOrderStatusSchema } from "./module.schema";

const getTenantIdOrThrow = (request: FastifyRequest) => {
  const tenantId = request.auth?.tenantId;
  if (!tenantId) {
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized");
  }

  return tenantId;
};

export class OrderController {
  async createOrder(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = getTenantIdOrThrow(request);
    const payload = createOrderSchema.parse(request.body);
    const result = await request.server.container.orderService.createOrder(tenantId, payload);

    return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: result });
  }

  async listOrders(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = getTenantIdOrThrow(request);
    const orders = await request.server.container.orderService.listOrders(tenantId);
    return reply.send({ success: true, data: orders });
  }

  async getOrder(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const tenantId = getTenantIdOrThrow(request);
    const { id } = orderParamsSchema.parse(request.params);
    const order = await request.server.container.orderService.getOrder(tenantId, id);
    return reply.send({ success: true, data: order });
  }

  async updateStatus(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
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
