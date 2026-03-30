import crypto from "crypto";
import type { Knex } from "knex";

import { BaseRepository } from "../../shared/base-repository";
import type { NotificationChannel, NotificationEventType, NotificationStatus } from "./module.schema";

type DbExecutor = Knex | Knex.Transaction;

type NotificationEventRow = {
  id: string;
  tenant_id: string;
  event_type: NotificationEventType;
  resource_type: string;
  resource_id: string;
  recipient_type: string;
  recipient_id?: string | null;
  channel: NotificationChannel;
  status: NotificationStatus;
  provider_message_id?: string | null;
  payload_json: unknown;
  error_message?: string | null;
  created_at: string | Date;
  sent_at?: string | Date | null;
  recipient_name?: string | null;
};

type RetailerRecipientRow = {
  tenant_id: string;
  retailer_id: string;
  retailer_name: string;
  phone?: string | null;
  last_order_at?: string | Date | null;
  retailer_link_created_at: string | Date;
};

export type NotificationEventAttemptInput = {
  tenant_id: string;
  event_type: NotificationEventType;
  resource_type: string;
  resource_id: string;
  recipient_type: string;
  recipient_id: string | null;
  channel: NotificationChannel;
  status: NotificationStatus;
  provider_message_id: string | null;
  payload_json: Record<string, unknown>;
  error_message: string | null;
  sent_at: string | null;
};

export type NotificationEventAttemptPatch = {
  status: NotificationStatus;
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
};

export type RetailerNotificationRecipient = {
  tenant_id: string;
  retailer_id: string;
  retailer_name: string;
  phone: string | null;
  last_order_at: string | null;
  retailer_link_created_at: string;
};

export type NotificationLogFilters = {
  event_type?: NotificationEventType;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  page: number;
  limit: number;
};

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

export type NotificationLogListResult = {
  items: NotificationLogRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

const toIsoString = (value: string | Date) => new Date(value).toISOString();
const toIsoStringOrNull = (value?: string | Date | null) => (value ? new Date(value).toISOString() : null);

export class NotificationsRepository extends BaseRepository {
  async createEventAttempt(input: NotificationEventAttemptInput, db: DbExecutor = this.db) {
    const id = crypto.randomUUID();

    await db("notification_events").insert({
      id,
      tenant_id: input.tenant_id,
      event_type: input.event_type,
      resource_type: input.resource_type,
      resource_id: input.resource_id,
      recipient_type: input.recipient_type,
      recipient_id: input.recipient_id,
      channel: input.channel,
      status: input.status,
      provider_message_id: input.provider_message_id,
      payload_json: JSON.stringify(input.payload_json),
      error_message: input.error_message,
      created_at: db.fn.now(),
      sent_at: input.sent_at,
    });

    return { id };
  }

  async updateEventAttempt(eventId: string, patch: NotificationEventAttemptPatch, db: DbExecutor = this.db) {
    await db("notification_events")
      .where({ id: eventId })
      .update({
        status: patch.status,
        provider_message_id: patch.provider_message_id,
        error_message: patch.error_message,
        sent_at: patch.sent_at,
      });
  }

  async findRetailerRecipient(tenantId: string, retailerId: string, db: DbExecutor = this.db): Promise<RetailerNotificationRecipient | null> {
    const row = await db("retailer_distributor_links")
      .join("retailers", "retailer_distributor_links.retailer_id", "retailers.id")
      .leftJoin("orders", function joinOrders() {
        this.on("orders.retailer_id", "=", "retailer_distributor_links.retailer_id").andOn(
          "orders.tenant_id",
          "=",
          "retailer_distributor_links.tenant_id",
        );
      })
      .where("retailer_distributor_links.tenant_id", tenantId)
      .andWhere("retailer_distributor_links.retailer_id", retailerId)
      .andWhere("retailers.is_active", true)
      .groupBy(
        "retailer_distributor_links.tenant_id",
        "retailers.id",
        "retailers.name",
        "retailers.phone",
        "retailer_distributor_links.created_at",
      )
      .first<RetailerRecipientRow>(
        "retailer_distributor_links.tenant_id",
        "retailers.id as retailer_id",
        "retailers.name as retailer_name",
        "retailers.phone",
        "retailer_distributor_links.created_at as retailer_link_created_at",
      )
      .max<{ last_order_at: string | Date | null }>({ last_order_at: "orders.created_at" }) as RetailerRecipientRow | undefined;

    return row
      ? {
          tenant_id: String(row.tenant_id),
          retailer_id: String(row.retailer_id),
          retailer_name: row.retailer_name,
          phone: row.phone ? String(row.phone) : null,
          last_order_at: toIsoStringOrNull(row.last_order_at),
          retailer_link_created_at: toIsoString(row.retailer_link_created_at),
        }
      : null;
  }

  async listInactiveRetailers(db: DbExecutor = this.db): Promise<RetailerNotificationRecipient[]> {
    const rows = await db("retailer_distributor_links")
      .join("retailers", "retailer_distributor_links.retailer_id", "retailers.id")
      .leftJoin("orders", function joinOrders() {
        this.on("orders.retailer_id", "=", "retailer_distributor_links.retailer_id").andOn(
          "orders.tenant_id",
          "=",
          "retailer_distributor_links.tenant_id",
        );
      })
      .where("retailers.is_active", true)
      .groupBy(
        "retailer_distributor_links.tenant_id",
        "retailers.id",
        "retailers.name",
        "retailers.phone",
        "retailer_distributor_links.created_at",
      )
      .select<RetailerRecipientRow[]>(
        "retailer_distributor_links.tenant_id",
        "retailers.id as retailer_id",
        "retailers.name as retailer_name",
        "retailers.phone",
        "retailer_distributor_links.created_at as retailer_link_created_at",
      )
      .max<{ last_order_at: string | Date | null }>({ last_order_at: "orders.created_at" }) as RetailerRecipientRow[];

    return rows.map((row) => ({
      tenant_id: String(row.tenant_id),
      retailer_id: String(row.retailer_id),
      retailer_name: row.retailer_name,
      phone: row.phone ? String(row.phone) : null,
      last_order_at: toIsoStringOrNull(row.last_order_at),
      retailer_link_created_at: toIsoString(row.retailer_link_created_at),
    }));
  }

  async hasRecentInactivityReminder(tenantId: string, retailerId: string, sinceIso: string, db: DbExecutor = this.db) {
    const row = await db("notification_events")
      .where("tenant_id", tenantId)
      .andWhere("recipient_id", retailerId)
      .andWhere("event_type", "inactivity_reminder")
      .andWhere("created_at", ">=", sinceIso)
      .first("id");

    return Boolean(row);
  }

  async listNotificationLog(tenantId: string, filters: NotificationLogFilters, db: DbExecutor = this.db): Promise<NotificationLogListResult> {
    const baseQuery = db("notification_events")
      .leftJoin("retailers", "notification_events.recipient_id", "retailers.id")
      .where("notification_events.tenant_id", tenantId)
      .modify((builder) => {
        if (filters.event_type) {
          builder.andWhere("notification_events.event_type", filters.event_type);
        }
        if (filters.channel) {
          builder.andWhere("notification_events.channel", filters.channel);
        }
        if (filters.status) {
          builder.andWhere("notification_events.status", filters.status);
        }
      });

    const totalRow = await baseQuery.clone().count<{ count: string }>({ count: "notification_events.id" }).first();
    const total = Number(totalRow?.count ?? 0);

    const rows = await baseQuery
      .clone()
      .orderBy("notification_events.created_at", "desc")
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit)
      .select<NotificationEventRow[]>(
        "notification_events.id",
        "notification_events.tenant_id",
        "notification_events.event_type",
        "notification_events.resource_type",
        "notification_events.resource_id",
        "notification_events.recipient_type",
        "notification_events.recipient_id",
        "retailers.name as recipient_name",
        "notification_events.channel",
        "notification_events.status",
        "notification_events.provider_message_id",
        "notification_events.payload_json",
        "notification_events.error_message",
        "notification_events.created_at",
        "notification_events.sent_at",
      );

    return {
      items: rows.map((row) => this.mapNotificationLogRecord(row)),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        total_pages: total === 0 ? 0 : Math.ceil(total / filters.limit),
      },
    };
  }

  async getNotificationLogById(tenantId: string, notificationId: string, db: DbExecutor = this.db): Promise<NotificationLogRecord | null> {
    const row = await db("notification_events")
      .leftJoin("retailers", "notification_events.recipient_id", "retailers.id")
      .where("notification_events.tenant_id", tenantId)
      .andWhere("notification_events.id", notificationId)
      .first<NotificationEventRow>(
        "notification_events.id",
        "notification_events.tenant_id",
        "notification_events.event_type",
        "notification_events.resource_type",
        "notification_events.resource_id",
        "notification_events.recipient_type",
        "notification_events.recipient_id",
        "retailers.name as recipient_name",
        "notification_events.channel",
        "notification_events.status",
        "notification_events.provider_message_id",
        "notification_events.payload_json",
        "notification_events.error_message",
        "notification_events.created_at",
        "notification_events.sent_at",
      );

    return row ? this.mapNotificationLogRecord(row) : null;
  }

  async getLatestRetailerInAppNotification(tenantId: string, retailerId: string, db: DbExecutor = this.db): Promise<NotificationLogRecord | null> {
    const row = await db("notification_events")
      .leftJoin("retailers", "notification_events.recipient_id", "retailers.id")
      .where("notification_events.tenant_id", tenantId)
      .andWhere("notification_events.recipient_id", retailerId)
      .andWhere("notification_events.channel", "in_app")
      .andWhere("notification_events.status", "sent")
      .orderBy("notification_events.created_at", "desc")
      .first<NotificationEventRow>(
        "notification_events.id",
        "notification_events.tenant_id",
        "notification_events.event_type",
        "notification_events.resource_type",
        "notification_events.resource_id",
        "notification_events.recipient_type",
        "notification_events.recipient_id",
        "retailers.name as recipient_name",
        "notification_events.channel",
        "notification_events.status",
        "notification_events.provider_message_id",
        "notification_events.payload_json",
        "notification_events.error_message",
        "notification_events.created_at",
        "notification_events.sent_at",
      );

    return row ? this.mapNotificationLogRecord(row) : null;
  }

  private mapNotificationLogRecord(row: NotificationEventRow): NotificationLogRecord {
    const payload =
      typeof row.payload_json === "string"
        ? (JSON.parse(row.payload_json) as Record<string, unknown>)
        : ((row.payload_json ?? {}) as Record<string, unknown>);

    return {
      id: String(row.id),
      tenant_id: String(row.tenant_id),
      event_type: row.event_type,
      resource_type: row.resource_type,
      resource_id: String(row.resource_id),
      recipient_type: row.recipient_type,
      recipient_id: row.recipient_id ? String(row.recipient_id) : null,
      recipient_name: row.recipient_name ?? null,
      channel: row.channel,
      status: row.status,
      provider_message_id: row.provider_message_id ?? null,
      payload_json: payload,
      error_message: row.error_message ?? null,
      created_at: toIsoString(row.created_at),
      sent_at: toIsoStringOrNull(row.sent_at),
    };
  }
}
