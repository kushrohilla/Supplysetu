import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasOrders = await knex.schema.hasTable("orders");
  if (!hasOrders) {
    return;
  }

  const hasRetailerId = await knex.schema.hasColumn("orders", "retailer_id");
  const hasIdempotencyKey = await knex.schema.hasColumn("orders", "idempotency_key");
  const hasMetadata = await knex.schema.hasColumn("orders", "metadata");

  if (!hasRetailerId) {
    await knex.schema.alterTable("orders", (table) => {
      table.integer("retailer_id").unsigned().references("id").inTable("retailers").onDelete("RESTRICT");
      table.index("retailer_id");
    });
  }

  if (!hasIdempotencyKey) {
    await knex.schema.alterTable("orders", (table) => {
      table.string("idempotency_key").unique();
      table.index("idempotency_key");
    });
  }

  if (!hasMetadata) {
    await knex.schema.alterTable("orders", (table) => {
      table.json("metadata");
    });
  }
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
