import type { Knex } from "knex";

const createNotificationEventsTable = async (knex: Knex) => {
  const hasTable = await knex.schema.hasTable("notification_events");
  if (hasTable) {
    return;
  }

  await knex.schema.createTable("notification_events", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.string("event_type", 64).notNullable();
    table.string("resource_type", 64).notNullable();
    table.uuid("resource_id").notNullable();
    table.string("recipient_type", 32).notNullable();
    table.uuid("recipient_id").nullable();
    table.string("channel", 16).notNullable();
    table.string("status", 16).notNullable();
    table.text("provider_message_id").nullable();
    table.jsonb("payload_json").notNullable();
    table.text("error_message").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("sent_at", { useTz: true }).nullable();

    table.index(["tenant_id", "created_at"], "idx_notification_events_tenant_created_at");
    table.index(["tenant_id", "event_type"], "idx_notification_events_tenant_event_type");
    table.index(["tenant_id", "channel", "status"], "idx_notification_events_tenant_channel_status");
    table.index(["tenant_id", "recipient_id"], "idx_notification_events_tenant_recipient");
  });
};

export async function up(knex: Knex): Promise<void> {
  await createNotificationEventsTable(knex);
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable("notification_events");
  if (hasTable) {
    await knex.schema.dropTableIfExists("notification_events");
  }
}
