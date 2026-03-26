import type { FastifyReply, FastifyRequest } from "fastify";

import { HTTP_STATUS } from "../../shared/constants/http-status";
import { AppError } from "../../shared/errors/app-error";
import { createOrderSchema, orderHistoryQuerySchema, quickReorderQuerySchema, updateOrderStatusSchema } from "./module.schema";

export class OrderController {
  async createOrder(request: FastifyRequest, reply: FastifyReply) {
    const retailerId = request.auth?.retailerId;
    if (!retailerId) {
      throw new AppError(HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized");
    }

    const payload = createOrderSchema.parse(request.body);
    const result = await request.server.container.orderService.placeOrder({
      tenantId: payload.tenant_id,
      retailerId,
      paymentMode: payload.payment_mode,
      items: payload.items,
      idempotencyKey: request.headers["idempotency-key"]?.toString() ?? request.server.container.authService.generateIdempotencyKey(),
      notes: payload.notes,
    });

    return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: result });
  }

  async listOrders(request: FastifyRequest, reply: FastifyReply) {
    const retailerId = request.auth?.retailerId;
    if (!retailerId) {
      throw new AppError(HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized");
    }

    const query = orderHistoryQuerySchema.parse(request.query);
    const orders = await request.server.container.orderService.listOrders(retailerId, query.tenant_id, query.limit);
    return reply.send({ success: true, data: orders });
  }

  async getOrder(request: FastifyRequest<{ Params: { orderId: string } }>, reply: FastifyReply) {
    const retailerId = request.auth?.retailerId;
    if (!retailerId) {
      throw new AppError(HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized");
    }

    const order = await request.server.container.orderService.getOrder(retailerId, request.params.orderId);
    if (!order) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, "ORDER_NOT_FOUND", "Order not found");
    }

    return reply.send({ success: true, data: order });
  }

  async getQuickReorder(request: FastifyRequest, reply: FastifyReply) {
    const retailerId = request.auth?.retailerId;
    if (!retailerId) {
      throw new AppError(HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized");
    }

    const query = quickReorderQuerySchema.parse(request.query);
    const data = await request.server.container.orderService.getQuickReorder(retailerId, query.tenant_id);
    return reply.send({ success: true, data });
  }

  async updateStatus(request: FastifyRequest<{ Params: { orderId: string } }>, reply: FastifyReply) {
    const payload = updateOrderStatusSchema.parse(request.body);
    await request.server.container.orderService.transitionStatus(request.params.orderId, payload.status);

    return reply.send({
      success: true,
      data: {
        orderId: request.params.orderId,
        status: payload.status,
      },
    });
  }
}
