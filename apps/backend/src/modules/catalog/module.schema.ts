import { z } from "zod";

export const tenantQuerySchema = z.object({
  tenant_id: z.string().min(1),
});

export const productsQuerySchema = tenantQuerySchema.extend({
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(30).default(12),
});

export const searchQuerySchema = tenantQuerySchema.extend({
  q: z.string().min(2),
});

export const stockBatchSchema = z.object({
  tenant_id: z.string().min(1),
  product_ids: z.array(z.string().min(1)).min(1),
});
