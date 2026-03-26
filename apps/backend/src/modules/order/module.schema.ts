import { z } from "zod";

export const createOrderSchema = z.object({
  tenant_id: z.string().min(1),
  payment_mode: z.enum(["advance", "cod"]),
  items: z.array(
    z.object({
      product_id: z.string().min(1),
      quantity: z.coerce.number().int().positive(),
    }),
  ).min(1),
  notes: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending_approval", "confirmed", "dispatched", "delivered", "cancelled", "closed"]),
});

export const orderHistoryQuerySchema = z.object({
  tenant_id: z.string().min(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const quickReorderQuerySchema = z.object({
  tenant_id: z.string().min(1),
});
