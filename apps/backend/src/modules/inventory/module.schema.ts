import { z } from "zod";

export const inventoryTenantSchema = z.object({
  tenant_id: z.string().min(1),
});

export const adminInventoryQuerySchema = z.object({
  search: z.string().trim().optional(),
}).strict();

export const inventoryProductParamsSchema = z.object({
  productId: z.string().min(1),
});

const nonNegativeNumber = z.coerce.number().finite().nonnegative();

export const updateInventoryItemSchema = z.object({
  stock_quantity: nonNegativeNumber,
  low_stock_threshold: nonNegativeNumber,
}).strict();
