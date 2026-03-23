/**
 * Inventory UI Components Design
 * 
 * Components for:
 * - Admin Dashboard (stock management, low stock alerts, sync history)
 * - Retailer App (stock visibility, order validation)
 */

// ============================================
// ADMIN DASHBOARD COMPONENTS
// ============================================

/**
 * InventoryHealthCard
 * 
 * Displays high-level inventory dashboard metrics
 * 
 * Props:
 * - totalProducts: number
 * - inStock: number
 * - lowStock: number
 * - outOfStock: number
 * - healthPercentage: number (0-100)
 * - lastSyncAt: Date
 * 
 * Usage:
 * <InventoryHealthCard
 *   totalProducts={250}
 *   inStock={210}
 *   lowStock={35}
 *   outOfStock={5}
 *   healthPercentage={86}
 *   lastSyncAt={new Date()}
 * />
 */
export interface InventoryHealthCardProps {
  totalProducts: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  healthPercentage: number;
  lastSyncAt: Date;
  onRefresh?: () => void; // Manual sync trigger
}

/**
 * LowStockAlertsPanel
 * 
 * Shows list of low stock products in a table/list
 * Allows filtering by severity and acknowledgment
 * 
 * Props:
 * - alerts: LowStockAlert[]
 * - onAcknowledge: (alertId: number) => void
 * - onFilterChange: (severity: 'critical' | 'warning' | 'all') => void
 * 
 * Columns:
 * - Product Name / SKU
 * - Current Stock
 * - Threshold
 * - Severity Badge
 * - Status (Active / Acknowledged)
 * - Actions (Acknowledge button)
 */
export interface LowStockAlertsPanelProps {
  alerts: {
    id: number;
    product_id: string;
    product_name: string;
    current_qty: number;
    threshold_qty: number;
    severity: 'critical' | 'warning';
    status: 'active' | 'acknowledged';
    created_at: Date;
  }[];
  onAcknowledge?: (alertId: number, userId: string) => void;
  loading?: boolean;
}

/**
 * InventoryTable
 * 
 * Comprehensive product inventory grid
 * Sortable columns, search, filter by brand/category
 * 
 * Props:
 * - products: InventoryRow[]
 * - onSort: (field: string, direction: 'asc' | 'desc') => void
 * - onSearch: (query: string) => void
 * - onFilter: (filters: ProductFilters) => void
 * 
 * Columns:
 * - Product Name
 * - SKU
 * - Brand
 * - Category
 * - Available Qty (with color: green/yellow/red)
 * - Committed Qty (from accounting system)
 * - Reserved Qty
 * - Last Sync
 * - Status Badge (In Stock / Low / Out)
 */
export interface InventoryRow {
  product_id: string;
  product_name: string;
  sku: string;
  brand: string;
  category: string;
  available_qty: number;
  committed_qty: number;
  reserved_qty: number;
  last_synced_at: Date;
  sync_source_reference?: string;
  is_low_stock: boolean;
}

export interface ProductFilters {
  brand?: string;
  category?: string;
  stockStatus?: 'in_stock' | 'low' | 'out_of_stock';
}

/**
 * SyncHistoryPanel
 * 
 * Timeline/list of recent sync operations
 * Shows success/failure status, records processed, execution time
 * 
 * Props:
 * - jobs: SyncJobRow[]
 * - onRetry?: (syncJobId: string) => void
 * - onViewDetails?: (syncJobId: string) => void
 * 
 * Columns:
 * - Sync Type (Batch / Webhook / Manual)
 * - Status (Success / Partial / Failed)
 * - Records (processed/succeeded/failed)
 * - Execution Time
 * - Timestamp
 * - Actions (View Details, Retry if failed)
 */
export interface SyncJobRow {
  id: string;
  sync_type: 'batch_import' | 'webhook_delta' | 'manual_reconciliation';
  status: 'success' | 'partial' | 'failed';
  records_processed: number;
  records_succeeded: number;
  records_failed: number;
  execution_time_ms: number;
  started_at: Date;
  completed_at?: Date;
}

/**
 * ManualSyncModal / Dialog
 * 
 * Allows admin to manually trigger sync
 * File upload or data entry
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onSubmit: (payload: BatchImportPayload) => void
 * - loading?: boolean
 * 
 * Fields:
 * - Import Format Selector (CSV / JSON)
 * - File Upload Area (CSV/JSON)
 * - or Data Entry (JSON textarea)
 * - Source System (Tally / SAP / Custom)
 * - Submit Button
 */
export interface ManualSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
  loading?: boolean;
}

/**
 * ReconciliationModal
 * 
 * Compare current DB snapshot with latest accounting export
 * Shows discrepancies and allows user to reconcile
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onConfirm: () => void
 * - discrepancies: ReconciliationDiff[]
 * 
 * Displays side-by-side:
 * - Current DB Stock
 * - Accounting System Stock
 * - Difference (green if DB <= Accounting, red if DB > Accounting)
 * - User can confirm all or select subset to update
 */
export interface ReconciliationDiff {
  product_id: string;
  current_db_qty: number;
  accounting_qty: number;
  difference: number;
  recommendation: 'update_to_accounting' | 'keep_as_is' | 'manual_review';
}

/**
 * SyncScheduleConfigPanel
 * 
 * Configure auto-sync settings
 * Cron expression editor, retry settings
 * 
 * Props:
 * - config: InventorySyncConfig
 * - onSave: (config: InventorySyncConfig) => void
 * 
 * Fields:
 * - Auto-Sync Enabled (toggle)
 * - Sync Frequency (cron expression picker)
 *   - Presets: Daily 2AM, Daily 6AM, Hourly, etc.
 * - Low Stock Threshold (% selector)
 * - Strict Order Validation (hard block vs. warning)
 * - Import Format (CSV / JSON)
 * - Max Retry Attempts (number)
 * - Retry Backoff (ms slider)
 * - Save Button
 */
export interface SyncScheduleConfigPanelProps {
  config: {
    auto_sync_enabled: boolean;
    sync_frequency_cron: string;
    low_stock_threshold_percent: number;
    strict_order_validation: boolean;
    import_format: 'csv' | 'json';
    max_retry_attempts: number;
    retry_backoff_ms: number;
  };
  onSave: (config: any) => Promise<void>;
  loading?: boolean;
}

// ============================================
// RETAILER APP COMPONENTS (Flutter/React Native)
// ============================================

/**
 * StockAvailabilityBadge
 * 
 * Compact badge showing product availability status
 * Used on product cards and order details
 * 
 * Props:
 * - quantity: number
 * - status: 'available' | 'low_stock' | 'out_of_stock'
 * - threshold?: number (for low stock calculation)
 * 
 * Display:
 * - GREEN: "Available (150)"
 * - YELLOW: "Low Stock (12)"
 * - RED: "Out of Stock"
 * - GRAY: "Approx Available (Unknown)" - if no sync yet
 */
export interface StockBadgeProps {
  quantity: number;
  status: 'available' | 'low_stock' | 'out_of_stock' | 'unknown';
  size?: 'small' | 'medium' | 'large';
  showQuantity?: boolean;
}

/**
 * OrderValidationIndicator
 * 
 * Shows during order placement
 * Green checkmark if stock available (soft validation)
 * Yellow warning if low stock (<20% of order qty)
 * Gray info if unknown stock
 * 
 * Props:
 * - product_id: string
 * - requested_qty: number
 * - available_qty: number
 * - validationStatus: 'approved' | 'warning' | 'unknown'
 * 
 * Message:
 * - "✓ Stock confirmed for {qty} units"
 * - "⚠ Only {available_qty} available" (if < requested)
 * - "ℹ Stock information unavailable"
 */
export interface OrderValidationIndicatorProps {
  product_id: string;
  requested_qty: number;
  available_qty: number;
  validationStatus: 'approved' | 'warning' | 'unknown';
  onConfirm?: () => void; // For soft validation - user must confirm
}

/**
 * ProductCardWithInventory
 * 
 * Enhanced product card showing stock status
 * Used in catalogue browsing
 * 
 * Props:
 * - product: Product
 * - inventory: StockSnapshot
 * 
 * Displays:
 * - Product image
 * - Product name, SKU, brand
 * - Price
 * - Stock badge (availability + quantity)
 * - "Last Updated X hours ago" timestamp
 * - "Add to Cart" button (disabled if out of stock)
 */
export interface ProductCardWithInventoryProps {
  product: {
    id: string;
    name: string;
    sku: string;
    brand: string;
    price: number;
    image_url?: string;
  };
  inventory: {
    available_quantity: number;
    last_synced_at: Date;
  };
  onAddToCart?: (product_id: string, qty: number) => void;
}

/**
 * LowStockWarningBanner
 * 
 * Alert banner shown on order review
 * If any item in order is low stock
 * 
 * Props:
 * - items: OrderItem[]
 * - onDismiss: () => void
 * 
 * Display:
 * "⚠ {count} item(s) have limited stock. We'll prioritize your order."
 * List of low-stock products
 * Dismiss button
 */
export interface LowStockWarningBannerProps {
  items: {
    product_id: string;
    product_name: string;
    requested_qty: number;
    available_qty: number;
  }[];
  onDismiss: () => void;
}

/**
 * InventorySyncStatusIndicator
 * 
 * Small indicator showing sync status in app header
 * Green: Recently synced
 * Yellow: Stale data (>24h old)
 * Gray: Never synced
 * 
 * Props:
 * - lastSyncedAt?: Date
 * - syncStatus: 'success' | 'pending' | 'failed' | 'never'
 * - onTap?: () => void (show sync details modal)
 */
export interface SyncStatusIndicatorProps {
  lastSyncedAt?: Date;
  syncStatus: 'success' | 'pending' | 'failed' | 'never';
  onTap?: () => void;
}

// ============================================
// SHARED / UTILITY COMPONENTS
// ============================================

/**
 * SyncJobDetailsModal
 * 
 * Shows detailed info about a sync job
 * Used in both admin and retailer contexts
 * 
 * Props:
 * - syncJob: SyncJob
 * - errors?: SyncError[]
 * - onClose: () => void
 * 
 * Displays:
 * - Job ID
 * - Status badge
 * - Records processed/succeeded/failed chart
 * - Execution time
 * - Error details (if failed)
 * - Retry button (if applicable)
 */
export interface SyncJobDetailsModalProps {
  syncJob: {
    id: string;
    status: string;
    records_processed: number;
    records_succeeded: number;
    records_failed: number;
    execution_time_ms: number;
    started_at: Date;
    completed_at?: Date;
  };
  errors?: {
    record_index: number;
    error_code: string;
    error_message: string;
  }[];
  onClose: () => void;
}

// ============================================
// LAYOUT STRUCTURE - ADMIN DASHBOARD
// ============================================

/**
 * Admin Dashboard Layout Structure:
 * 
 * Header:
 *   - Title "Inventory Management"
 *   - Sync Status Indicator
 *   - Manual Sync Button
 *   - Settings Icon
 *
 * Top Widgets (Grid):
 *   - InventoryHealthCard (large, 4 columns)
 *
 * Main Content:
 *   Tab 1: Overview
 *     - LowStockAlertsPanel (if any active)
 *     - SyncHistoryPanel (recent 10 jobs)
 *
 *   Tab 2: Inventory Table
 *     - InventoryTable (all products, sortable, searchable)
 *
 *   Tab 3: Configuration
 *     - SyncScheduleConfigPanel
 *     
 *   Tab 4: Reconciliation
 *     - ReconciliationModal trigger button
 */

// ============================================
// API INTEGRATION MOCK EXAMPLE
// ============================================

/**
 * Hook: useInventoryData
 * 
 * React/React Native custom hook for fetching inventory data
 * 
 * Usage:
 * const {
 *   healthData,
 *   alerts,
 *   syncJobs,
 *   loading,
 *   error,
 *   refresh
 * } = useInventoryData(tenantId);
 */
export interface UseInventoryDataHook {
  healthData: any;
  alerts: any[];
  syncJobs: any[];
  loading: boolean;
  error?: Error;
  refresh: () => Promise<void>;
}

/**
 * Service: InventoryAPIClient
 * 
 * Encapsulates HTTP calls to inventory endpoints
 * 
 * Methods:
 * - getSnapshot(productId): Promise<StockSnapshot>
 * - getLowStockAlerts(): Promise<LowStockAlert[]>
 * - getSyncJobs(limit): Promise<SyncJob[]>
 * - triggerManualSync(payload): Promise<SyncResult>
 * - triggerReconciliation(): Promise<SyncResult>
 * - getDashboardSummary(): Promise<DashboardSummary>
 */
export interface InventoryAPIClientInterface {
  getSnapshot(productId: string): Promise<any>;
  getLowStockAlerts(): Promise<any[]>;
  getSyncJobs(limit?: number): Promise<any[]>;
  triggerManualSync(payload: any): Promise<any>;
  triggerReconciliation(): Promise<any>;
  getDashboardSummary(): Promise<any>;
  acknowledgeLowStockAlert(alertId: number): Promise<void>;
}
