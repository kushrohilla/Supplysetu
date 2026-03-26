import type { Knex } from "knex";

/**
 * 004_INVENTORY_MOVEMENT_LEDGER
 *
 * Domain: Inventory Transactions & Reconciliation
 *
 * Transforms from "stock = X" to "tracked movements".
 * Creates immutable movement journal as single source of truth for stock calculations.
 *
 * Philosophy: Instead of direct state updates (stock_qty = 100), create immutable ledger entries.
 * Current stock = SUM(quantity_change) for all movements of a product
 *
 * Reference Types:
 * - purchase: Incoming goods from suppliers
 * - sales_order: Outgoing due to order fulfillment
 * - return: Goods returned/rejected by customer
 * - adjustment: Manual stock correction or cycle count reconciliation
 * - damage: Obsolete or damaged inventory write-off
 *
 * Tables:
 * - inventory_movement_types: Reference table for movement categorization
 * - inventory_adjustment_reasons: WHY was this adjustment made?
 * - inventory_movements: Immutable ledger (single source of truth for stock)
 */

export async function up(knex: Knex): Promise<void> {
  // REFERENCE: Movement type definitions
  await knex.schema.createTable("inventory_movement_types", (table) => {
    table.uuid("id").primary();
    table.string("code", 32).notNullable().unique();
    table.string("name", 100).notNullable();
    table.string("direction", 8).notNullable(); // 'in' or 'out'
    table.text("description").nullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("code");
  });

  // REFERENCE: Why was stock adjusted?
  await knex.schema.createTable("inventory_adjustment_reasons", (table) => {
    table.uuid("id").primary();
    table.string("code", 32).notNullable().unique();
    table.string("name", 100).notNullable();
    table.text("description").nullable();
    table.boolean("requires_approval").notNullable().defaultTo(false);
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("code");
  });

  // IMMUTABLE: Inventory movement ledger (append-only, single source of truth)
  // Current stock = SUM(quantity_change) for product
  await knex.schema.createTable("inventory_movements", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.uuid("tenant_product_id").notNullable().references("id").inTable("tenant_products").onDelete("RESTRICT");

    // Core movement details
    table.uuid("movement_type_id").notNullable().references("id").inTable("inventory_movement_types").onDelete("RESTRICT");
    table.decimal("quantity_change", 14, 3).notNullable(); // Can be negative for outgoing
    table.string("uom", 32).nullable();

    // Reference fields: links this movement to business transaction
    table.uuid("order_id").nullable().references("id").inTable("orders").onDelete("SET NULL");
    table.uuid("order_line_item_id").nullable().references("id").inTable("order_line_items").onDelete("SET NULL");
    table.uuid("return_id").nullable(); // Future: when returns system exists
    table.uuid("adjustment_reason_id").nullable().references("id").inTable("inventory_adjustment_reasons").onDelete("SET NULL");

    // Contextual data (source document, external references)
    table.jsonb("source_document").notNullable().defaultTo("{}"); // e.g., PO number, GRN date, accounting reference
    table.string("external_reference", 255).nullable(); // Supplier invoice, return RMA, etc.

    // Audit trail
    table.uuid("created_by_user_id").nullable().references("id").inTable("users").onDelete("SET NULL");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Denormalized fields for query performance
    table.decimal("stock_qty_after", 14, 3).nullable(); // Use for validation, not for queries
    table.string("batch_id", 100).nullable(); // For batch operations (imports, cycle counts)

    // Indexes for common queries
    table.index(["tenant_id", "tenant_product_id"], "idx_movements_product");
    table.index(["tenant_id", "created_at"], "idx_movements_tenant_time");
    table.index(["order_id"], "idx_movements_order");
    table.index(["adjustment_reason_id"], "idx_movements_reason");
    table.index(["batch_id"], "idx_movements_batch");
  });

  // Create reference data for common movement types
  // This runs as part of migration (seeding reference data)
  await knex("inventory_movement_types").insert([
    {
      id: knex.raw("gen_random_uuid()"),
      code: "purchase",
      name: "Purchase/Inbound",
      direction: "in",
      description: "Stock received from supplier"
    },
    {
      id: knex.raw("gen_random_uuid()"),
      code: "sales_order",
      name: "Sales Order",
      direction: "out",
      description: "Stock consumed by order fulfillment"
    },
    {
      id: knex.raw("gen_random_uuid()"),
      code: "return",
      name: "Customer Return/Rejection",
      direction: "in",
      description: "Stock returned by customer"
    },
    {
      id: knex.raw("gen_random_uuid()"),
      code: "adjustment",
      name: "Manual Adjustment",
      direction: null,
      description: "Manual stock correction (can be + or -)"
    },
    {
      id: knex.raw("gen_random_uuid()"),
      code: "damage",
      name: "Damage/Obsolescence",
      direction: "out",
      description: "Stock write-off due to damage or expiry"
    }
  ]).onConflict("code").ignore(); // Ignore if already exists
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("inventory_movements");
  await knex.schema.dropTableIfExists("inventory_adjustment_reasons");
  await knex.schema.dropTableIfExists("inventory_movement_types");
}
