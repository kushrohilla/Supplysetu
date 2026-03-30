import type { FastifyReply, FastifyRequest } from "fastify";

import { HTTP_STATUS } from "../../shared/constants/http-status";
import { AppError } from "../../shared/errors/app-error";
import {
  adminInventoryQuerySchema,
  inventoryProductParamsSchema,
  inventoryTenantSchema,
  updateInventoryItemSchema,
} from "./module.schema";

const getAdminTenantIdOrThrow = (request: FastifyRequest) => {
  const tenantId = request.auth?.tenantId;
  if (!tenantId || request.auth?.tokenType !== "admin") {
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized");
  }

  return tenantId;
};

export class InventoryController {
  async listAdminInventory(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = getAdminTenantIdOrThrow(request);
    const query = adminInventoryQuerySchema.parse(request.query);
    const items = await request.server.container.inventoryService.listAdminInventory(tenantId, query);

    return reply.send({
      success: true,
      data: items,
    });
  }

  async listLowStockInventory(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = getAdminTenantIdOrThrow(request);
    const query = adminInventoryQuerySchema.parse(request.query);
    const items = await request.server.container.inventoryService.listAdminLowStockInventory(tenantId, query);

    return reply.send({
      success: true,
      data: items,
    });
  }

  async syncInventory(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = getAdminTenantIdOrThrow(request);
    const result = await request.server.container.inventoryService.syncAdminInventory({
      tenantId,
      actorId: request.auth?.userId ?? null,
    });

    return reply.send({
      success: true,
      data: result,
    });
  }

  async updateInventoryItem(request: FastifyRequest<{ Params: { productId: string } }>, reply: FastifyReply) {
    const tenantId = getAdminTenantIdOrThrow(request);
    const { productId } = inventoryProductParamsSchema.parse(request.params);
    const payload = updateInventoryItemSchema.parse(request.body);
    const item = await request.server.container.inventoryService.updateAdminInventoryItem({
      tenantId,
      productId,
      stockQuantity: payload.stock_quantity,
      lowStockThreshold: payload.low_stock_threshold,
      actorId: request.auth?.userId ?? null,
    });

    return reply.send({
      success: true,
      data: item,
    });
  }

  async getStock(request: FastifyRequest, reply: FastifyReply) {
    const { tenant_id: tenantId } = inventoryTenantSchema.parse(request.query);
    const stock = await request.server.container.inventoryService.getAvailableStock(tenantId, []);
    return reply.send({ success: true, data: stock });
  }
}
