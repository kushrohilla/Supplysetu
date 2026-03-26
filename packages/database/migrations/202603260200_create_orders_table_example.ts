import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasOrdersTable = await knex.schema.hasTable("orders");
  if (hasOrdersTable) {
    return;
  }

  await knex.schema.createTable("orders", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("distributor_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.string("status", 64).notNullable().defaultTo("draft");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["distributor_id", "status"], "idx_orders_distributor_status");
  });
}

export async function down(knex: Knex): Promise<void> {
  const hasOrdersTable = await knex.schema.hasTable("orders");
  if (!hasOrdersTable) {
    return;
  }

  await knex.schema.dropTableIfExists("orders");
}
