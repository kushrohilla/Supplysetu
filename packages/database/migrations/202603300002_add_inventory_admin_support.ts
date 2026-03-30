import type { Knex } from "knex";

const addLowStockThresholdColumn = async (knex: Knex) => {
  const hasTenantProducts = await knex.schema.hasTable("tenant_products");
  if (!hasTenantProducts) {
    return;
  }

  const hasLowStockThreshold = await knex.schema.hasColumn("tenant_products", "low_stock_threshold");
  if (hasLowStockThreshold) {
    return;
  }

  await knex.schema.alterTable("tenant_products", (table) => {
    table.decimal("low_stock_threshold", 14, 3).notNullable().defaultTo(0);
  });
};

const createInventorySyncLogsTable = async (knex: Knex) => {
  const hasInventorySyncLogs = await knex.schema.hasTable("inventory_sync_logs");
  if (hasInventorySyncLogs) {
    return;
  }

  await knex.schema.createTable("inventory_sync_logs", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.uuid("triggered_by_user_id").nullable().references("id").inTable("users").onDelete("SET NULL");
    table.string("sync_status", 32).notNullable().defaultTo("success");
    table.integer("total_products").notNullable().defaultTo(0);
    table.integer("low_stock_count").notNullable().defaultTo(0);
    table.timestamp("last_synced_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["tenant_id", "last_synced_at"], "idx_inventory_sync_logs_tenant_synced_at");
  });
};

export async function up(knex: Knex): Promise<void> {
  await addLowStockThresholdColumn(knex);
  await createInventorySyncLogsTable(knex);
}

export async function down(knex: Knex): Promise<void> {
  const hasInventorySyncLogs = await knex.schema.hasTable("inventory_sync_logs");
  if (hasInventorySyncLogs) {
    await knex.schema.dropTableIfExists("inventory_sync_logs");
  }

  const hasTenantProducts = await knex.schema.hasTable("tenant_products");
  if (!hasTenantProducts) {
    return;
  }

  const hasLowStockThreshold = await knex.schema.hasColumn("tenant_products", "low_stock_threshold");
  if (hasLowStockThreshold) {
    await knex.schema.alterTable("tenant_products", (table) => {
      table.dropColumn("low_stock_threshold");
    });
  }
}
