import type { FastifyReply, FastifyRequest } from "fastify";

import { HTTP_STATUS } from "../../shared/constants/http-status";
import { AppError } from "../../shared/errors/app-error";
import { createRetailerSchema, retailerParamsSchema, updateRetailerSchema } from "./retailer.schema";

const getTenantIdOrThrow = (request: FastifyRequest) => {
  const tenantId = request.auth?.tenantId;
  if (!tenantId) {
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized");
  }

  return tenantId;
};

export class RetailerController {
  async createRetailer(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = getTenantIdOrThrow(request);
    const payload = createRetailerSchema.parse(request.body);
    const retailer = await request.server.container.retailerService.createRetailer(tenantId, payload);
    return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: retailer });
  }

  async listRetailers(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = getTenantIdOrThrow(request);
    const retailers = await request.server.container.retailerService.listRetailers(tenantId);
    return reply.send({ success: true, data: retailers });
  }

  async getRetailer(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const tenantId = getTenantIdOrThrow(request);
    const { id } = retailerParamsSchema.parse(request.params);
    const retailer = await request.server.container.retailerService.getRetailer(tenantId, id);
    return reply.send({ success: true, data: retailer });
  }

  async updateRetailer(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const tenantId = getTenantIdOrThrow(request);
    const { id } = retailerParamsSchema.parse(request.params);
    const payload = updateRetailerSchema.parse(request.body);
    const retailer = await request.server.container.retailerService.updateRetailer(tenantId, id, payload);
    return reply.send({ success: true, data: retailer });
  }

  async deleteRetailer(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const tenantId = getTenantIdOrThrow(request);
    const { id } = retailerParamsSchema.parse(request.params);
    const retailer = await request.server.container.retailerService.softDeleteRetailer(tenantId, id);
    return reply.send({ success: true, data: retailer });
  }
}
