import type { FastifyReply, FastifyRequest } from "fastify";

import { HTTP_STATUS } from "../../shared/constants/http-status";
import { AppError } from "../../shared/errors/app-error";
import {
  assignRouteRetailersSchema,
  createDispatchBatchSchema,
  createRouteSchema,
  orderDeliverParamsSchema,
  routeParamsSchema,
} from "./module.schema";

const getAdminContextOrThrow = (request: FastifyRequest) => {
  const tenantId = request.auth?.tenantId;
  if (!tenantId || request.auth?.tokenType !== "admin") {
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized");
  }

  return {
    tenantId,
    actorId: request.auth?.userId ?? null,
  };
};

export class DispatchController {
  async createRoute(request: FastifyRequest, reply: FastifyReply) {
    const { tenantId } = getAdminContextOrThrow(request);
    const payload = createRouteSchema.parse(request.body);
    const route = await request.server.container.dispatchService.createRoute({
      tenantId,
      name: payload.name,
      description: payload.description,
      retailerIds: payload.retailer_ids,
    });

    return reply.status(HTTP_STATUS.CREATED).send({
      success: true,
      data: route,
    });
  }

  async listRoutes(request: FastifyRequest, reply: FastifyReply) {
    const { tenantId } = getAdminContextOrThrow(request);
    const routes = await request.server.container.dispatchService.listRoutes(tenantId);

    return reply.send({
      success: true,
      data: routes,
    });
  }

  async assignRouteRetailers(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId } = getAdminContextOrThrow(request);
    const { id } = routeParamsSchema.parse(request.params);
    const payload = assignRouteRetailersSchema.parse(request.body);
    const route = await request.server.container.dispatchService.assignRouteRetailers({
      tenantId,
      routeId: id,
      retailerIds: payload.retailer_ids,
    });

    return reply.send({
      success: true,
      data: route,
    });
  }

  async createBatch(request: FastifyRequest, reply: FastifyReply) {
    const { tenantId, actorId } = getAdminContextOrThrow(request);
    const payload = createDispatchBatchSchema.parse(request.body);
    const batch = await request.server.container.dispatchService.createBatch({
      tenantId,
      actorId,
      routeId: payload.route_id,
      deliveryDate: payload.delivery_date,
      orderIds: payload.order_ids,
    });

    return reply.status(HTTP_STATUS.CREATED).send({
      success: true,
      data: batch,
    });
  }

  async listBatches(request: FastifyRequest, reply: FastifyReply) {
    const { tenantId } = getAdminContextOrThrow(request);
    const batches = await request.server.container.dispatchService.listBatches(tenantId);

    return reply.send({
      success: true,
      data: batches,
    });
  }

  async getBatchSheet(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId } = getAdminContextOrThrow(request);
    const { id } = routeParamsSchema.parse(request.params);
    const sheet = await request.server.container.dispatchService.getBatchSheet(tenantId, id);

    return reply.send({
      success: true,
      data: sheet,
    });
  }

  async dispatchBatch(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId, actorId } = getAdminContextOrThrow(request);
    const { id } = routeParamsSchema.parse(request.params);
    const batch = await request.server.container.dispatchService.dispatchBatch({
      tenantId,
      actorId,
      batchId: id,
    });

    return reply.send({
      success: true,
      data: batch,
    });
  }

  async deliverOrder(request: FastifyRequest<{ Params: { orderId: string } }>, reply: FastifyReply) {
    const { tenantId, actorId } = getAdminContextOrThrow(request);
    const { orderId } = orderDeliverParamsSchema.parse(request.params);
    const result = await request.server.container.dispatchService.deliverOrder({
      tenantId,
      actorId,
      orderId,
    });

    return reply.send({
      success: true,
      data: result,
    });
  }
}
