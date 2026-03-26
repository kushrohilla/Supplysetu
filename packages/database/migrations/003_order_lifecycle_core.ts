import type { Knex } from "knex";

/**
 * 003_ORDER_LIFECYCLE_CORE
 *
 * Domain: Order Management & Fulfillment
 *
 * Creates the order transactional entity and establishes the core state machine.
 *
 * State Progression:
 * pending_approval → confirmed → dispatched → delivered → closed
 *
 * Tables:
 * - retailers: Buyer entities (individual distributor outlets)
 * - retailer_distributor_links: Relationship linking retailers to parent distributors
 * - orders: Main transactional record with state tracking
 * - order_line_items: Individual line items with product references
 *
 * NOTE: Fixing type issues from previous migrations:
 * - retailer_id is INTEGER in old schema but should reference UUID product IDs
 * - This migration consolidates order-related tables in correct domain order
 */

export async function up(knex: Knex): Promise<void> {
  // MUTABLE: Buyer entities (retailer outlets)
  await knex.schema.createTable("retailers", (table) => {
    table.uuid("id").primary();
    table.string("phone", 20).notNullable().unique();
    table.string("name", 100).notNullable();
    table.string("locality", 100);
    table.string("city", 50);
    table.string("state", 50);
    table.string("owner_name", 100);
    table.string("credit_line_status").defaultTo("none"); // none, pending, active, blocked
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("phone");
  });

  // MUTABLE: Relationship between retailers and parent distributors (many-to-many with metadata)
  await knex.schema.createTable("retailer_distributor_links", (table) => {
    table.uuid("id").primary();
    table.uuid("retailer_id").notNullable().references("id").inTable("retailers").onDelete("CASCADE");
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.string("status").defaultTo("active"); // active, inactive, suspended
    table.timestamp("last_ordered_at", { useTz: true }).nullable();
    table.integer("total_orders").defaultTo(0);
    table.decimal("total_order_value", 12, 2).defaultTo(0);
    table.string("referral_code");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(["retailer_id", "tenant_id"]);
    table.index("retailer_id");
    table.index("tenant_id");
    table.index("status");
  });

  // MUTABLE: Main transactional order record
  await knex.schema.createTable("orders", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.uuid("retailer_id").nullable().references("id").inTable("retailers").onDelete("RESTRICT");
    table.uuid("created_by_user_id").nullable().references("id").inTable("users").onDelete("SET NULL");

    // State machine: pending_approval → confirmed → dispatched → delivered → closed
    table.string("status", 64).notNullable().defaultTo("pending_approval");

    // State transition timestamps (for backward compatibility)
    table.timestamp("invoice_confirmed_at", { useTz: true }).nullable();
    table.timestamp("dispatched_at", { useTz: true }).nullable();
    table.timestamp("delivered_at", { useTz: true }).nullable();
    table.timestamp("closed_at", { useTz: true }).nullable();

    // Idempotency and metadata
    table.string("idempotency_key").unique();
    table.jsonb("metadata").notNullable().defaultTo("{}");

    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["tenant_id", "status"]);
    table.index(["tenant_id", "retailer_id"]);
    table.index("idempotency_key");
  });

  // MUTABLE: Individual line items within orders
  // Note: Fixing foreign key type — product_id should reference UUIDs, not integers
  await knex.schema.createTable("order_line_items", (table) => {
    table.uuid("id").primary();
    table.uuid("order_id").notNullable().references("id").inTable("orders").onDelete("CASCADE");
    table.uuid("tenant_product_id").notNullable().references("id").inTable("tenant_products").onDelete("RESTRICT");

    // Quantity and pricing (locked at order time for audit trail)
    table.decimal("quantity", 14, 3).notNullable();
    table.decimal("unit_price", 10, 2).notNullable(); // locked at order time
    table.decimal("line_total", 14, 2).notNullable(); // quantity × unit_price

    // Promotion tracking
    table.string("scheme_code").nullable();
    table.decimal("scheme_discount", 10, 2).defaultTo(0);

    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("order_id");
    table.index("tenant_product_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("order_line_items");
  await knex.schema.dropTableIfExists("orders");
  await knex.schema.dropTableIfExists("retailer_distributor_links");
  await knex.schema.dropTableIfExists("retailers");
}
