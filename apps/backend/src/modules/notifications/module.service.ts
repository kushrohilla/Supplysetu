import { HTTP_STATUS } from "../../shared/constants/http-status";
import { AppError } from "../../shared/errors/app-error";
import type { NotificationLogFilters, NotificationLogListResult, NotificationLogRecord, RetailerNotificationRecipient } from "./module.repository";
import type { NotificationChannel, NotificationEventType } from "./module.schema";
import type { SmsProvider } from "./providers/sms-provider";
import type { WhatsAppProvider } from "./providers/whatsapp-provider";

type LoggerLike = {
  info: (details: Record<string, unknown>, message: string) => void;
  warn: (details: Record<string, unknown>, message: string) => void;
  error: (details: Record<string, unknown>, message: string) => void;
};

type NotificationMessage = {
  title: string;
  body: string;
};

type NotificationPayloadMap = {
  order_confirmed: {
    orderId: string;
    orderNumber: string;
    totalAmount: number;
  };
  order_dispatched: {
    orderId: string;
    orderNumber: string;
    totalAmount: number;
  };
  order_delivered: {
    orderId: string;
    orderNumber: string;
    totalAmount: number;
  };
  payment_recorded: {
    paymentId: string;
    orderId: string;
    orderNumber: string;
    amount: number;
    paymentMode: string;
    paidAt: string;
  };
  inactivity_reminder: {
    retailerId: string;
    lastOrderAt: string | null;
    daysInactive: number;
  };
};

export type NotificationDispatchInput<TEventType extends NotificationEventType = NotificationEventType> = {
  tenantId: string;
  eventType: TEventType;
  resourceType: string;
  resourceId: string;
  recipientType: "retailer";
  recipientId: string;
  payload: NotificationPayloadMap[TEventType];
};

type EventDefinition<TEventType extends NotificationEventType> = {
  channels: NotificationChannel[];
  buildMessage: (input: {
    recipientName: string;
    payload: NotificationPayloadMap[TEventType];
  }) => NotificationMessage;
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatRupees = (value: number) => currencyFormatter.format(value);

const eventDefinitions: {
  [K in NotificationEventType]: EventDefinition<K>;
} = {
  order_confirmed: {
    channels: ["in_app", "sms", "whatsapp"],
    buildMessage: ({ recipientName, payload }) => ({
      title: "Order confirmed",
      body: `${recipientName}, your order ${payload.orderNumber} for ${formatRupees(payload.totalAmount)} is confirmed.`,
    }),
  },
  order_dispatched: {
    channels: ["in_app", "sms", "whatsapp"],
    buildMessage: ({ recipientName, payload }) => ({
      title: "Order dispatched",
      body: `${recipientName}, your order ${payload.orderNumber} for ${formatRupees(payload.totalAmount)} is out for delivery.`,
    }),
  },
  order_delivered: {
    channels: ["in_app", "sms", "whatsapp"],
    buildMessage: ({ recipientName, payload }) => ({
      title: "Order delivered",
      body: `${recipientName}, your order ${payload.orderNumber} for ${formatRupees(payload.totalAmount)} has been delivered.`,
    }),
  },
  payment_recorded: {
    channels: ["in_app", "sms", "whatsapp"],
    buildMessage: ({ recipientName, payload }) => ({
      title: "Payment recorded",
      body: `${recipientName}, we recorded ${formatRupees(payload.amount)} for order ${payload.orderNumber} via ${payload.paymentMode}.`,
    }),
  },
  inactivity_reminder: {
    channels: ["in_app", "sms", "whatsapp"],
    buildMessage: ({ recipientName, payload }) => ({
      title: "Time to restock",
      body: `${recipientName}, it has been ${payload.daysInactive} days since your last order. Reorder when you are ready.`,
    }),
  },
};

const defaultLogger: LoggerLike = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

export interface NotificationRepositoryPort {
  createEventAttempt(input: {
    tenant_id: string;
    event_type: NotificationEventType;
    resource_type: string;
    resource_id: string;
    recipient_type: string;
    recipient_id: string | null;
    channel: NotificationChannel;
    status: "pending" | "sent" | "failed" | "skipped";
    provider_message_id: string | null;
    payload_json: Record<string, unknown>;
    error_message: string | null;
    sent_at: string | null;
  }): Promise<{ id: string }>;
  updateEventAttempt(eventId: string, patch: {
    status: "pending" | "sent" | "failed" | "skipped";
    provider_message_id: string | null;
    error_message: string | null;
    sent_at: string | null;
  }): Promise<void>;
  findRetailerRecipient(tenantId: string, retailerId: string): Promise<RetailerNotificationRecipient | null>;
  listInactiveRetailers(): Promise<RetailerNotificationRecipient[]>;
  hasRecentInactivityReminder(tenantId: string, retailerId: string, sinceIso: string): Promise<boolean>;
  listNotificationLog(tenantId: string, filters: NotificationLogFilters): Promise<NotificationLogListResult>;
  getNotificationLogById(tenantId: string, notificationId: string): Promise<NotificationLogRecord | null>;
  getLatestRetailerInAppNotification(tenantId: string, retailerId: string): Promise<NotificationLogRecord | null>;
}

export class NotificationsService {
  private readonly logger: LoggerLike;
  private readonly now: () => Date;
  private readonly inactivityDays: number;
  private readonly inactivityCooldownHours: number;

  constructor(private readonly options: {
    repository: NotificationRepositoryPort;
    smsProvider: SmsProvider | null;
    whatsappProvider: WhatsAppProvider | null;
    logger?: LoggerLike;
    now?: () => Date;
    inactivityDays?: number;
    inactivityCooldownHours?: number;
  }) {
    this.logger = options.logger ?? defaultLogger;
    this.now = options.now ?? (() => new Date());
    this.inactivityDays = options.inactivityDays ?? 7;
    this.inactivityCooldownHours = options.inactivityCooldownHours ?? 72;
  }

  async dispatchOperationalEvent<TEventType extends NotificationEventType>(input: NotificationDispatchInput<TEventType>) {
    const definition = eventDefinitions[input.eventType];
    const recipient = await this.options.repository.findRetailerRecipient(input.tenantId, input.recipientId);
    const message = definition.buildMessage({
      recipientName: recipient?.retailer_name ?? "Retail partner",
      payload: input.payload as NotificationPayloadMap[TEventType],
    });

    for (const channel of definition.channels) {
      const attempt = await this.options.repository.createEventAttempt({
        tenant_id: input.tenantId,
        event_type: input.eventType,
        resource_type: input.resourceType,
        resource_id: input.resourceId,
        recipient_type: input.recipientType,
        recipient_id: input.recipientId,
        channel,
        status: "pending",
        provider_message_id: null,
        payload_json: {
          ...input.payload,
          rendered: message,
        },
        error_message: null,
        sent_at: null,
      });

      if (channel === "in_app") {
        await this.options.repository.updateEventAttempt(attempt.id, {
          status: "sent",
          provider_message_id: null,
          error_message: null,
          sent_at: this.now().toISOString(),
        });
        continue;
      }

      if (!recipient) {
        await this.markSkipped(attempt.id, "Recipient could not be resolved for this tenant", {
          tenantId: input.tenantId,
          eventType: input.eventType,
          channel,
          recipient: {
            recipientId: input.recipientId,
          },
        });
        continue;
      }

      if (!recipient.phone) {
        await this.markSkipped(attempt.id, "Recipient phone number is missing", {
          tenantId: input.tenantId,
          eventType: input.eventType,
          channel,
          recipient: {
            retailerId: recipient.retailer_id,
          },
        });
        continue;
      }

      if (channel === "sms") {
        await this.deliverSms(attempt.id, input, recipient, message);
        continue;
      }

      await this.deliverWhatsApp(attempt.id, input, recipient, message);
    }
  }

  async runInactivityReminderJob() {
    const now = this.now();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - this.inactivityDays);

    const cooldownSince = new Date(now);
    cooldownSince.setHours(cooldownSince.getHours() - this.inactivityCooldownHours);

    const candidates = await this.options.repository.listInactiveRetailers();
    const eligibleRetailers = candidates.filter((candidate) => {
      const inactivityReference = candidate.last_order_at ?? candidate.retailer_link_created_at;
      return new Date(inactivityReference).getTime() < cutoffDate.getTime();
    });

    let dispatchedCount = 0;
    let skippedCooldownCount = 0;

    for (const retailer of eligibleRetailers) {
      const recentlyReminded = await this.options.repository.hasRecentInactivityReminder(
        retailer.tenant_id,
        retailer.retailer_id,
        cooldownSince.toISOString(),
      );

      // Anti-spam rule: one inactivity reminder attempt per retailer inside the cooldown window.
      if (recentlyReminded) {
        skippedCooldownCount += 1;
        continue;
      }

      const inactivityReferenceDate = new Date(retailer.last_order_at ?? retailer.retailer_link_created_at);
      const daysInactive = Math.max(1, Math.floor((now.getTime() - inactivityReferenceDate.getTime()) / (24 * 60 * 60 * 1000)));

      try {
        await this.dispatchOperationalEvent({
          tenantId: retailer.tenant_id,
          eventType: "inactivity_reminder",
          resourceType: "retailer",
          resourceId: retailer.retailer_id,
          recipientType: "retailer",
          recipientId: retailer.retailer_id,
          payload: {
            retailerId: retailer.retailer_id,
            lastOrderAt: retailer.last_order_at,
            daysInactive,
          },
        });
        dispatchedCount += 1;
      } catch (error) {
        this.logger.error(
          {
            err: error,
            tenantId: retailer.tenant_id,
            retailerId: retailer.retailer_id,
          },
          "Inactivity reminder dispatch failed",
        );
      }
    }

    return {
      eligibleCount: eligibleRetailers.length,
      dispatchedCount,
      skippedCooldownCount,
    };
  }

  async listNotificationLog(tenantId: string, filters: NotificationLogFilters) {
    return this.options.repository.listNotificationLog(tenantId, filters);
  }

  async getNotificationLogById(tenantId: string, notificationId: string) {
    const notification = await this.options.repository.getNotificationLogById(tenantId, notificationId);
    if (!notification) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, "NOTIFICATION_NOT_FOUND", "Notification log entry not found");
    }

    return notification;
  }

  async getLatestRetailerInAppNotification(tenantId: string, retailerId: string) {
    const notification = await this.options.repository.getLatestRetailerInAppNotification(tenantId, retailerId);
    if (!notification) {
      return null;
    }

    const rendered = notification.payload_json.rendered;
    const title = typeof rendered === "object" && rendered !== null && "title" in rendered ? String(rendered.title) : notification.event_type;
    const body = typeof rendered === "object" && rendered !== null && "body" in rendered ? String(rendered.body) : "";

    return {
      id: notification.id,
      event_type: notification.event_type,
      title,
      body,
      created_at: notification.created_at,
      status: notification.status,
    };
  }

  private async deliverSms<TEventType extends NotificationEventType>(
    attemptId: string,
    input: NotificationDispatchInput<TEventType>,
    recipient: RetailerNotificationRecipient,
    message: NotificationMessage,
  ) {
    if (!this.options.smsProvider) {
      await this.markSkipped(attemptId, "SMS provider is not configured", {
        tenantId: input.tenantId,
        eventType: input.eventType,
        channel: "sms",
        recipient: {
          retailerId: recipient.retailer_id,
          phone: recipient.phone,
        },
      });
      return;
    }

    try {
      const result = await this.options.smsProvider.send({
        tenantId: input.tenantId,
        to: recipient.phone ?? "",
        body: message.body,
        eventType: input.eventType,
      });

      await this.options.repository.updateEventAttempt(attemptId, {
        status: "sent",
        provider_message_id: result.provider_message_id ?? null,
        error_message: null,
        sent_at: this.now().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown SMS delivery error";
      await this.options.repository.updateEventAttempt(attemptId, {
        status: "failed",
        provider_message_id: null,
        error_message: message,
        sent_at: null,
      });
      this.logger.error(
        {
          tenantId: input.tenantId,
          eventType: input.eventType,
          channel: "sms",
          recipient: {
            retailerId: recipient.retailer_id,
            phone: recipient.phone,
          },
          reason: message,
          err: error,
        },
        "Notification delivery failed",
      );
    }
  }

  private async deliverWhatsApp<TEventType extends NotificationEventType>(
    attemptId: string,
    input: NotificationDispatchInput<TEventType>,
    recipient: RetailerNotificationRecipient,
    message: NotificationMessage,
  ) {
    if (!this.options.whatsappProvider) {
      await this.markSkipped(attemptId, "WhatsApp provider is not configured", {
        tenantId: input.tenantId,
        eventType: input.eventType,
        channel: "whatsapp",
        recipient: {
          retailerId: recipient.retailer_id,
          phone: recipient.phone,
        },
      });
      return;
    }

    try {
      const result = await this.options.whatsappProvider.send({
        tenantId: input.tenantId,
        to: recipient.phone ?? "",
        body: message.body,
        eventType: input.eventType,
      });

      await this.options.repository.updateEventAttempt(attemptId, {
        status: "sent",
        provider_message_id: result.provider_message_id ?? null,
        error_message: null,
        sent_at: this.now().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown WhatsApp delivery error";
      await this.options.repository.updateEventAttempt(attemptId, {
        status: "failed",
        provider_message_id: null,
        error_message: message,
        sent_at: null,
      });
      this.logger.error(
        {
          tenantId: input.tenantId,
          eventType: input.eventType,
          channel: "whatsapp",
          recipient: {
            retailerId: recipient.retailer_id,
            phone: recipient.phone,
          },
          reason: message,
          err: error,
        },
        "Notification delivery failed",
      );
    }
  }

  private async markSkipped(attemptId: string, reason: string, context: {
    tenantId: string;
    eventType: NotificationEventType;
    channel: NotificationChannel;
    recipient: Record<string, unknown>;
  }) {
    await this.options.repository.updateEventAttempt(attemptId, {
      status: "skipped",
      provider_message_id: null,
      error_message: reason,
      sent_at: null,
    });
    this.logger.warn(
      {
        tenantId: context.tenantId,
        eventType: context.eventType,
        channel: context.channel,
        recipient: context.recipient,
        reason,
      },
      "Notification delivery skipped",
    );
  }
}
