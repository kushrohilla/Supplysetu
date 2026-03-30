import { z } from "zod";

export const NOTIFICATION_CHANNEL_VALUES = ["in_app", "sms", "whatsapp"] as const;
export const NOTIFICATION_STATUS_VALUES = ["pending", "sent", "failed", "skipped"] as const;
export const NOTIFICATION_EVENT_TYPE_VALUES = [
  "order_confirmed",
  "order_dispatched",
  "order_delivered",
  "payment_recorded",
  "inactivity_reminder",
] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNEL_VALUES)[number];
export type NotificationStatus = (typeof NOTIFICATION_STATUS_VALUES)[number];
export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPE_VALUES)[number];

export const notificationLogQuerySchema = z.object({
  event_type: z.enum(NOTIFICATION_EVENT_TYPE_VALUES).optional(),
  channel: z.enum(NOTIFICATION_CHANNEL_VALUES).optional(),
  status: z.enum(NOTIFICATION_STATUS_VALUES).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

export const notificationLogParamsSchema = z.object({
  id: z.string().uuid().or(z.string().min(1)),
}).strict();
