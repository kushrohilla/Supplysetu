import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable("order_stock_locks");
  if (hasTable) {
    return;
  }

  await knex.schema.createTable("order_stock_locks", (table) => {
    table.increments("id").primary();
    table.integer("order_id").unsigned().notNullable().references("id").inTable("orders").onDelete("CASCADE");
    table.integer("order_line_item_id").unsigned().nullable().references("id").inTable("order_line_items").onDelete("SET NULL");
    table.integer("tenant_id").unsigned().notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.integer("product_id").unsigned().notNullable().references("id").inTable("tenant_products").onDelete("RESTRICT");
    table.decimal("locked_quantity", 12, 3).notNullable();
    table.string("status", 32).notNullable().defaultTo("active");
    table.timestamp("locked_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("released_at", { useTz: true }).nullable();
    table.json("metadata").nullable();
    table.timestamps(true, true);

    table.index(["tenant_id", "product_id", "status"], "idx_order_stock_locks_product_status");
    table.index(["order_id"], "idx_order_stock_locks_order");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("order_stock_locks");
}
