import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasBrands = await knex.schema.hasTable("global_brands");
  if (!hasBrands) {
    return;
  }

  await knex.schema.alterTable("global_brands", (table) => {
    table.dropUnique(["name"]);
  });

  await knex.schema.alterTable("global_brands", (table) => {
    table.unique(["name", "source"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  const hasBrands = await knex.schema.hasTable("global_brands");
  if (!hasBrands) {
    return;
  }

  await knex.schema.alterTable("global_brands", (table) => {
    table.dropUnique(["name", "source"]);
  });

  await knex.schema.alterTable("global_brands", (table) => {
    table.unique(["name"]);
  });
}
