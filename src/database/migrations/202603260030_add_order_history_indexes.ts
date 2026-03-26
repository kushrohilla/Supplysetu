import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasOrdersTable = await knex.schema.hasTable("orders");
  if (!hasOrdersTable) {
    return;
  }

  await knex.schema.alterTable("orders", (table) => {
    table.index(["tenant_id", "created_at"], "idx_orders_tenant_created_at");
    table.index(["tenant_id", "status", "created_at"], "idx_orders_tenant_status_created_at");
    table.index(["tenant_id", "retailer_id", "created_at"], "idx_orders_tenant_retailer_created_at");
  });
}

export async function down(knex: Knex): Promise<void> {
  const hasOrdersTable = await knex.schema.hasTable("orders");
  if (!hasOrdersTable) {
    return;
  }

  await knex.schema.alterTable("orders", (table) => {
    table.dropIndex(["tenant_id", "created_at"], "idx_orders_tenant_created_at");
    table.dropIndex(["tenant_id", "status", "created_at"], "idx_orders_tenant_status_created_at");
    table.dropIndex(["tenant_id", "retailer_id", "created_at"], "idx_orders_tenant_retailer_created_at");
  });
}
