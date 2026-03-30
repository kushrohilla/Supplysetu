export type NotificationChannel = "in_app" | "sms" | "whatsapp";
export type NotificationStatus = "pending" | "sent" | "failed" | "skipped";
export type NotificationEventType =
  | "order_confirmed"
  | "order_dispatched"
  | "order_delivered"
  | "payment_recorded"
  | "inactivity_reminder";

export type NotificationLogRecord = {
  id: string;
  tenant_id: string;
  event_type: NotificationEventType;
  resource_type: string;
  resource_id: string;
  recipient_type: string;
  recipient_id: string | null;
  recipient_name: string | null;
  channel: NotificationChannel;
  status: NotificationStatus;
  provider_message_id: string | null;
  payload_json: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
};

export type NotificationLogListResponse = {
  items: NotificationLogRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};
