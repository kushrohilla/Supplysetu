import { describe, expect, it, vi } from "vitest";

import type { NotificationLogListResult, NotificationLogRecord } from "./module.repository";
import { NotificationsService, type NotificationRepositoryPort } from "./module.service";

type StoredEvent = {
  id: string;
  tenant_id: string;
  event_type: string;
  resource_type: string;
  resource_id: string;
  recipient_type: string;
  recipient_id: string | null;
  channel: string;
  status: string;
  provider_message_id: string | null;
  payload_json: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
};

class InMemoryNotificationRepository implements NotificationRepositoryPort {
  public readonly events: StoredEvent[] = [];
  public inactiveRetailers: Array<{
    tenant_id: string;
    retailer_id: string;
    retailer_name: string;
    phone: string | null;
    last_order_at: string | null;
    retailer_link_created_at: string;
  }> = [];
  public readonly recentReminderKeys = new Set<string>();
  private eventSequence = 0;

  async createEventAttempt(input: Omit<StoredEvent, "id" | "created_at">) {
    const id = `evt-${++this.eventSequence}`;
    this.events.push({
      id,
      created_at: "2026-03-30T00:00:00.000Z",
      ...input,
    });

    return { id };
  }

  async updateEventAttempt(
    eventId: string,
    patch: Pick<StoredEvent, "status" | "provider_message_id" | "error_message" | "sent_at">,
  ) {
    const event = this.events.find((entry) => entry.id === eventId);
    if (!event) {
      throw new Error(`Missing event ${eventId}`);
    }

    Object.assign(event, patch);
  }

  async findRetailerRecipient(tenantId: string, retailerId: string) {
    const match = this.inactiveRetailers.find(
      (retailer) => retailer.tenant_id === tenantId && retailer.retailer_id === retailerId,
    );

    if (!match) {
      return null;
    }

    return {
      tenant_id: match.tenant_id,
      retailer_id: match.retailer_id,
      retailer_name: match.retailer_name,
      phone: match.phone,
      last_order_at: match.last_order_at,
      retailer_link_created_at: match.retailer_link_created_at,
    };
  }

  async listInactiveRetailers() {
    return this.inactiveRetailers;
  }

  async hasRecentInactivityReminder(tenantId: string, retailerId: string) {
    return this.recentReminderKeys.has(`${tenantId}:${retailerId}`);
  }

  async listNotificationLog(): Promise<NotificationLogListResult> {
    return {
      items: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 0,
      },
    };
  }

  async getNotificationLogById(): Promise<NotificationLogRecord | null> {
    return null;
  }

  async getLatestRetailerInAppNotification(): Promise<NotificationLogRecord | null> {
    return null;
  }
}

describe("NotificationsService", () => {
  it("persists per-channel outcomes and does not throw when external delivery fails", async () => {
    const repository = new InMemoryNotificationRepository();
    repository.inactiveRetailers = [
      {
        tenant_id: "tenant-1",
        retailer_id: "retailer-1",
        retailer_name: "Fresh Mart",
        phone: "9876543210",
        last_order_at: "2026-03-20T00:00:00.000Z",
        retailer_link_created_at: "2026-03-01T00:00:00.000Z",
      },
    ];

    const smsProvider = {
      send: vi.fn().mockRejectedValue(new Error("sms provider down")),
    };
    const whatsappProvider = {
      send: vi.fn().mockResolvedValue({ provider_message_id: "wa-123" }),
    };

    const service = new NotificationsService({
      repository,
      smsProvider,
      whatsappProvider,
      now: () => new Date("2026-03-30T10:00:00.000Z"),
    });

    await expect(
      service.dispatchOperationalEvent({
        tenantId: "tenant-1",
        eventType: "order_confirmed",
        resourceType: "order",
        resourceId: "order-1",
        recipientType: "retailer",
        recipientId: "retailer-1",
        payload: {
          orderId: "order-1",
          orderNumber: "ORD-000001",
          totalAmount: 1250,
        },
      }),
    ).resolves.toBeUndefined();

    expect(repository.events).toHaveLength(3);
    expect(repository.events.map((event) => [event.channel, event.status])).toEqual([
      ["in_app", "sent"],
      ["sms", "failed"],
      ["whatsapp", "sent"],
    ]);
    expect(repository.events[1]?.error_message).toContain("sms provider down");
    expect(repository.events[2]?.provider_message_id).toBe("wa-123");
  });

  it("skips inactivity reminders for retailers already reminded inside the cooldown window", async () => {
    const repository = new InMemoryNotificationRepository();
    repository.inactiveRetailers = [
      {
        tenant_id: "tenant-1",
        retailer_id: "retailer-1",
        retailer_name: "Fresh Mart",
        phone: "9876543210",
        last_order_at: "2026-03-20T00:00:00.000Z",
        retailer_link_created_at: "2026-03-01T00:00:00.000Z",
      },
      {
        tenant_id: "tenant-1",
        retailer_id: "retailer-2",
        retailer_name: "Metro Stores",
        phone: "9988776655",
        last_order_at: "2026-03-19T00:00:00.000Z",
        retailer_link_created_at: "2026-03-01T00:00:00.000Z",
      },
    ];
    repository.recentReminderKeys.add("tenant-1:retailer-2");

    const service = new NotificationsService({
      repository,
      smsProvider: null,
      whatsappProvider: null,
      now: () => new Date("2026-03-30T10:00:00.000Z"),
    });

    const result = await service.runInactivityReminderJob();

    expect(result).toEqual({
      eligibleCount: 2,
      dispatchedCount: 1,
      skippedCooldownCount: 1,
    });
    expect(repository.events).toHaveLength(3);
    expect(repository.events.every((event) => event.recipient_id === "retailer-1")).toBe(true);
  });

  it("uses retailer link age when no order history exists for inactivity eligibility", async () => {
    const repository = new InMemoryNotificationRepository();
    repository.inactiveRetailers = [
      {
        tenant_id: "tenant-1",
        retailer_id: "retailer-new",
        retailer_name: "New Retailer",
        phone: "9123456780",
        last_order_at: null,
        retailer_link_created_at: "2026-03-28T00:00:00.000Z",
      },
      {
        tenant_id: "tenant-1",
        retailer_id: "retailer-old",
        retailer_name: "Old Retailer",
        phone: "9234567890",
        last_order_at: null,
        retailer_link_created_at: "2026-03-18T00:00:00.000Z",
      },
    ];

    const service = new NotificationsService({
      repository,
      smsProvider: null,
      whatsappProvider: null,
      now: () => new Date("2026-03-30T10:00:00.000Z"),
    });

    const result = await service.runInactivityReminderJob();

    expect(result).toEqual({
      eligibleCount: 1,
      dispatchedCount: 1,
      skippedCooldownCount: 0,
    });
    expect(repository.events).toHaveLength(3);
    expect(repository.events.every((event) => event.recipient_id === "retailer-old")).toBe(true);
  });
});
