import type { Knex } from "knex";

const TABLES_TO_REBUILD = [
  "order_items",
  "orders",
  "retailer_distributor_links",
  "retailers",
] as const;

const dropCurrentRetailerAndOrderTables = async (knex: Knex) => {
  for (const tableName of TABLES_TO_REBUILD) {
    await knex.raw(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
  }

  await knex.raw('DROP TYPE IF EXISTS "order_status" CASCADE');
};

const createRetailersTable = async (knex: Knex) => {
  await knex.schema.createTable("retailers", (table) => {
    table.uuid("id").primary();
    table.text("phone").notNullable().unique();
    table.text("name").notNullable();
    table.text("owner_name").nullable();
    table.text("gst_number").nullable();
    table.text("address_line1").nullable();
    table.text("locality").nullable();
    table.text("city").nullable();
    table.text("state").nullable();
    table.text("pincode").nullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["phone"], "idx_retailers_phone");
  });
};

const createRetailerDistributorLinksTable = async (knex: Knex) => {
  await knex.schema.createTable("retailer_distributor_links", (table) => {
    table.uuid("id").primary();
    table.uuid("retailer_id").notNullable().references("id").inTable("retailers").onDelete("CASCADE");
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["tenant_id"], "idx_retailer_links_tenant_id");
    table.index(["retailer_id"], "idx_retailer_links_retailer_id");
    table.unique(["retailer_id", "tenant_id"], "uq_retailer_links_retailer_tenant");
  });
};

const createOrdersTable = async (knex: Knex) => {
  await knex.schema.createTable("orders", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.uuid("retailer_id").notNullable().references("id").inTable("retailers").onDelete("RESTRICT");
    table.text("order_number").notNullable().unique();
    table.enu("status", ["DRAFT", "PLACED", "CONFIRMED", "CANCELLED"], {
      useNative: true,
      enumName: "order_status",
    }).notNullable().defaultTo("DRAFT");
    table.decimal("total_amount", 12, 2).notNullable().defaultTo(0);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["tenant_id"], "idx_orders_tenant_id");
    table.index(["retailer_id"], "idx_orders_retailer_id");
    table.index(["tenant_id", "status"], "idx_orders_tenant_status");
  });
};

const createOrderItemsTable = async (knex: Knex) => {
  await knex.schema.createTable("order_items", (table) => {
    table.uuid("id").primary();
    table.uuid("order_id").notNullable().references("id").inTable("orders").onDelete("CASCADE");
    table.uuid("product_id").notNullable().references("id").inTable("tenant_products").onDelete("RESTRICT");
    table.integer("quantity").notNullable();
    table.decimal("price", 12, 2).notNullable();
    table.decimal("total_price", 12, 2).notNullable();

    table.index(["order_id"], "idx_order_items_order_id");
    table.index(["product_id"], "idx_order_items_product_id");
  });
};

export async function up(knex: Knex): Promise<void> {
  await dropCurrentRetailerAndOrderTables(knex);
  await createRetailersTable(knex);
  await createRetailerDistributorLinksTable(knex);
  await createOrdersTable(knex);
  await createOrderItemsTable(knex);
}

export async function down(knex: Knex): Promise<void> {
  await dropCurrentRetailerAndOrderTables(knex);
}
