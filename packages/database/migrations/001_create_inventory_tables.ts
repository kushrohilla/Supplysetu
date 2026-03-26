import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Inventory snapshot table - canonical stock availability view
  await knex.schema.createTable('inventory_snapshots', (table) => {
    table.increments('id').primary();
    table.string('tenant_id', 100).notNullable();
    table.string('product_id', 100).notNullable();
    
    // Stock quantities (non-negative)
    table.integer('available_quantity').notNullable().defaultTo(0);
    table.integer('reserved_quantity').notNullable().defaultTo(0); // Future use for order reservations
    table.integer('committed_quantity').notNullable().defaultTo(0); // Accounting system master value
    
    // Metadata & audit
    table.timestamp('last_synced_at').notNullable();
    table.string('sync_source_reference', 255); // e.g., invoice_id or batch_id from accounting system
    table.string('sync_job_id', 100); // Reference to sync_jobs table
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    
    // Indices for performance
    table.unique(['tenant_id', 'product_id'], { indexName: 'idx_inventory_tenant_product' });
    table.index('tenant_id', 'idx_inventory_tenant');
    table.index('last_synced_at', 'idx_inventory_sync_time');
    table.index(['available_quantity', 'tenant_id'], 'idx_inventory_lowstock');
  });

  // Inventory sync jobs log table - track all sync attempts
  await knex.schema.createTable('inventory_sync_jobs', (table) => {
    table.string('id', 100).primary(); // UUID or snowflake ID
    table.string('tenant_id', 100).notNullable();
    table.enum('sync_status', ['pending', 'in_progress', 'success', 'partial', 'failed']).notNullable().defaultTo('pending');
    table.enum('sync_type', ['batch_import', 'webhook_delta', 'manual_reconciliation']).notNullable();
    
    // Sync metadata
    table.string('source_file_path', 500); // For batch imports: S3 path or local reference
    table.integer('records_processed').notNullable().defaultTo(0);
    table.integer('records_succeeded').notNullable().defaultTo(0);
    table.integer('records_failed').notNullable().defaultTo(0);
    
    // Error tracking
    table.text('failure_reason'); // JSON array of errors if any
    table.text('processing_log'); // Detailed execution log
    
    // Timing
    table.timestamp('started_at').notNullable();
    table.timestamp('completed_at');
    table.integer('execution_time_ms'); // Duration in milliseconds
    
    // Audit trail
    table.string('triggered_by', 100); // user_id or 'system' for scheduled jobs
    table.string('triggered_by_source', 50).defaultTo('scheduled'); // 'manual' | 'scheduled' | 'webhook'
    
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    
    // Indices
    table.index('tenant_id', 'idx_sync_tenant');
    table.index(['sync_status', 'tenant_id'], 'idx_sync_status');
    table.index('started_at', 'idx_sync_time');
  });

  // Inventory audit log - maintains full history of quantity changes
  await knex.schema.createTable('inventory_audit_log', (table) => {
    table.increments('id').primary();
    table.string('tenant_id', 100).notNullable();
    table.string('product_id', 100).notNullable();
    table.string('sync_job_id', 100).notNullable();
    
    // Change details
    table.integer('quantity_before').notNullable();
    table.integer('quantity_after').notNullable();
    table.integer('quantity_delta').notNullable();
    table.enum('change_reason', ['sync_import', 'manual_adjustment', 'order_reservation', 'order_fulfillment', 'reconciliation']).notNullable();
    
    // Source reference
    table.string('source_invoice_id', 100); // From accounting system
    table.string('source_order_id', 100); // Internal or external order reference
    
    table.timestamp('recorded_at').notNullable().defaultTo(knex.fn.now());
    table.index(['tenant_id', 'product_id'], 'idx_audit_product');
    table.index('recorded_at', 'idx_audit_time');
  });

  // Configuration table for distributor sync preferences
  await knex.schema.createTable('inventory_sync_config', (table) => {
    table.increments('id').primary();
    table.string('tenant_id', 100).notNullable().unique();
    
    // Sync behavior settings
    table.boolean('auto_sync_enabled').notNullable().defaultTo(false);
    table.string('sync_frequency_cron', 255); // e.g., '0 2 * * *' for daily 2 AM
    table.integer('low_stock_threshold_percent').notNullable().defaultTo(20); // Alert when < 20% of max
    table.boolean('strict_order_validation').notNullable().defaultTo(false); // Hard block if stock unavailable
    
    // File import config (batch sync)
    table.enum('import_format', ['csv', 'json', 'xml']).defaultTo('csv');
    table.string('accounting_system_type', 50); // 'tally', 'sap', 'custom_api'
    
    // Webhook config (future Phase-2)
    table.string('webhook_url', 500); // Accounting system webhook endpoint
    table.string('webhook_secret', 255); // HMAC secret for verification
    
    // Retry policy
    table.integer('max_retry_attempts').notNullable().defaultTo(3);
    table.integer('retry_backoff_ms').notNullable().defaultTo(5000); // Exponential backoff base
    
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    
    table.index('tenant_id', 'idx_sync_config_tenant');
  });

  // Sync failure queue - for retry logic
  await knex.schema.createTable('inventory_sync_queue', (table) => {
    table.increments('id').primary();
    table.string('tenant_id', 100).notNullable();
    table.string('sync_job_id', 100).notNullable();
    
    table.json('payload'); // Original sync data to retry
    table.integer('retry_count').notNullable().defaultTo(0);
    table.timestamp('next_retry_at').notNullable();
    table.text('last_error');
    
    table.enum('status', ['pending', 'processing', 'failed_permanently']).notNullable().defaultTo('pending');
    
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    
    table.index(['status', 'next_retry_at'], 'idx_queue_retry');
    table.index('tenant_id', 'idx_queue_tenant');
  });

  // Low stock alerts table
  await knex.schema.createTable('inventory_low_stock_alerts', (table) => {
    table.increments('id').primary();
    table.string('tenant_id', 100).notNullable();
    table.string('product_id', 100).notNullable();
    
    table.integer('current_available_qty').notNullable();
    table.integer('threshold_qty').notNullable();
    table.enum('alert_status', ['active', 'acknowledged', 'resolved']).notNullable().defaultTo('active');
    
    // Who acknowledged
    table.string('acknowledged_by_user_id', 100);
    table.timestamp('acknowledged_at');
    
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    
    table.index(['tenant_id', 'alert_status'], 'idx_alert_status');
    table.index('created_at', 'idx_alert_time');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('inventory_low_stock_alerts');
  await knex.schema.dropTableIfExists('inventory_sync_queue');
  await knex.schema.dropTableIfExists('inventory_sync_config');
  await knex.schema.dropTableIfExists('inventory_audit_log');
  await knex.schema.dropTableIfExists('inventory_sync_jobs');
  await knex.schema.dropTableIfExists('inventory_snapshots');
}
