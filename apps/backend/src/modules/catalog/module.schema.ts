import { z } from "zod";

export const tenantQuerySchema = z.object({
  tenant_id: z.string().min(1),
});

export const tenantQueryOptionalSchema = z.object({
  tenant_id: z.string().min(1).optional(),
});

export const productsQuerySchema = tenantQueryOptionalSchema.extend({
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(30).default(12),
});

export const searchQuerySchema = tenantQueryOptionalSchema.extend({
  q: z.string().min(2),
});

export const stockBatchSchema = z.object({
  tenant_id: z.string().min(1),
  product_ids: z.array(z.string().min(1)).min(1),
});

export const createBrandSchema = z.object({
  name: z.string().trim().min(2),
});

export const createProductsSchema = z.object({
  tenant_id: z.string().min(1),
  products: z.array(z.object({
    brandId: z.string().min(1).optional(),
    productName: z.string().trim().min(1),
    variantPackSize: z.string().trim().min(1),
    baseSellingPrice: z.coerce.number().nonnegative(),
    mrp: z.coerce.number().nonnegative(),
    openingStock: z.coerce.number().nonnegative(),
    isActive: z.boolean(),
  })).min(1),
});
