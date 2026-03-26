import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("tenants", (table) => {
    table.uuid("id").primary();
    table.string("code", 64).notNullable().unique();
    table.string("name", 255).notNullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("users", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.string("email", 255).notNullable();
    table.string("password_hash", 255).notNullable();
    table.string("role", 64).notNullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(["tenant_id", "email"]);
    table.index(["tenant_id", "role"]);
  });

  await knex.schema.createTable("audit_logs", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.uuid("actor_user_id").nullable().references("id").inTable("users").onDelete("SET NULL");
    table.string("actor_role", 64).nullable();
    table.string("entity_type", 64).notNullable();
    table.string("entity_id", 128).notNullable();
    table.string("action", 128).notNullable();
    table.jsonb("metadata").notNullable().defaultTo("{}");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["tenant_id", "entity_type", "entity_id"]);
    table.index(["tenant_id", "action"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("audit_logs");
  await knex.schema.dropTableIfExists("users");
  await knex.schema.dropTableIfExists("tenants");
}
