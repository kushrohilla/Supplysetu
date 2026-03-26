import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable("order_stock_locks");
  if (hasTable) {
    return;
  }

  await knex.schema.createTable("order_stock_locks", (table) => {
    table.increments("id").primary();
    // Keep lock references schema-compatible across the repo's mixed legacy integer IDs and newer UUID IDs.
    table.string("order_id", 128).notNullable();
    table.string("order_line_item_id", 128).nullable();
    table.string("tenant_id", 128).notNullable();
    table.string("product_id", 128).notNullable();
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
