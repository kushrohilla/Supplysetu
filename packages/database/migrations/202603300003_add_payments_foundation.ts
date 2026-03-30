import type { Knex } from "knex";

const createPaymentTransactionsTable = async (knex: Knex) => {
  const hasPaymentTransactions = await knex.schema.hasTable("payment_transactions");
  if (hasPaymentTransactions) {
    return;
  }

  await knex.schema.createTable("payment_transactions", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.uuid("retailer_id").notNullable().references("id").inTable("retailers").onDelete("RESTRICT");
    table.uuid("order_id").notNullable().references("id").inTable("orders").onDelete("CASCADE");
    table.integer("amount_paise").notNullable();
    table.string("payment_mode", 16).notNullable();
    table.text("reference_note").nullable();
    table.timestamp("paid_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.string("idempotency_key", 128).nullable();
    table.uuid("recorded_by_user_id").nullable().references("id").inTable("users").onDelete("SET NULL");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["tenant_id", "paid_at"], "idx_payment_transactions_tenant_paid_at");
    table.index(["tenant_id", "retailer_id"], "idx_payment_transactions_tenant_retailer");
    table.index(["tenant_id", "order_id"], "idx_payment_transactions_tenant_order");
    table.unique(["tenant_id", "idempotency_key"], {
      indexName: "uq_payment_transactions_tenant_idempotency",
    });
  });
};

const addRetailerCreditLimitColumn = async (knex: Knex) => {
  const hasRetailerLinks = await knex.schema.hasTable("retailer_distributor_links");
  if (!hasRetailerLinks) {
    return;
  }

  const hasCreditLimit = await knex.schema.hasColumn("retailer_distributor_links", "credit_limit_paise");
  if (hasCreditLimit) {
    return;
  }

  await knex.schema.alterTable("retailer_distributor_links", (table) => {
    table.integer("credit_limit_paise").notNullable().defaultTo(0);
  });
};

const addOrderPaymentModeColumn = async (knex: Knex) => {
  const hasOrders = await knex.schema.hasTable("orders");
  if (!hasOrders) {
    return;
  }

  const hasPaymentMode = await knex.schema.hasColumn("orders", "payment_mode");
  if (hasPaymentMode) {
    return;
  }

  await knex.schema.alterTable("orders", (table) => {
    table.string("payment_mode", 16).notNullable().defaultTo("cod");
  });
};

export async function up(knex: Knex): Promise<void> {
  await createPaymentTransactionsTable(knex);
  await addRetailerCreditLimitColumn(knex);
  await addOrderPaymentModeColumn(knex);
}

export async function down(knex: Knex): Promise<void> {
  const hasPaymentTransactions = await knex.schema.hasTable("payment_transactions");
  if (hasPaymentTransactions) {
    await knex.schema.dropTableIfExists("payment_transactions");
  }

  const hasRetailerLinks = await knex.schema.hasTable("retailer_distributor_links");
  const hasCreditLimit = hasRetailerLinks
    ? await knex.schema.hasColumn("retailer_distributor_links", "credit_limit_paise")
    : false;

  if (hasCreditLimit) {
    await knex.schema.alterTable("retailer_distributor_links", (table) => {
      table.dropColumn("credit_limit_paise");
    });
  }

  const hasOrders = await knex.schema.hasTable("orders");
  const hasPaymentMode = hasOrders ? await knex.schema.hasColumn("orders", "payment_mode") : false;

  if (hasPaymentMode) {
    await knex.schema.alterTable("orders", (table) => {
      table.dropColumn("payment_mode");
    });
  }
}
