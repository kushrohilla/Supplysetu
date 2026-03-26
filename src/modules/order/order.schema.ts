import { z } from "zod";
import { ORDER_STATUS } from "./order-status";

export const orderItemSchema = z.object({
  productId: z.union([z.string().min(1), z.number().int().positive()]),
  quantity: z.number().positive(),
});

export const createOrderSchema = z.object({
  tenantId: z.union([z.string().uuid(), z.number().int().positive()]),
  retailerId: z.union([z.string().min(1), z.number().int().positive()]).optional(),
  pricingTier: z.enum(["base", "advance"]).default("base"),
  status: z
    .enum([
      ORDER_STATUS.DRAFT,
      ORDER_STATUS.PLACED,
      ORDER_STATUS.CONFIRMED,
      ORDER_STATUS.PACKED,
      ORDER_STATUS.SHIPPED,
      ORDER_STATUS.DELIVERED,
      ORDER_STATUS.CANCELLED,
    ])
    .default(ORDER_STATUS.DRAFT),
  notes: z.string().max(1000).optional(),
  items: z.array(orderItemSchema).min(1),
});

export const orderParamsSchema = z.object({
  orderId: z.string().min(1),
});

export const updateOrderStatusParamsSchema = z.object({
  id: z.string().min(1),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    ORDER_STATUS.DRAFT,
    ORDER_STATUS.PLACED,
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.PACKED,
    ORDER_STATUS.SHIPPED,
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.CANCELLED,
  ]),
});

export const recentOrdersQuerySchema = z.object({
  tenantId: z.union([z.string().min(1), z.number().int().positive()]),
  retailerId: z.union([z.string().min(1), z.number().int().positive()]).optional(),
  limit: z.coerce.number().int().positive().max(20).default(10),
});

export const reorderParamsSchema = z.object({
  orderId: z.string().min(1),
});

export const reorderOrderSchema = z.object({
  tenantId: z.union([z.string().min(1), z.number().int().positive()]),
  retailerId: z.union([z.string().min(1), z.number().int().positive()]).optional(),
  pricingTier: z.enum(["base", "advance"]).optional(),
  notes: z.string().max(1000).optional(),
});

export const listOrdersQuerySchema = z.object({
  tenantId: z.union([z.string().min(1), z.number().int().positive()]),
  retailerId: z.union([z.string().min(1), z.number().int().positive()]).optional(),
  status: z
    .enum([
      ORDER_STATUS.DRAFT,
      ORDER_STATUS.PLACED,
      ORDER_STATUS.CONFIRMED,
      ORDER_STATUS.PACKED,
      ORDER_STATUS.SHIPPED,
      ORDER_STATUS.DELIVERED,
      ORDER_STATUS.CANCELLED,
    ])
    .optional(),
  fromDate: z.string().date().optional(),
  toDate: z.string().date().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderParams = z.infer<typeof orderParamsSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type RecentOrdersQuery = z.infer<typeof recentOrdersQuerySchema>;
export type ReorderOrderInput = z.infer<typeof reorderOrderSchema>;
