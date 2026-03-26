import type { Knex } from "knex";

const getColumnType = async (knex: Knex, tableName: string, columnName: string): Promise<string | null> => {
  const result = await knex("information_schema.columns")
    .select("data_type")
    .where({
      table_schema: "public",
      table_name: tableName,
      column_name: columnName,
    })
    .first<{ data_type?: string }>();

  return result?.data_type ?? null;
};

const addReferenceColumn = (
  table: Knex.CreateTableBuilder,
  columnName: string,
  dataType: string | null,
  options: {
    nullable?: boolean;
    tableName: string;
    onDelete: "CASCADE" | "RESTRICT" | "SET NULL";
  },
) => {
  const { nullable = false, tableName, onDelete } = options;

  const builder =
    dataType === "uuid"
      ? table.uuid(columnName)
      : table.integer(columnName).unsigned();

  if (!nullable) {
    builder.notNullable();
  } else {
    builder.nullable();
  }

  builder.references("id").inTable(tableName).onDelete(onDelete);
};

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable("order_stock_locks");
  if (hasTable) {
    return;
  }

  const [orderIdType, orderLineItemIdType, tenantIdType, productIdType] = await Promise.all([
    getColumnType(knex, "orders", "id"),
    getColumnType(knex, "order_line_items", "id"),
    getColumnType(knex, "tenants", "id"),
    getColumnType(knex, "tenant_products", "id"),
  ]);

  await knex.schema.createTable("order_stock_locks", (table) => {
    table.increments("id").primary();
    addReferenceColumn(table, "order_id", orderIdType, { tableName: "orders", onDelete: "CASCADE" });
    addReferenceColumn(table, "order_line_item_id", orderLineItemIdType, {
      nullable: true,
      tableName: "order_line_items",
      onDelete: "SET NULL",
    });
    addReferenceColumn(table, "tenant_id", tenantIdType, { tableName: "tenants", onDelete: "CASCADE" });
    addReferenceColumn(table, "product_id", productIdType, { tableName: "tenant_products", onDelete: "RESTRICT" });
    table.decimal("locked_quantity", 12, 3).notNullable();
    table.string("status", 32).notNullable().defaultTo("active");
    table.timestamp("locked_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("released_at", { useTz: true }).nullable();
    table.json("metadata").nullable();
    table.timestamps(true, true);

    table.index(["tenant_id", "product_id", "status"], "idx_order_stock_locks_product_status");
    table.index(["order_id"], "idx_order_stock_locks_order");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("order_stock_locks");
}
