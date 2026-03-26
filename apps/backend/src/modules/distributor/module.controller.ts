import type { FastifyReply, FastifyRequest } from "fastify";

import { HTTP_STATUS } from "../../shared/constants/http-status";
import { AppError } from "../../shared/errors/app-error";
import { homeQuerySchema } from "./module.schema";

export class DistributorController {
  async getRetailerHome(request: FastifyRequest, reply: FastifyReply) {
    const retailerId = request.auth?.retailerId;
    if (!retailerId) {
      throw new AppError(HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized");
    }

    const { tenant_id: tenantId } = homeQuerySchema.parse(request.query);
    const data = await request.server.container.distributorService.getRetailerHome(retailerId, tenantId);
    return reply.send({ success: true, data });
  }
}
