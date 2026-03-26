import type { Knex } from "knex";

const AUDIT_COLUMNS = [
  "placed_at",
  "confirmed_at",
  "packed_at",
  "shipped_at",
  "delivered_at",
  "cancelled_at",
] as const;

export async function up(knex: Knex): Promise<void> {
  const hasOrdersTable = await knex.schema.hasTable("orders");
  if (!hasOrdersTable) {
    return;
  }

  const hasPlacedAt = await knex.schema.hasColumn("orders", "placed_at");
  if (!hasPlacedAt) {
    await knex.schema.alterTable("orders", (table) => {
      table.timestamp("placed_at", { useTz: true }).nullable();
      table.timestamp("confirmed_at", { useTz: true }).nullable();
      table.timestamp("packed_at", { useTz: true }).nullable();
      table.timestamp("shipped_at", { useTz: true }).nullable();
      table.timestamp("delivered_at", { useTz: true }).nullable();
      table.timestamp("cancelled_at", { useTz: true }).nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasOrdersTable = await knex.schema.hasTable("orders");
  if (!hasOrdersTable) {
    return;
  }

  for (const column of AUDIT_COLUMNS) {
    const hasColumn = await knex.schema.hasColumn("orders", column);
    if (hasColumn) {
      await knex.schema.alterTable("orders", (table) => {
        table.dropColumn(column);
      });
    }
  }
}
