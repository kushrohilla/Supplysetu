/**
 * Inventory Sync Service
 * 
 * Core business logic for:
 * - Processing batch imports from accounting systems
 * - Managing inventory snapshots
 * - Handling sync errors and retries
 * - Maintaining audit trail
 */

import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../shared/logger';
import {
  InventorySnapshot,
  InventorySyncJob,
  SyncStatus,
  SyncType,
  BatchImportPayload,
  AccountingExportRecord,
  SyncResult,
  SyncError,
  ChangeReason,
} from './types';

export class InventorySyncService {
  constructor(private db: Knex) {}

  /**
   * Main entry point for batch import from accounting system
   * Orchestrates: validation -> transformation -> atomic update -> audit logging
   */
  async processBatchImport(payload: BatchImportPayload): Promise<SyncResult> {
    const syncJobId = uuidv4();
    const startTime = Date.now();
    const errors: SyncError[] = [];

    // 1. Create sync job record (started state)
    const syncJob = await this.createSyncJob({
      id: syncJobId,
      tenant_id: payload.tenant_id,
      sync_type: 'batch_import',
      sync_status: 'in_progress',
      source_file_path: payload.batch_id,
      triggered_by: 'system',
      triggered_by_source: 'scheduled',
    });

    try {
      let succeededCount = 0;
      const updatePromises: Promise<void>[] = [];

      // 2. Validate and transform records
      for (let index = 0; index < payload.records.length; index++) {
        const record = payload.records[index];

        try {
          // Data validation
          const validationError = this.validateRecord(record);
          if (validationError) {
            errors.push({
              record_index: index,
              product_id: record.product_id,
              error_code: 'VALIDATION_ERROR',
              error_message: validationError,
            });
            continue;
          }

          // 3. Atomic update in transaction
          updatePromises.push(
            this.updateInventorySnapshot(
              payload.tenant_id,
              record,
              syncJobId,
              'sync_import'
            )
          );
          succeededCount++;
        } catch (error) {
          errors.push({
            record_index: index,
            product_id: record.product_id,
            error_code: 'PROCESSING_ERROR',
            error_message: (error as Error).message,
            details: { stack: (error as Error).stack },
          });
        }
      }

      // 4. Execute all updates in parallel
      await Promise.all(updatePromises);

      // 5. Update sync job with completion status
      const executionTimeMs = Date.now() - startTime;
      const finalStatus: SyncStatus = errors.length === 0 ? 'success' : 'partial';

      await this.updateSyncJob(syncJobId, {
        sync_status: finalStatus,
        records_processed: payload.records.length,
        records_succeeded: succeededCount,
        records_failed: errors.length,
        failure_reason: errors.length > 0 ? JSON.stringify(errors) : null,
        completed_at: new Date(),
        execution_time_ms: executionTimeMs,
      });

      logger.info('Batch import completed', {
        syncJobId,
        tenant: payload.tenant_id,
        status: finalStatus,
        succeeded: succeededCount,
        failed: errors.length,
        executionMs: executionTimeMs,
      });

      return {
        sync_job_id: syncJobId,
        status: finalStatus,
        total_records: payload.records.length,
        succeeded: succeededCount,
        failed: errors.length,
        errors,
        execution_time_ms: executionTimeMs,
        message:
          finalStatus === 'success'
            ? `Successfully synced ${succeededCount} products`
            : `Synced ${succeededCount}/${payload.records.length} products. ${errors.length} errors.`,
      };
    } catch (error) {
      // Critical failure - mark job as failed
      const executionTimeMs = Date.now() - startTime;
      const failureReason = (error as Error).message;

      await this.updateSyncJob(syncJobId, {
        sync_status: 'failed',
        records_processed: payload.records.length,
        records_failed: payload.records.length,
        failure_reason: failureReason,
        completed_at: new Date(),
        execution_time_ms: executionTimeMs,
      });

      logger.error('Batch import failed', {
        syncJobId,
        tenant: payload.tenant_id,
        error: failureReason,
      });

      return {
        sync_job_id: syncJobId,
        status: 'failed',
        total_records: payload.records.length,
        succeeded: 0,
        failed: payload.records.length,
        errors: [
          {
            record_index: 0,
            error_code: 'CRITICAL_ERROR',
            error_message: failureReason,
          },
        ],
        execution_time_ms: executionTimeMs,
        message: `Sync failed: ${failureReason}`,
      };
    }
  }

  /**
   * Validates a single accounting export record
   * Returns null if valid, error message if invalid
   */
  private validateRecord(record: AccountingExportRecord): string | null {
    if (!record.product_id?.trim()) {
      return 'product_id is required';
    }
    if (!Number.isInteger(record.warehouse_available) || record.warehouse_available < 0) {
      return 'warehouse_available must be a non-negative integer';
    }
    if (record.reserved !== undefined && record.reserved < 0) {
      return 'reserved cannot be negative';
    }
    if (record.warehouse_available < 0 || record.reserved > record.warehouse_available) {
      return 'reserved quantity cannot exceed available quantity';
    }
    return null;
  }

  /**
   * Atomically updates or creates an inventory snapshot
   * Includes audit logging of the change
   */
  private async updateInventorySnapshot(
    tenantId: string,
    record: AccountingExportRecord,
    syncJobId: string,
    changeReason: ChangeReason
  ): Promise<void> {
    return this.db.transaction(async (trx) => {
      // Get current snapshot (if exists)
      const current = await trx<InventorySnapshot>('inventory_snapshots')
        .where({
          tenant_id: tenantId,
          product_id: record.product_id,
        })
        .first();

      const quantityBefore = current?.available_quantity ?? 0;
      const quantityAfter = record.warehouse_available;

      // Upsert inventory snapshot
      if (current) {
        await trx<InventorySnapshot>('inventory_snapshots')
          .where({
            tenant_id: tenantId,
            product_id: record.product_id,
          })
          .update({
            available_quantity: record.warehouse_available,
            reserved_quantity: record.reserved || 0,
            committed_quantity: record.warehouse_available,
            last_synced_at: new Date(record.last_count_date),
            sync_source_reference: record.invoice_id,
            sync_job_id: syncJobId,
            updated_at: new Date(),
          });
      } else {
        await trx<InventorySnapshot>('inventory_snapshots').insert({
          tenant_id: tenantId,
          product_id: record.product_id,
          available_quantity: record.warehouse_available,
          reserved_quantity: record.reserved || 0,
          committed_quantity: record.warehouse_available,
          last_synced_at: new Date(record.last_count_date),
          sync_source_reference: record.invoice_id,
          sync_job_id: syncJobId,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      // Log audit trail
      await trx('inventory_audit_log').insert({
        tenant_id: tenantId,
        product_id: record.product_id,
        sync_job_id: syncJobId,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        quantity_delta: quantityAfter - quantityBefore,
        change_reason: changeReason,
        source_invoice_id: record.invoice_id,
        recorded_at: new Date(),
      });

      // Check if low stock alert needed
      await this.evaluateLowStockAlert(trx, tenantId, record.product_id, quantityAfter);
    });
  }

  /**
   * Evaluates and creates low stock alerts based on configured thresholds
   */
  private async evaluateLowStockAlert(
    trx: Knex.Transaction,
    tenantId: string,
    productId: string,
    currentQty: number
  ): Promise<void> {
    // Get sync config for this tenant
    const config = await trx('inventory_sync_config').where({ tenant_id: tenantId }).first();

    if (!config) {
      return; // Config not set, skip alert
    }

    // Simplified threshold: if qty < 20% of some reference max
    // In production, would store product max quantity in products table
    const estimatedMax = 1000; // Placeholder - fetch from products table
    const thresholdQty = (estimatedMax * config.low_stock_threshold_percent) / 100;

    if (currentQty < thresholdQty) {
      // Check if alert already exists
      const existingAlert = await trx('inventory_low_stock_alerts')
        .where({
          tenant_id: tenantId,
          product_id: productId,
          alert_status: 'active',
        })
        .first();

      if (!existingAlert) {
        await trx('inventory_low_stock_alerts').insert({
          tenant_id: tenantId,
          product_id: productId,
          current_available_qty: currentQty,
          threshold_qty: thresholdQty,
          alert_status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    } else {
      // Resolve existing alert if qty is now above threshold
      await trx('inventory_low_stock_alerts')
        .where({
          tenant_id: tenantId,
          product_id: productId,
          alert_status: 'active',
        })
        .update({ alert_status: 'resolved', updated_at: new Date() });
    }
  }

  /**
   * Get current stock snapshot for a product
   */
  async getProductStock(tenantId: string, productId: string): Promise<InventorySnapshot | null> {
    return this.db<InventorySnapshot>('inventory_snapshots')
      .where({
        tenant_id: tenantId,
        product_id: productId,
      })
      .first();
  }

  /**
   * Get all active low stock alerts for a tenant
   */
  async getLowStockAlerts(tenantId: string) {
    return this.db('inventory_low_stock_alerts')
      .where({
        tenant_id: tenantId,
        alert_status: 'active',
      })
      .orderBy('created_at', 'desc');
  }

  /**
   * Get sync job details
   */
  async getSyncJobStatus(syncJobId: string): Promise<InventorySyncJob | null> {
    return this.db<InventorySyncJob>('inventory_sync_jobs')
      .where({ id: syncJobId })
      .first();
  }

  /**
   * List recent sync jobs for a tenant
   */
  async getSyncJobHistory(tenantId: string, limit = 20) {
    return this.db<InventorySyncJob>('inventory_sync_jobs')
      .where({ tenant_id: tenantId })
      .orderBy('started_at', 'desc')
      .limit(limit);
  }

  /**
   * Manual reconciliation: compare database snapshot with actual accounting system export
   * Identifies discrepancies and creates reconciliation sync job
   */
  async initiateReconciliation(
    tenantId: string,
    latestAccountingExport: AccountingExportRecord[]
  ): Promise<SyncResult> {
    const syncJobId = uuidv4();

    const payload: BatchImportPayload = {
      tenant_id: tenantId,
      batch_id: `reconciliation_${syncJobId}`,
      import_format: 'json',
      records: latestAccountingExport,
      sync_timestamp: new Date(),
      source_system: 'manual_reconciliation',
    };

    // Process as batch import but mark as reconciliation type
    await this.updateSyncJob(syncJobId, {
      sync_type: 'manual_reconciliation',
    });

    return this.processBatchImport(payload);
  }

  // ===== Private Helpers =====

  private async createSyncJob(data: Partial<InventorySyncJob>): Promise<InventorySyncJob> {
    await this.db('inventory_sync_jobs').insert({
      started_at: new Date(),
      records_processed: 0,
      records_succeeded: 0,
      records_failed: 0,
      ...data,
    });

    return this.db<InventorySyncJob>('inventory_sync_jobs').where({ id: data.id }).first() as Promise<InventorySyncJob>;
  }

  private async updateSyncJob(syncJobId: string, updates: Partial<InventorySyncJob>): Promise<void> {
    await this.db('inventory_sync_jobs').where({ id: syncJobId }).update(updates);
  }

  /**
   * Get inventory summary dashboard data
   */
  async getDashboardSummary(tenantId: string) {
    const [snapshot] = await Promise.all([
      this.db<InventorySnapshot>('inventory_snapshots').where({ tenant_id: tenantId }),
      this.db<any>('inventory_low_stock_alerts').where({
        tenant_id: tenantId,
        alert_status: 'active',
      }),
    ]);

    const lowStockProducts = await this.db('inventory_low_stock_alerts')
      .where({ tenant_id: tenantId, alert_status: 'active' });

    const lastSync = await this.db('inventory_sync_jobs')
      .where({ tenant_id: tenantId, sync_status: 'success' })
      .orderBy('completed_at', 'desc')
      .first();

    const outOfStockCount = snapshot.filter((s) => s.available_quantity === 0).length;

    return {
      total_products: snapshot.length,
      in_stock: snapshot.filter((s) => s.available_quantity > 0).length,
      low_stock_count: lowStockProducts.length,
      out_of_stock: outOfStockCount,
      last_sync_at: lastSync?.completed_at || null,
      health_percentage:
        snapshot.length > 0
          ? Math.round(((snapshot.length - outOfStockCount) / snapshot.length) * 100)
          : 0,
    };
  }
}
