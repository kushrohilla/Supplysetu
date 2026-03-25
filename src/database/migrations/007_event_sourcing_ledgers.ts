import type { Knex } from "knex";

/**
 * 007_EVENT_SOURCING_LEDGERS
 *
 * Domain: Event Sourcing & Audit Trail
 *
 * Creates immutable history/event tables that capture every state change.
 * Enables temporal queries ("What happened to order #123?") and event-driven notifications.
 *
 * These tables are typically populated via:
 * - Database triggers (automatic)
 * - Application service layer (explicit)
 * - Event framework (if CQRS implemented)
 *
 * Tables:
 * - order_status_history: Every status change (pending → confirmed → dispatched → etc.)
 * - order_line_event_history: Line-item level changes (created, adjusted, partial delivery, etc.)
 * - inventory_movement_events: Audit trail for movement records (recorded, audited, reconciled)
 * - payment_transaction_events: Payment lifecycle events (recorded, reconciled, disputed)
 */

export async function up(knex: Knex): Promise<void> {
  // IMMUTABLE: Order status transition history
  await knex.schema.createTable("order_status_history", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.uuid("order_id").notNullable().references("id").inTable("orders").onDelete("CASCADE");

    // State transition
    table.string("previous_status", 64).nullable();
    table.string("new_status", 64).notNullable();

    // Who triggered this change
    table.uuid("triggered_by_user_id").nullable().references("id").inTable("users").onDelete("SET NULL");
    table.string("triggered_by_role", 64).nullable();

    // Why did this change happen?
    table.jsonb("trigger_reason").notNullable().defaultTo("{}"); // e.g., { reason: "payment_confirmed", amount: 50000 }

    // Context metadata
    table.jsonb("context_data").notNullable().defaultTo("{}"); // e.g., { stock_available: true, payment_verified: true }

    // System/event details
    table.string("event_source", 64).nullable(); // 'api', 'webhook', 'scheduler', 'manual', 'system'
    table.string("event_id", 100).nullable(); // External event ID for tracing

    // Audit
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Indexes for common queries
    table.index(["tenant_id", "order_id", "created_at"], "idx_order_status_order");
    table.index(["tenant_id", "new_status", "created_at"], "idx_order_status_by_status");
    table.index(["triggered_by_user_id"], "idx_order_status_by_user");
  });

  // IMMUTABLE: Order line-item event history
  await knex.schema.createTable("order_line_event_history", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.uuid("order_id").notNullable().references("id").inTable("orders").onDelete("CASCADE");
    table.uuid("order_line_item_id").notNullable().references("id").inTable("order_line_items").onDelete("CASCADE");

    // Event type
    table.string("event_type", 64).notNullable(); // created, quantity_adjusted, item_cancelled, partial_delivery, complete_delivery, damage_reported

    // State changes
    table.decimal("old_quantity", 14, 3).nullable();
    table.decimal("new_quantity", 14, 3).nullable();
    table.string("old_status", 32).nullable();
    table.string("new_status", 32).nullable();

    // Why did this happen?
    table.jsonb("event_reason").notNullable().defaultTo("{}"); // e.g., { reason: "stock_shortage", shortage_qty: 5 }

    // Who triggered it
    table.uuid("triggered_by_user_id").nullable().references("id").inTable("users").onDelete("SET NULL");
    table.string("triggered_by_role", 64).nullable();

    // Context
    table.jsonb("context_data").notNullable().defaultTo("{}"); // e.g., { stock_available: 3, ordered: 5 }
    table.string("event_source", 64).nullable(); // 'api', 'dispatch_pod', 'manual', 'system'

    // For tracing across systems
    table.string("correlation_id", 100).nullable();
    table.string("trace_id", 100).nullable();

    // Audit
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index(["tenant_id", "order_line_item_id", "created_at"], "idx_line_event_item");
    table.index(["event_type", "tenant_id"], "idx_line_event_type");
    table.index(["triggered_by_user_id"], "idx_line_event_by_user");
  });

  // IMMUTABLE: Inventory movement audit trail
  await knex.schema.createTable("inventory_movement_events", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.uuid("movement_id").notNullable().references("id").inTable("inventory_movements").onDelete("CASCADE");

    // Event lifecycle
    table.string("event_type", 64).notNullable(); // recorded, audited, reconciled, disputed, reversed
    table.string("event_status", 32).notNullable().defaultTo("completed"); // completed, pending, failed

    // Why?
    table.jsonb("event_reason").notNullable().defaultTo("{}"); // e.g., { reason: "audit_correction", discrepancy: -5 }

    // Who?
    table.uuid("processed_by_user_id").nullable().references("id").inTable("users").onDelete("SET NULL");

    // Approval chain (if required)
    table.uuid("approved_by_user_id").nullable().references("id").inTable("users").onDelete("SET NULL");
    table.timestamp("approved_at", { useTz: true }).nullable();
    table.text("approval_notes").nullable();

    // Context
    table.jsonb("context_data").notNullable().defaultTo("{}"); // e.g., { original_qty: 100, corrected_qty: 95 }
    table.string("source_system", 64).nullable(); // 'manual', 'accounting_sync', 'cycle_count', 'auditor'

    // Audit
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index(["tenant_id", "movement_id"], "idx_movement_event_movement");
    table.index(["event_type", "tenant_id"], "idx_movement_event_type");
    table.index(["processed_by_user_id"], "idx_movement_event_by_user");
  });

  // IMMUTABLE: Payment transaction event trail
  await knex.schema.createTable("payment_transaction_events", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.uuid("payment_id").notNullable().references("id").inTable("payment_transaction_log").onDelete("CASCADE");

    // Event lifecycle
    table.string("event_type", 64).notNullable(); // recorded, confirmed, failed, reconciled, disputed, reversal_initiated, reversal_completed

    // Status transition
    table.string("old_reconciliation_status", 32).nullable();
    table.string("new_reconciliation_status", 32).nullable();

    // Why?
    table.jsonb("reason").notNullable().defaultTo("{}"); // e.g., { reason: "accounting_mismatch", variance: 150 }

    // Who processed?
    table.uuid("processed_by_user_id").nullable().references("id").inTable("users").onDelete("SET NULL");

    // Approval (for disputes/reversals)
    table.uuid("approved_by_user_id").nullable().references("id").inTable("users").onDelete("SET NULL");
    table.timestamp("approved_at", { useTz: true }).nullable();
    table.text("approval_notes").nullable();

    // Dispute tracking
    table.string("dispute_category", 64).nullable(); // duplicate, unauthorized, amount_difference, etc.
    table.text("dispute_details").nullable();

    // Context data
    table.jsonb("context_data").notNullable().defaultTo("{}"); // e.g., { accounting_amount: 50000, payment_amount: 49850 }
    table.string("source_system", 64).nullable(); // 'manual', 'accounting_sync', 'bank_feed', 'customer_report'

    // Audit
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index(["tenant_id", "payment_id"], "idx_payment_event_payment");
    table.index(["event_type", "tenant_id"], "idx_payment_event_type");
    table.index(["processed_by_user_id"], "idx_payment_event_by_user");
    table.index(["dispute_category"], "idx_payment_event_dispute");
  });

  // Helper materialized view for audit compliance
  // Shows complete event timeline for an entity
  // Can be refreshed nightly for performance
  await knex.schema.createTable("entity_event_timeline", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.string("entity_type", 64).notNullable(); // order, order_line, payment, movement
    table.uuid("entity_id").notNullable();
    table.string("event_type", 64).notNullable();
    table.string("event_description", 255).notNullable();
    table.uuid("actor_user_id").nullable();
    table.jsonb("event_metadata").notNullable().defaultTo("{}");
    table.timestamp("event_at", { useTz: true }).notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["tenant_id", "entity_type", "entity_id", "event_at"], "idx_entity_timeline");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("entity_event_timeline");
  await knex.schema.dropTableIfExists("payment_transaction_events");
  await knex.schema.dropTableIfExists("inventory_movement_events");
  await knex.schema.dropTableIfExists("order_line_event_history");
  await knex.schema.dropTableIfExists("order_status_history");
}
