import crypto from "crypto";

import knex, { type Knex } from "knex";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createKnexConfig } from "../../../../../packages/database";
import { up as addNotificationsFoundation } from "../../../../../packages/database/migrations/202603300005_add_notifications_foundation";
import { loadEnv } from "../../../../../packages/utils/src/env";
import { NotificationsRepository } from "./module.repository";

const buildDb = () => {
  const env = loadEnv();

  return knex(createKnexConfig({
    ...env,
    NODE_ENV: "test",
  }));
};

const insertTenant = async (trx: Knex.Transaction, input: {
  id: string;
  code: string;
  name: string;
}) => {
  await trx("tenants").insert({
    id: input.id,
    code: input.code,
    name: input.name,
    is_active: true,
  });
};

const insertRetailer = async (trx: Knex.Transaction, input: {
  id: string;
  name: string;
  phone: string;
}) => {
  await trx("retailers").insert({
    id: input.id,
    name: input.name,
    phone: input.phone,
    is_active: true,
  });
};

const insertRetailerLink = async (trx: Knex.Transaction, input: {
  id: string;
  tenantId: string;
  retailerId: string;
  createdAt: string;
}) => {
  await trx("retailer_distributor_links").insert({
    id: input.id,
    tenant_id: input.tenantId,
    retailer_id: input.retailerId,
    created_at: input.createdAt,
  });
};

describe("NotificationsRepository", () => {
  let db: Knex;

  beforeAll(async () => {
    db = buildDb();
    await addNotificationsFoundation(db);
  }, 30000);

  afterAll(async () => {
    await db.destroy();
  });

  it("keeps recipient resolution tenant-safe across shared retailer links", async () => {
    const repository = new NotificationsRepository(db);
    const trx = await db.transaction();

    try {
      const tenantA = crypto.randomUUID();
      const tenantB = crypto.randomUUID();
      const sharedRetailer = crypto.randomUUID();
      const tenantBOnlyRetailer = crypto.randomUUID();

      await insertTenant(trx, {
        id: tenantA,
        code: `notif-tenant-a-${Date.now()}`,
        name: "Tenant A",
      });
      await insertTenant(trx, {
        id: tenantB,
        code: `notif-tenant-b-${Date.now()}`,
        name: "Tenant B",
      });
      await insertRetailer(trx, {
        id: sharedRetailer,
        name: "Shared Retailer",
        phone: `900${Date.now().toString().slice(-7)}`,
      });
      await insertRetailer(trx, {
        id: tenantBOnlyRetailer,
        name: "Tenant B Only",
        phone: `901${Date.now().toString().slice(-7)}`,
      });
      await insertRetailerLink(trx, {
        id: crypto.randomUUID(),
        tenantId: tenantA,
        retailerId: sharedRetailer,
        createdAt: "2026-03-01T00:00:00.000Z",
      });
      await insertRetailerLink(trx, {
        id: crypto.randomUUID(),
        tenantId: tenantB,
        retailerId: sharedRetailer,
        createdAt: "2026-03-02T00:00:00.000Z",
      });
      await insertRetailerLink(trx, {
        id: crypto.randomUUID(),
        tenantId: tenantB,
        retailerId: tenantBOnlyRetailer,
        createdAt: "2026-03-03T00:00:00.000Z",
      });
      const tenantARecipient = await repository.findRetailerRecipient(tenantA, sharedRetailer, trx);
      const crossTenantRecipient = await repository.findRetailerRecipient(tenantA, tenantBOnlyRetailer, trx);

      expect(tenantARecipient).toMatchObject({
        tenant_id: tenantA,
        retailer_id: sharedRetailer,
        retailer_name: "Shared Retailer",
        last_order_at: null,
      });
      expect(crossTenantRecipient).toBeNull();
    } finally {
      await trx.rollback();
    }
  }, 15000);

  it("persists notification attempts in the database and filters the admin log by tenant and channel", async () => {
    const repository = new NotificationsRepository(db);
    const trx = await db.transaction();

    try {
      const tenantA = crypto.randomUUID();
      const tenantB = crypto.randomUUID();
      const retailer = crypto.randomUUID();

      await insertTenant(trx, {
        id: tenantA,
        code: `notif-log-a-${Date.now()}`,
        name: "Tenant A",
      });
      await insertTenant(trx, {
        id: tenantB,
        code: `notif-log-b-${Date.now()}`,
        name: "Tenant B",
      });
      await insertRetailer(trx, {
        id: retailer,
        name: "Filter Retailer",
        phone: `902${Date.now().toString().slice(-7)}`,
      });
      await insertRetailerLink(trx, {
        id: crypto.randomUUID(),
        tenantId: tenantA,
        retailerId: retailer,
        createdAt: "2026-03-01T00:00:00.000Z",
      });
      await insertRetailerLink(trx, {
        id: crypto.randomUUID(),
        tenantId: tenantB,
        retailerId: retailer,
        createdAt: "2026-03-01T00:00:00.000Z",
      });

      const sentSms = await repository.createEventAttempt({
        tenant_id: tenantA,
        event_type: "order_confirmed",
        resource_type: "order",
        resource_id: crypto.randomUUID(),
        recipient_type: "retailer",
        recipient_id: retailer,
        channel: "sms",
        status: "pending",
        provider_message_id: null,
        payload_json: {
          orderNumber: "ORD-000001",
        },
        error_message: null,
        sent_at: null,
      }, trx);
      await repository.updateEventAttempt(sentSms.id, {
        status: "sent",
        provider_message_id: "sms-123",
        error_message: null,
        sent_at: "2026-03-30T10:00:00.000Z",
      }, trx);

      await repository.createEventAttempt({
        tenant_id: tenantA,
        event_type: "payment_recorded",
        resource_type: "payment",
        resource_id: crypto.randomUUID(),
        recipient_type: "retailer",
        recipient_id: retailer,
        channel: "whatsapp",
        status: "failed",
        provider_message_id: null,
        payload_json: {
          orderNumber: "ORD-000002",
        },
        error_message: "provider failed",
        sent_at: null,
      }, trx);
      await repository.createEventAttempt({
        tenant_id: tenantB,
        event_type: "order_confirmed",
        resource_type: "order",
        resource_id: crypto.randomUUID(),
        recipient_type: "retailer",
        recipient_id: retailer,
        channel: "sms",
        status: "sent",
        provider_message_id: "sms-999",
        payload_json: {
          orderNumber: "ORD-000003",
        },
        error_message: null,
        sent_at: "2026-03-30T11:00:00.000Z",
      }, trx);

      const filteredLog = await repository.listNotificationLog(tenantA, {
        event_type: "order_confirmed",
        channel: "sms",
        status: "sent",
        page: 1,
        limit: 10,
      }, trx);
      const persistedEvent = await repository.getNotificationLogById(tenantA, sentSms.id, trx);

      expect(filteredLog.pagination.total).toBe(1);
      expect(filteredLog.items).toHaveLength(1);
      expect(filteredLog.items[0]).toMatchObject({
        id: sentSms.id,
        tenant_id: tenantA,
        event_type: "order_confirmed",
        channel: "sms",
        status: "sent",
        recipient_name: "Filter Retailer",
        provider_message_id: "sms-123",
      });
      expect(persistedEvent).toMatchObject({
        id: sentSms.id,
        tenant_id: tenantA,
        status: "sent",
        provider_message_id: "sms-123",
      });
      expect(persistedEvent?.payload_json).toEqual({
        orderNumber: "ORD-000001",
      });
      expect(persistedEvent?.sent_at).toBe("2026-03-30T10:00:00.000Z");
    } finally {
      await trx.rollback();
    }
  }, 15000);
});
