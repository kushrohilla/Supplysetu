import type { FastifyReply, FastifyRequest } from "fastify";

import { HTTP_STATUS } from "../../shared/constants/http-status";
import { AppError } from "../../shared/errors/app-error";
import {
  createPaymentSchema,
  listPaymentsQuerySchema,
  retailerCreditParamsSchema,
  updateCreditLimitSchema,
} from "./module.schema";

const getAdminTenantIdOrThrow = (request: FastifyRequest) => {
  const tenantId = request.auth?.tenantId;
  if (!tenantId || request.auth?.tokenType !== "admin") {
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized");
  }

  return tenantId;
};

const getIdempotencyKey = (request: FastifyRequest) => {
  const headerValue = request.headers["idempotency-key"];
  if (Array.isArray(headerValue)) {
    return headerValue[0]?.trim() || undefined;
  }

  return typeof headerValue === "string" ? headerValue.trim() || undefined : undefined;
};

export class PaymentsController {
  async recordPayment(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = getAdminTenantIdOrThrow(request);
    const payload = createPaymentSchema.parse(request.body);
    const payment = await request.server.container.paymentsService.recordPayment({
      tenantId,
      actorId: request.auth?.userId ?? null,
      orderId: payload.order_id,
      amount: payload.amount,
      paymentMode: payload.payment_mode,
      referenceNote: payload.reference_note,
      paidAt: payload.paid_at,
      idempotencyKey: getIdempotencyKey(request),
    });

    return reply.status(HTTP_STATUS.CREATED).send({
      success: true,
      data: payment,
    });
  }

  async listPayments(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = getAdminTenantIdOrThrow(request);
    const query = listPaymentsQuerySchema.parse(request.query);
    const payments = await request.server.container.paymentsService.listPayments(tenantId, query);

    return reply.send({
      success: true,
      data: payments,
    });
  }

  async getRetailerCreditSummary(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const tenantId = getAdminTenantIdOrThrow(request);
    const { id } = retailerCreditParamsSchema.parse(request.params);
    const summary = await request.server.container.paymentsService.getRetailerCreditSummary(tenantId, id);

    return reply.send({
      success: true,
      data: summary,
    });
  }

  async updateRetailerCreditLimit(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const tenantId = getAdminTenantIdOrThrow(request);
    const { id } = retailerCreditParamsSchema.parse(request.params);
    const payload = updateCreditLimitSchema.parse(request.body);
    const result = await request.server.container.paymentsService.updateRetailerCreditLimit(tenantId, id, payload.credit_limit);

    return reply.send({
      success: true,
      data: result,
    });
  }
}
