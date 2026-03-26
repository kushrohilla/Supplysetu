import type { Knex } from "knex";

/**
 * 005_PAYMENT_TRANSACTIONS
 *
 * Domain: Financial Transactions & Accounting
 *
 * Tracks every rupee flowing through the system.
 * Supports partial payments, installments, and reconciliation with accounting systems.
 *
 * Design:
 * - Immutable transaction log (append-only)
 * - Payment methods: cash, check, transfer, credit
 * - Reconciliation states: pending → reconciled or disputed
 *
 * Tables:
 * - order_payments: Payment records linked to orders (allows multiple payments per order)
 * - payment_transaction_log: Immutable financial transaction record
 */

export async function up(knex: Knex): Promise<void> {
  // MUTABLE: Order-level payment status tracking (convenience view)
  // Actual immutable records stored in payment_transaction_log
  await knex.schema.createTable("order_payments", (table) => {
    table.uuid("id").primary();
    table.uuid("order_id").notNullable().references("id").inTable("orders").onDelete("CASCADE");
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");

    // Payment method and amount
    table.string("payment_method", 32).notNullable(); // cash, check, transfer, credit
    table.decimal("amount", 12, 2).notNullable();

    // Payment mode reason (why this payment method?)
    table.string("payment_mode_reason", 100).nullable(); // e.g., due_date_breach_discount, advance_incentive
    table.decimal("discount_amount", 12, 2).defaultTo(0);

    // Payment reference
    table.string("payment_reference", 100).nullable(); // Cheque number, transfer receipt, etc.

    // Status tracking
    table.string("payment_status", 32).notNullable().defaultTo("pending"); // pending, confirmed, failed, refunded, disputed

    // Reconciliation
    table.string("reconciliation_status", 32).defaultTo("accounting_sync_pending"); // accounting_sync_pending, reconciled, dispute
    table.string("accounting_journal_reference", 100).nullable(); // Link to accounting system entry

    // Metadata and gateway responses
    table.jsonb("metadata").notNullable().defaultTo("{}");

    // Audit trail
    table.uuid("created_by_user_id").nullable().references("id").inTable("users").onDelete("SET NULL");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("order_id");
    table.index("tenant_id");
    table.index("payment_status");
    table.index("reconciliation_status");
  });

  // IMMUTABLE: Financial transaction log (single source of truth for accounting)
  // Append-only ledger for audit compliance and dispute resolution
  await knex.schema.createTable("payment_transaction_log", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.uuid("order_id").notNullable().references("id").inTable("orders").onDelete("RESTRICT");
    table.uuid("order_payment_id").nullable().references("id").inTable("order_payments").onDelete("SET NULL");

    // Core transaction details
    table.string("transaction_type", 32).notNullable(); // payment, refund, adjustment, reversal
    table.decimal("amount", 12, 2).notNullable();
    table.string("payment_method", 32).notNullable(); // cash, check, transfer, credit
    table.string("payment_mode_reason", 100).nullable();

    // Reference tracking
    table.string("payment_reference", 100).nullable(); // Cheque#, transfer receipt, etc.
    table.string("external_transaction_id", 100).nullable(); // From payment gateway

    // Reconciliation details
    table.string("reconciliation_status", 32).defaultTo("pending"); // pending, reconciled, dispute, reversal_pending
    table.string("accounting_journal_reference", 100).nullable();

    // Dispute/Reversal tracking
    table.uuid("related_transaction_id").nullable().references("id").inTable("payment_transaction_log").onDelete("SET NULL");
    table.string("dispute_reason", 255).nullable(); // Why was this disputed/reversed?

    // Audit trail
    table.uuid("recorded_by_user_id").nullable().references("id").inTable("users").onDelete("SET NULL");
    table.uuid("reconciled_by_user_id").nullable().references("id").inTable("users").onDelete("SET NULL");
    table.timestamp("reconciled_at", { useTz: true }).nullable();
    table.text("reconciliation_notes").nullable();

    // Immutable record
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Indexes for queries
    table.index(["tenant_id", "order_id"], "idx_payment_order");
    table.index(["tenant_id", "created_at"], "idx_payment_tenant_time");
    table.index(["reconciliation_status"], "idx_payment_reconciliation");
    table.index(["transaction_type"], "idx_payment_type");
  });

  // MUTABLE: Payment sync configuration (ties to accounting system)
  await knex.schema.createTable("payment_sync_config", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE").unique();

    // Accounting system details
    table.string("accounting_system_type", 50).notNullable(); // 'tally', 'quickbooks', 'custom_api'
    table.string("account_code", 50).nullable(); // GL account for receivables
    table.jsonb("system_credentials").notNullable().defaultTo("{}");

    // Sync behavior
    table.boolean("auto_sync_enabled").notNullable().defaultTo(false);
    table.string("sync_frequency_cron", 50).nullable(); // e.g., '0 */4 * * *' for every 4 hours
    table.timestamp("last_sync_at", { useTz: true }).nullable();

    // Reconciliation rules
    table.integer("reconciliation_tolerance_days").notNullable().defaultTo(7); // Tolerance window for matching
    table.decimal("reconciliation_tolerance_amount", 12, 2).defaultTo(0); // Rounding tolerance

    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("tenant_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("payment_sync_config");
  await knex.schema.dropTableIfExists("payment_transaction_log");
  await knex.schema.dropTableIfExists("order_payments");
}
