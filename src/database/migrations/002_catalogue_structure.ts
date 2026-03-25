import type { Knex } from "knex";

/**
 * 002_CATALOGUE_STRUCTURE
 *
 * Domain: Product Information Management (PIM)
 *
 * Establishes the product universe with clear separation between:
 * - Global products: Immutable system-wide product definitions
 * - Tenant products: Distributor-specific customizations and pricing
 *
 * Tables:
 * - global_brands: System-wide product brands (immutable)
 * - global_products: Standard product definitions (immutable)
 * - tenant_products: Tenant-specific product customizations
 * - tenant_product_schemes: Time-boxed pricing schemes and promotions
 * - tenant_product_stock_snapshots: Point-in-time stock records (immutable, historical)
 * - tenant_product_import_jobs: Batch product import tracking
 * - tenant_product_import_rows: Row-level import validation details
 */

export async function up(knex: Knex): Promise<void> {
  // IMMUTABLE: Global product brand master data
  await knex.schema.createTable("global_brands", (table) => {
    table.uuid("id").primary();
    table.string("name", 255).notNullable().unique();
    table.string("source", 64).notNullable().defaultTo("supplysetu");
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // IMMUTABLE: Global product definitions (reference data)
  await knex.schema.createTable("global_products", (table) => {
    table.uuid("id").primary();
    table.uuid("brand_id").notNullable().references("id").inTable("global_brands").onDelete("RESTRICT");
    table.string("standard_name", 255).notNullable();
    table.string("pack_size", 120).notNullable();
    table.string("uom", 32).nullable();
    table.string("image_url", 1024).nullable();
    table.text("description").nullable();
    table.jsonb("classification").notNullable().defaultTo("{}");
    table.decimal("mrp", 12, 2).nullable();
    table.decimal("suggested_price_min", 12, 2).nullable();
    table.decimal("suggested_price_max", 12, 2).nullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(["brand_id", "standard_name", "pack_size"]);
    table.index(["brand_id", "is_active"]);
  });

  // MUTABLE: Tenant-specific product customizations
  await knex.schema.createTable("tenant_products", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.uuid("global_product_id").nullable().references("id").inTable("global_products").onDelete("SET NULL");
    table.uuid("brand_id").nullable().references("id").inTable("global_brands").onDelete("SET NULL");
    table.string("product_name", 255).notNullable();
    table.string("pack_size", 120).notNullable();
    table.string("sku_code", 100).notNullable();
    table.decimal("base_price", 12, 2).notNullable();
    table.decimal("advance_price", 12, 2).nullable();
    table.string("status", 32).notNullable().defaultTo("active");
    table.string("performance_band", 32).notNullable().defaultTo("inactive");
    table.decimal("opening_stock_snapshot", 14, 3).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(["tenant_id", "sku_code"]);
    table.index(["tenant_id", "brand_id", "status"]);
    table.index(["tenant_id", "global_product_id"]);
  });

  // MUTABLE: Time-boxed pricing schemes and promotions
  await knex.schema.createTable("tenant_product_schemes", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.uuid("tenant_product_id").notNullable().references("id").inTable("tenant_products").onDelete("CASCADE");
    table.string("scheme_text", 255).notNullable();
    table.date("start_date").nullable();
    table.date("end_date").nullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["tenant_id", "tenant_product_id", "is_active"]);
    table.index(["tenant_id", "start_date", "end_date"]);
  });

  // IMMUTABLE: Point-in-time stock snapshots (historical record)
  await knex.schema.createTable("tenant_product_stock_snapshots", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.uuid("tenant_product_id").notNullable().references("id").inTable("tenant_products").onDelete("CASCADE");
    table.decimal("stock_qty", 14, 3).notNullable();
    table.string("source", 64).notNullable().defaultTo("accounting_sync");
    table.timestamp("captured_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["tenant_id", "tenant_product_id", "captured_at"]);
  });

  // MUTABLE: Product import job tracking (for batch operations)
  await knex.schema.createTable("tenant_product_import_jobs", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.uuid("created_by_user_id").nullable().references("id").inTable("users").onDelete("SET NULL");
    table.string("source_type", 32).notNullable().defaultTo("csv");
    table.string("status", 32).notNullable().defaultTo("uploaded");
    table.integer("total_rows").notNullable().defaultTo(0);
    table.integer("success_rows").notNullable().defaultTo(0);
    table.integer("failed_rows").notNullable().defaultTo(0);
    table.jsonb("summary").notNullable().defaultTo("{}");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["tenant_id", "status", "created_at"]);
  });

  // IMMUTABLE: Row-level import validation details (audit trail for imports)
  await knex.schema.createTable("tenant_product_import_rows", (table) => {
    table.uuid("id").primary();
    table.uuid("import_job_id").notNullable().references("id").inTable("tenant_product_import_jobs").onDelete("CASCADE");
    table.integer("row_no").notNullable();
    table.jsonb("raw_payload").notNullable().defaultTo("{}");
    table.string("validation_status", 32).notNullable().defaultTo("pending");
    table.jsonb("error_codes").notNullable().defaultTo("[]");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["import_job_id", "validation_status"]);
    table.unique(["import_job_id", "row_no"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("tenant_product_import_rows");
  await knex.schema.dropTableIfExists("tenant_product_import_jobs");
  await knex.schema.dropTableIfExists("tenant_product_stock_snapshots");
  await knex.schema.dropTableIfExists("tenant_product_schemes");
  await knex.schema.dropTableIfExists("tenant_products");
  await knex.schema.dropTableIfExists("global_products");
  await knex.schema.dropTableIfExists("global_brands");
}
