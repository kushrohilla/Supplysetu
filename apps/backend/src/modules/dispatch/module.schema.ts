import { z } from "zod";

export const routeParamsSchema = z.object({
  id: z.string().uuid(),
}).strict();

export const orderDeliverParamsSchema = z.object({
  orderId: z.string().uuid(),
}).strict();

export const createRouteSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(500).optional(),
  retailer_ids: z.array(z.string().uuid()).min(1),
}).strict();

export const assignRouteRetailersSchema = z.object({
  retailer_ids: z.array(z.string().uuid()).min(1),
}).strict();

export const createDispatchBatchSchema = z.object({
  route_id: z.string().uuid(),
  delivery_date: z.string().date(),
  order_ids: z.array(z.string().uuid()).min(1),
}).strict();
