import type { FastifyReply, FastifyRequest } from "fastify";

import { inventoryTenantSchema } from "./module.schema";

export class InventoryController {
  async getStock(request: FastifyRequest, reply: FastifyReply) {
    const { tenant_id: tenantId } = inventoryTenantSchema.parse(request.query);
    const stock = await request.server.container.inventoryService.getAvailableStock(tenantId, []);
    return reply.send({ success: true, data: stock });
  }
}
