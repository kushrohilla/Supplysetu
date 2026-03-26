import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasRetailers = await knex.schema.hasTable("retailers");
  const hasOrders = await knex.schema.hasTable("orders");

  // This legacy migration targets the pre-UUID schema. Skip it when the modern order stack already exists.
  if (hasRetailers || hasOrders) {
    return;
  }

  // Retailers table - global identity
  await knex.schema.createTable("retailers", (table) => {
    table.increments("id").primary();
    table.string("phone", 20).unique().notNullable();
    table.string("name", 100).notNullable();
    table.string("locality", 100);
    table.string("city", 50);
    table.string("state", 50);
    table.string("owner_name", 100);
    table.string("credit_line_status").defaultTo("none"); // none, pending, active, blocked
    table.timestamps(true, true);
    table.index("phone");
  });

  // Retailer-Distributor links (many-to-many with metadata)
  await knex.schema.createTable("retailer_distributor_links", (table) => {
    table.increments("id").primary();
    table.integer("retailer_id").unsigned().notNullable().references("id").inTable("retailers").onDelete("CASCADE");
    table.integer("tenant_id").unsigned().notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.string("status").defaultTo("active"); // active, inactive, suspended
    table.datetime("last_ordered_at");
    table.integer("total_orders").defaultTo(0);
    table.decimal("total_order_value", 12, 2).defaultTo(0);
    table.string("referral_code");
    table.timestamps(true, true);
    table.unique(["retailer_id", "tenant_id"]);
    table.index("retailer_id");
    table.index("tenant_id");
    table.index("status");
  });

  // Order line items table (junction for orders-products)
  await knex.schema.createTable("order_line_items", (table) => {
    table.increments("id").primary();
    table.integer("order_id").unsigned().notNullable().references("id").inTable("orders").onDelete("CASCADE");
    table.integer("product_id").unsigned().notNullable().references("id").inTable("tenant_products").onDelete("RESTRICT");
    table.integer("quantity").unsigned().notNullable();
    table.decimal("unit_price", 10, 2).notNullable(); // locked at order time
    table.decimal("line_total", 12, 2).notNullable(); // quantity × unit_price
    table.string("scheme_code"); // if scheme applied
    table.decimal("scheme_discount", 10, 2).defaultTo(0);
    table.timestamps(true, true);
    table.index("order_id");
    table.index("product_id");
  });

  // Payment transactions (tracks cash/credit/advance payments)
  await knex.schema.createTable("order_payments", (table) => {
    table.increments("id").primary();
    table.integer("order_id").unsigned().notNullable().references("id").inTable("orders").onDelete("CASCADE");
    table.string("payment_type").notNullable(); // cash, advance, credit_tag
    table.decimal("amount", 12, 2).notNullable();
    table.string("payment_status").defaultTo("pending"); // pending, confirmed, failed, refunded
    table.string("transaction_id");
    table.json("metadata"); // for payment gateway responses
    table.timestamps(true, true);
    table.index("order_id");
    table.index("payment_status");
  });

  // Inventory sync log (tracks last stock snapshot per tenant)
  await knex.schema.createTable("inventory_sync_logs", (table) => {
    table.increments("id").primary();
    table.integer("tenant_id").unsigned().notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.datetime("last_sync_at").notNullable();
    table.integer("total_stock_items").defaultTo(0);
    table.string("sync_status").defaultTo("success"); // success, partial, failed
    table.json("error_details");
    table.timestamps(true, true);
    table.index("tenant_id");
    table.index("last_sync_at");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("inventory_sync_logs");
  await knex.schema.dropTableIfExists("order_payments");
  await knex.schema.dropTableIfExists("order_line_items");
  await knex.schema.dropTableIfExists("retailer_distributor_links");
  await knex.schema.dropTableIfExists("retailers");
}
