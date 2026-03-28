import type { Knex } from "knex";

const LEGACY_ORDER_TABLES = [
  "dispatch_pod_items",
  "order_line_event_history",
  "order_status_history",
  "inventory_movements",
  "payment_transaction_log",
  "payment_records",
  "order_payments",
  "order_stock_locks",
  "order_line_items",
  "order_items",
  "orders",
] as const;

const dropLegacyOrderTables = async (knex: Knex) => {
  for (const tableName of LEGACY_ORDER_TABLES) {
    await knex.raw(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
  }

  await knex.raw('DROP TYPE IF EXISTS "order_status" CASCADE');
};

const createOrdersTable = async (knex: Knex) => {
  await knex.schema.createTable("orders", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.uuid("retailer_id").notNullable().references("id").inTable("retailers").onDelete("RESTRICT");
    table.text("order_number").notNullable().unique();
    table.enu("status", ["DRAFT", "PLACED", "CONFIRMED", "CANCELLED"], {
      useNative: true,
      enumName: "order_status",
    }).notNullable().defaultTo("DRAFT");
    table.decimal("total_amount", 12, 2).notNullable().defaultTo(0);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["tenant_id"], "idx_orders_tenant_id");
    table.index(["retailer_id"], "idx_orders_retailer_id");
    table.index(["tenant_id", "status"], "idx_orders_tenant_status");
  });
};

const createOrderItemsTable = async (knex: Knex) => {
  await knex.schema.createTable("order_items", (table) => {
    table.uuid("id").primary();
    table.uuid("order_id").notNullable().references("id").inTable("orders").onDelete("CASCADE");
    table.uuid("product_id").notNullable().references("id").inTable("tenant_products").onDelete("RESTRICT");
    table.integer("quantity").notNullable();
    table.decimal("price", 12, 2).notNullable();
    table.decimal("total_price", 12, 2).notNullable();

    table.index(["order_id"], "idx_order_items_order_id");
    table.index(["product_id"], "idx_order_items_product_id");
  });
};

export async function up(knex: Knex): Promise<void> {
  await dropLegacyOrderTables(knex);
  await createOrdersTable(knex);
  await createOrderItemsTable(knex);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("order_items");
  await knex.schema.dropTableIfExists("orders");
  await knex.raw('DROP TYPE IF EXISTS "order_status" CASCADE');
}
