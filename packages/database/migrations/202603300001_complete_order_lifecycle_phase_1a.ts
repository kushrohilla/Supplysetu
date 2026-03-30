import type { Knex } from "knex";

const NEW_ORDER_STATUSES = ["INVOICED", "PACKED", "DISPATCHED", "DELIVERED", "CLOSED"] as const;
const ORDER_TIMESTAMP_COLUMNS = ["packed_at", "dispatched_at", "delivered_at", "closed_at"] as const;

const addStatusValues = async (knex: Knex) => {
  for (const status of NEW_ORDER_STATUSES) {
    await knex.raw(`ALTER TYPE "order_status" ADD VALUE IF NOT EXISTS '${status}'`);
  }
};

const addMissingOrderTimestampColumns = async (knex: Knex) => {
  for (const column of ORDER_TIMESTAMP_COLUMNS) {
    const hasColumn = await knex.schema.hasColumn("orders", column);
    if (!hasColumn) {
      await knex.schema.alterTable("orders", (table) => {
        table.timestamp(column, { useTz: true }).nullable();
      });
    }
  }
};

const createOrderHistoryTable = async (knex: Knex) => {
  const hasOrderHistoryTable = await knex.schema.hasTable("order_history");
  if (hasOrderHistoryTable) {
    return;
  }

  await knex.schema.createTable("order_history", (table) => {
    table.uuid("id").primary();
    table.uuid("order_id").notNullable().references("id").inTable("orders").onDelete("CASCADE");
    table.string("from_status", 64).notNullable();
    table.string("to_status", 64).notNullable();
    table.string("actor_role", 32).notNullable();
    table.uuid("actor_id").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["order_id", "created_at"], "idx_order_history_order_created_at");
  });
};

export async function up(knex: Knex): Promise<void> {
  const hasOrdersTable = await knex.schema.hasTable("orders");
  if (!hasOrdersTable) {
    return;
  }

  await addStatusValues(knex);
  await addMissingOrderTimestampColumns(knex);
  await createOrderHistoryTable(knex);
}

export async function down(knex: Knex): Promise<void> {
  const hasOrdersTable = await knex.schema.hasTable("orders");
  if (!hasOrdersTable) {
    return;
  }

  const hasOrderHistoryTable = await knex.schema.hasTable("order_history");
  if (hasOrderHistoryTable) {
    await knex.schema.dropTableIfExists("order_history");
  }

  for (const column of ORDER_TIMESTAMP_COLUMNS) {
    const hasColumn = await knex.schema.hasColumn("orders", column);
    if (hasColumn) {
      await knex.schema.alterTable("orders", (table) => {
        table.dropColumn(column);
      });
    }
  }
}
