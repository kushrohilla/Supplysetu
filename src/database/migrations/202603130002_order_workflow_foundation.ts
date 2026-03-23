import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("orders", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.uuid("retailer_id").nullable();
    table.uuid("created_by_user_id").nullable().references("id").inTable("users").onDelete("SET NULL");
    table.string("status", 64).notNullable().defaultTo("pending_approval");
    table.timestamp("invoice_confirmed_at", { useTz: true }).nullable();
    table.timestamp("dispatched_at", { useTz: true }).nullable();
    table.timestamp("delivered_at", { useTz: true }).nullable();
    table.timestamp("closed_at", { useTz: true }).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["tenant_id", "status"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("orders");
}
