import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasTenantLogo = await knex.schema.hasColumn("tenants", "distributor_logo_url");
  if (!hasTenantLogo) {
    await knex.schema.alterTable("tenants", (table) => {
      table.string("distributor_logo_url", 512).nullable();
    });
  }

  const hasServiceCity = await knex.schema.hasColumn("tenants", "service_city");
  if (!hasServiceCity) {
    await knex.schema.alterTable("tenants", (table) => {
      table.string("service_city", 128).nullable();
    });
  }

  const hasInviteTable = await knex.schema.hasTable("distributor_invites");
  if (!hasInviteTable) {
    await knex.schema.createTable("distributor_invites", (table) => {
      table.uuid("id").primary();
      table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
      table.string("invite_code", 8).notNullable().unique();
      table.uuid("created_by_user").nullable().references("id").inTable("users").onDelete("SET NULL");
      table.boolean("is_revoked").notNullable().defaultTo(false);
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

      table.index(["tenant_id", "is_revoked"]);
      table.index("invite_code");
    });
  }

  const hasNetworkTable = await knex.schema.hasTable("retailer_supplier_network");
  if (!hasNetworkTable) {
    await knex.schema.createTable("retailer_supplier_network", (table) => {
      table.uuid("id").primary();
      table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
      table.string("retailer_id", 128).notNullable();
      table.string("join_source", 32).notNullable().defaultTo("invite_link");
      table.string("status", 32).notNullable().defaultTo("active");
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

      table.unique(["tenant_id", "retailer_id"]);
      table.index("tenant_id");
      table.index("retailer_id");
      table.index(["tenant_id", "status"]);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("retailer_supplier_network");
  await knex.schema.dropTableIfExists("distributor_invites");
}
