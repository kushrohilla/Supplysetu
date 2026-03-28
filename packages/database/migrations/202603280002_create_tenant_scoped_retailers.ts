import type { Knex } from "knex";

const createRetailersTable = async (knex: Knex) => {
  await knex.schema.createTable("retailers", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.text("name").notNullable();
    table.text("owner_name").nullable();
    table.text("mobile_number").notNullable();
    table.text("gst_number").nullable();
    table.text("address_line1").nullable();
    table.text("city").nullable();
    table.text("state").nullable();
    table.text("pincode").nullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["tenant_id"]);
    table.unique(["tenant_id", "mobile_number"]);
  });
};

export async function up(knex: Knex): Promise<void> {
  const hasRetailerDistributorLinks = await knex.schema.hasTable("retailer_distributor_links");
  if (hasRetailerDistributorLinks) {
    await knex.schema.dropTable("retailer_distributor_links");
  }

  const hasRetailers = await knex.schema.hasTable("retailers");
  if (hasRetailers) {
    await knex.schema.dropTable("retailers");
  }

  await createRetailersTable(knex);
}

export async function down(knex: Knex): Promise<void> {
  const hasRetailers = await knex.schema.hasTable("retailers");
  if (hasRetailers) {
    await knex.schema.dropTable("retailers");
  }
}
