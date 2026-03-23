/**
 * Inventory Module - Type Definitions
 * 
 * Defines the core data structures for inventory management,
 * sync operations, and accounting system integration.
 */

export interface InventorySnapshot {
  id: number;
  tenant_id: string;
  product_id: string;
  available_quantity: number;
  reserved_quantity: number;
  committed_quantity: number; // Master from accounting system
  last_synced_at: Date;
  sync_source_reference?: string; // e.g., invoice_id from Tally
  sync_job_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface InventorySyncJob {
  id: string; // UUID or Snowflake ID
  tenant_id: string;
  sync_status: SyncStatus;
  sync_type: SyncType;
  source_file_path?: string;
  records_processed: number;
  records_succeeded: number;
  records_failed: number;
  failure_reason?: string; // JSON array stringified
  processing_log?: string;
  started_at: Date;
  completed_at?: Date;
  execution_time_ms?: number;
  triggered_by: string; // user_id or 'system'
  triggered_by_source: 'manual' | 'scheduled' | 'webhook';
  created_at: Date;
}

export type SyncStatus = 'pending' | 'in_progress' | 'success' | 'partial' | 'failed';
export type SyncType = 'batch_import' | 'webhook_delta' | 'manual_reconciliation';

export interface InventoryAuditLog {
  id: number;
  tenant_id: string;
  product_id: string;
  sync_job_id: string;
  quantity_before: number;
  quantity_after: number;
  quantity_delta: number;
  change_reason: ChangeReason;
  source_invoice_id?: string;
  source_order_id?: string;
  recorded_at: Date;
}

export type ChangeReason =
  | 'sync_import'
  | 'manual_adjustment'
  | 'order_reservation'
  | 'order_fulfillment'
  | 'reconciliation';

export interface InventorySyncConfig {
  id: number;
  tenant_id: string;
  auto_sync_enabled: boolean;
  sync_frequency_cron: string; // e.g., '0 2 * * *'
  low_stock_threshold_percent: number;
  strict_order_validation: boolean; // Hard block vs. warning
  import_format: 'csv' | 'json' | 'xml';
  accounting_system_type: string; // 'tally', 'sap', etc.
  webhook_url?: string;
  webhook_secret?: string;
  max_retry_attempts: number;
  retry_backoff_ms: number;
  created_at: Date;
  updated_at: Date;
}

export interface InventorySyncQueueItem {
  id: number;
  tenant_id: string;
  sync_job_id: string;
  payload: Record<string, any>;
  retry_count: number;
  next_retry_at: Date;
  last_error?: string;
  status: 'pending' | 'processing' | 'failed_permanently';
  created_at: Date;
  updated_at: Date;
}

export interface InventoryLowStockAlert {
  id: number;
  tenant_id: string;
  product_id: string;
  current_available_qty: number;
  threshold_qty: number;
  alert_status: 'active' | 'acknowledged' | 'resolved';
  acknowledged_by_user_id?: string;
  acknowledged_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Batch Import Data Structures
 * These represent the structure from accounting system exports
 */

export interface AccountingExportRecord {
  product_id: string;
  product_name: string;
  sku: string;
  warehouse_available: number; // Master quantity from accounting
  reserved: number;
  unit_of_measure: string;
  last_count_date: string; // ISO date
  invoice_id?: string; // For traceability
  notes?: string;
}

export interface BatchImportPayload {
  tenant_id: string;
  batch_id: string; // Unique identifier for this sync batch
  import_format: 'csv' | 'json' | 'xml';
  records: AccountingExportRecord[];
  sync_timestamp: Date;
  source_system: string; // 'tally', 'sap', etc.
}

/**
 * Sync Response Structures
 */

export interface SyncResult {
  sync_job_id: string;
  status: SyncStatus;
  total_records: number;
  succeeded: number;
  failed: number;
  errors: SyncError[];
  execution_time_ms: number;
  message: string;
}

export interface SyncError {
  record_index: number;
  product_id?: string;
  error_code: string;
  error_message: string;
  details?: Record<string, any>;
}

/**
 * Inventory Query/Response Models
 */

export interface StockSnapshot {
  product_id: string;
  available_quantity: number;
  committed_quantity: number;
  reserved_quantity: number;
  last_synced_at: Date;
  is_low_stock: boolean;
  can_fulfill_order: boolean; // Soft validation result
}

export interface InventoryDashboardWidget {
  total_products: number;
  products_in_stock: number;
  products_low_stock: number;
  products_out_of_stock: number;
  last_sync_timestamp: Date;
  next_scheduled_sync?: Date;
  sync_health_percentage: number; // % of products successfully synced
}
