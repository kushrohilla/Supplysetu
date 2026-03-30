import { z } from "zod";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const isoDateSchema = z.string().regex(isoDatePattern, "Expected YYYY-MM-DD date");

export const REPORTING_TREND_PERIOD_VALUES = ["daily", "weekly", "monthly"] as const;
export const REPORTING_RETAILER_SORT_VALUES = ["last_order", "total_value", "outstanding"] as const;
export const REPORTING_DIRECTION_VALUES = ["asc", "desc"] as const;

export type ReportingTrendPeriod = (typeof REPORTING_TREND_PERIOD_VALUES)[number];
export type ReportingRetailerSort = (typeof REPORTING_RETAILER_SORT_VALUES)[number];
export type ReportingDirection = (typeof REPORTING_DIRECTION_VALUES)[number];

export const reportingDateRangeSchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
}).strict();

export const reportingOrdersTrendQuerySchema = reportingDateRangeSchema.extend({
  period: z.enum(REPORTING_TREND_PERIOD_VALUES).default("daily"),
}).strict();

export const reportingRetailersQuerySchema = reportingDateRangeSchema.extend({
  sort: z.enum(REPORTING_RETAILER_SORT_VALUES).default("total_value"),
  limit: z.coerce.number().int().positive().max(25).default(10),
  direction: z.enum(REPORTING_DIRECTION_VALUES).default("desc"),
}).strict();

export const reportingRoutePerformanceQuerySchema = reportingDateRangeSchema;
