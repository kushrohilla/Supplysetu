import { z } from "zod";

export const PAYMENT_MODE_VALUES = ["advance", "cod", "credit"] as const;

const positivePaise = z.coerce.number().int().positive();
const nonNegativePaise = z.coerce.number().int().nonnegative();

export const createPaymentSchema = z.object({
  order_id: z.string().min(1),
  amount: positivePaise,
  payment_mode: z.enum(PAYMENT_MODE_VALUES),
  reference_note: z.string().trim().max(255).optional(),
  paid_at: z.string().datetime().optional(),
}).strict();

export const listPaymentsQuerySchema = z.object({
  retailer_id: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
}).strict();

export const retailerCreditParamsSchema = z.object({
  id: z.string().min(1),
}).strict();

export const updateCreditLimitSchema = z.object({
  credit_limit: nonNegativePaise,
}).strict();
