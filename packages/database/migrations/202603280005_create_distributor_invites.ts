import type { Knex } from "knex";

const createDistributorInvitesTable = async (knex: Knex) => {
  await knex.schema.createTable("distributor_invites", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.text("invite_token").notNullable().unique();
    table.timestamp("expires_at", { useTz: true }).notNullable();
    table.boolean("is_used").notNullable().defaultTo(false);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["tenant_id"], "idx_distributor_invites_tenant_id");
    table.index(["invite_token"], "idx_distributor_invites_token");
  });
};

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable("distributor_invites");
  if (!hasTable) {
    await createDistributorInvitesTable(knex);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("distributor_invites");
}
