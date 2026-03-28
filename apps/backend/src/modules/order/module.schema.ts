import { z } from "zod";

export const createOrderSchema = z.object({
  retailer_id: z.string().min(1),
  items: z.array(
    z.object({
      product_id: z.string().min(1),
      quantity: z.coerce.number().int().positive(),
    }).strict(),
  ).min(1),
}).strict();

export const orderParamsSchema = z.object({
  id: z.string().uuid().or(z.string().min(1)),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["DRAFT", "PLACED", "CONFIRMED", "CANCELLED"]),
}).strict();
