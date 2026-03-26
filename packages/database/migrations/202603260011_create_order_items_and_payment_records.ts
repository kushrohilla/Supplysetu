import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasOrderItems = await knex.schema.hasTable("order_items");
  if (!hasOrderItems) {
    await knex.schema.createTable("order_items", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.uuid("order_id").notNullable().references("id").inTable("orders").onDelete("CASCADE");
      table.uuid("tenant_product_id").notNullable().references("id").inTable("tenant_products").onDelete("RESTRICT");
      table.integer("line_no").notNullable();

      // Product snapshot at order time
      table.string("sku_code_snapshot", 100).nullable();
      table.string("product_name_snapshot", 255).notNullable();
      table.string("pack_size_snapshot", 120).nullable();
      table.decimal("quantity", 12, 3).notNullable();
      table.decimal("unit_price_snapshot", 14, 2).notNullable();
      table.decimal("discount_amount_snapshot", 14, 2).notNullable().defaultTo(0);
      table.decimal("tax_rate_snapshot", 5, 2).notNullable().defaultTo(0);
      table.decimal("tax_amount_snapshot", 14, 2).notNullable().defaultTo(0);
      table.decimal("net_unit_price_snapshot", 14, 2).notNullable();
      table.decimal("line_total_snapshot", 14, 2).notNullable();

      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

      table.unique(["order_id", "line_no"], {
        indexName: "uq_order_items_order_line_no",
      });
      table.index(["order_id"], "idx_order_items_order");
      table.index(["tenant_product_id"], "idx_order_items_product");
    });
  }

  const hasPaymentRecords = await knex.schema.hasTable("payment_records");
  if (!hasPaymentRecords) {
    await knex.schema.createTable("payment_records", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.uuid("order_id").notNullable().references("id").inTable("orders").onDelete("CASCADE");
      table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
      table.string("payment_method", 32).notNullable();
      table.string("payment_status", 32).notNullable().defaultTo("pending");
      table.decimal("amount", 14, 2).notNullable();
      table.string("reference_number", 100).nullable();
      table.timestamp("paid_at", { useTz: true }).nullable();
      table.jsonb("metadata").notNullable().defaultTo("{}");
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

      table.index(["order_id"], "idx_payment_records_order");
      table.index(["tenant_id", "payment_status"], "idx_payment_records_tenant_status");
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("payment_records");
  await knex.schema.dropTableIfExists("order_items");
}
