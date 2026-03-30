import { z } from "zod";

import { ORDER_STATUS_VALUES } from "./order-status";

const orderItemSchema = z.object({
  product_id: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
}).strict();

export const createAdminOrderSchema = z.object({
  retailer_id: z.string().min(1),
  items: z.array(orderItemSchema).min(1),
}).strict();

export const createRetailerOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1),
}).strict();

export const orderParamsSchema = z.object({
  id: z.string().uuid().or(z.string().min(1)),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUS_VALUES),
}).strict();
