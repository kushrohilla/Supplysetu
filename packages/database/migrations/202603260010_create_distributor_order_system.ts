import type { Knex } from "knex";

const ORDER_STATUS_VALUES = [
  "draft",
  "pending_approval",
  "confirmed",
  "packed",
  "dispatched",
  "delivered",
  "cancelled",
] as const;

export async function up(knex: Knex): Promise<void> {
  const hasDistributorAddresses = await knex.schema.hasTable("distributor_addresses");
  if (!hasDistributorAddresses) {
    await knex.schema.createTable("distributor_addresses", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
      table.string("label", 100).notNullable();
      table.string("contact_person", 120).nullable();
      table.string("contact_phone", 20).nullable();
      table.string("line_1", 255).notNullable();
      table.string("line_2", 255).nullable();
      table.string("landmark", 150).nullable();
      table.string("city", 80).notNullable();
      table.string("state", 80).notNullable();
      table.string("postal_code", 20).notNullable();
      table.string("country", 80).notNullable().defaultTo("India");
      table.boolean("is_default").notNullable().defaultTo(false);
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

      table.index(["tenant_id"], "idx_distributor_addresses_tenant");
      table.index(["tenant_id", "is_default"], "idx_distributor_addresses_default");
    });
  }

  const hasOrders = await knex.schema.hasTable("orders");
  if (!hasOrders) {
    await knex.schema.createTable("orders", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
      table.uuid("retailer_id").notNullable().references("id").inTable("retailers").onDelete("RESTRICT");
      table.uuid("distributor_address_id").nullable().references("id").inTable("distributor_addresses").onDelete("SET NULL");
      table.string("order_number", 40).notNullable().unique();
      table
        .enu("order_status", [...ORDER_STATUS_VALUES], {
          useNative: true,
          enumName: "order_status",
        })
        .notNullable()
        .defaultTo("pending_approval");
      table.string("payment_term", 32).notNullable().defaultTo("cash");
      table.decimal("subtotal_amount", 14, 2).notNullable().defaultTo(0);
      table.decimal("discount_amount", 14, 2).notNullable().defaultTo(0);
      table.decimal("tax_amount", 14, 2).notNullable().defaultTo(0);
      table.decimal("shipping_amount", 14, 2).notNullable().defaultTo(0);
      table.decimal("total_amount", 14, 2).notNullable().defaultTo(0);
      table.string("currency_code", 3).notNullable().defaultTo("INR");
      table.date("expected_delivery_date").nullable();
      table.text("notes").nullable();
      table.jsonb("metadata").notNullable().defaultTo("{}");
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

      table.index(["tenant_id", "order_status"], "idx_orders_tenant_status");
      table.index(["tenant_id", "retailer_id"], "idx_orders_tenant_retailer");
      table.index(["created_at"], "idx_orders_created_at");
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasOrders = await knex.schema.hasTable("orders");
  if (hasOrders) {
    await knex.schema.dropTableIfExists("orders");
  }

  const hasDistributorAddresses = await knex.schema.hasTable("distributor_addresses");
  if (hasDistributorAddresses) {
    await knex.schema.dropTableIfExists("distributor_addresses");
  }

  await knex.raw("DROP TYPE IF EXISTS order_status");
}
