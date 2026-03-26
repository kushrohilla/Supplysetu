import type { FastifyReply, FastifyRequest } from "fastify";

import { HTTP_STATUS } from "../../shared/constants/http-status";
import { AppError } from "../../shared/errors/app-error";
import { productsQuerySchema, searchQuerySchema, stockBatchSchema, tenantQuerySchema } from "./module.schema";

export class CatalogController {
  async getBrands(request: FastifyRequest, reply: FastifyReply) {
    const { tenant_id: tenantId } = tenantQuerySchema.parse(request.query);
    const brands = await request.server.container.catalogService.getBrands(tenantId);
    return reply.send({ success: true, data: brands });
  }

  async getProductsByBrand(request: FastifyRequest<{ Params: { brandId: string } }>, reply: FastifyReply) {
    const query = productsQuerySchema.parse(request.query);
    const products = await request.server.container.catalogService.getProductsByBrand(
      query.tenant_id,
      request.params.brandId,
      query.page,
      query.page_size,
    );
    return reply.send({ success: true, data: products });
  }

  async searchProducts(request: FastifyRequest, reply: FastifyReply) {
    const query = searchQuerySchema.parse(request.query);
    const products = await request.server.container.catalogService.searchProducts(query.tenant_id, query.q);
    return reply.send({ success: true, data: products });
  }

  async getProduct(request: FastifyRequest<{ Params: { productId: string } }>, reply: FastifyReply) {
    const { tenant_id: tenantId } = tenantQuerySchema.parse(request.query);
    const product = await request.server.container.catalogService.getProduct(tenantId, request.params.productId);
    if (!product) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, "PRODUCT_NOT_FOUND", "Product not found");
    }

    return reply.send({ success: true, data: product });
  }

  async getStockBatch(request: FastifyRequest, reply: FastifyReply) {
    const payload = stockBatchSchema.parse(request.body);
    const stock = await request.server.container.catalogService.getStockBatch(payload.tenant_id, payload.product_ids);
    return reply.send({ success: true, data: stock });
  }
}
