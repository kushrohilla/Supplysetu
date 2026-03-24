import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Alter orders table to add retailer and idempotency fields
  await knex.schema.alterTable("orders", (table) => {
    table.integer("retailer_id").unsigned().references("id").inTable("retailers").onDelete("RESTRICT");
    table.string("idempotency_key").unique(); // for retry safety
    table.json("metadata"); // for flexible data storage
    table.index("retailer_id");
    table.index("idempotency_key");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("orders", (table) => {
    table.dropIndex("retailer_id");
    table.dropIndex("idempotency_key");
    table.dropColumn("retailer_id");
    table.dropColumn("idempotency_key");
    table.dropColumn("metadata");
  });
}
