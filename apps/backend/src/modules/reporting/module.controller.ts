import type { FastifyReply, FastifyRequest } from "fastify";

import { HTTP_STATUS } from "../../shared/constants/http-status";
import { AppError } from "../../shared/errors/app-error";
import {
  reportingDateRangeSchema,
  reportingOrdersTrendQuerySchema,
  reportingRetailersQuerySchema,
  reportingRoutePerformanceQuerySchema,
} from "./module.schema";

const getAdminTenantIdOrThrow = (request: FastifyRequest) => {
  const tenantId = request.auth?.tenantId;
  if (!tenantId || request.auth?.tokenType !== "admin") {
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized");
  }

  return tenantId;
};

export class ReportingController {
  async getSummary(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = getAdminTenantIdOrThrow(request);
    const query = reportingDateRangeSchema.parse(request.query);
    const summary = await request.server.container.reportingService.getSummary(tenantId, query);

    return reply.send({
      success: true,
      data: summary,
    });
  }

  async getOrdersTrend(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = getAdminTenantIdOrThrow(request);
    const query = reportingOrdersTrendQuerySchema.parse(request.query);
    const trend = await request.server.container.reportingService.getOrdersTrend(tenantId, query);

    return reply.send({
      success: true,
      data: trend,
    });
  }

  async getRetailers(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = getAdminTenantIdOrThrow(request);
    const query = reportingRetailersQuerySchema.parse(request.query);
    const retailers = await request.server.container.reportingService.getRetailers(tenantId, query);

    return reply.send({
      success: true,
      data: retailers,
    });
  }

  async getRoutePerformance(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = getAdminTenantIdOrThrow(request);
    const query = reportingRoutePerformanceQuerySchema.parse(request.query);
    const routes = await request.server.container.reportingService.getRoutePerformance(tenantId, query);

    return reply.send({
      success: true,
      data: routes,
    });
  }
}
