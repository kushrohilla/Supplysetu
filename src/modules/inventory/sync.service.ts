/**
 * Inventory Sync Service
 * 
 * Core business logic for:
 * - Processing batch imports from accounting systems
 * - Managed via Event Sourced Immutable Ledger (inventory_movements)
 * - Handling sync errors and retries
 */

import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../shared/logger';
import {
  InventorySnapshot,
  InventorySyncJob,
  SyncStatus,
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
   */
  async processBatchImport(payload: BatchImportPayload): Promise<SyncResult> {
    const syncJobId = uuidv4();
    const startTime = Date.now();
    const errors: SyncError[] = [];

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

      for (let index = 0; index < payload.records.length; index++) {
        const record = payload.records[index];

        try {
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

          updatePromises.push(
            this.processInventoryAdjustment(
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

      await Promise.all(updatePromises);

      const executionTimeMs = Date.now() - startTime;
      const finalStatus: SyncStatus = errors.length === 0 ? 'success' : 'partial';

      await this.updateSyncJob(syncJobId, {
        sync_status: finalStatus,
        records_processed: payload.records.length,
        records_succeeded: succeededCount,
        records_failed: errors.length,
        failure_reason: errors.length > 0 ? JSON.stringify(errors) : undefined,
        completed_at: new Date(),
        execution_time_ms: executionTimeMs,
      });

      logger.info({
        syncJobId,
        tenant: payload.tenant_id,
        status: finalStatus,
        succeeded: succeededCount,
        failed: errors.length,
        executionMs: executionTimeMs,
      }, 'Batch import completed');

      return {
        sync_job_id: syncJobId,
        status: finalStatus,
        total_records: payload.records.length,
        succeeded: succeededCount,
        failed: errors.length,
        errors,
        execution_time_ms: executionTimeMs,
        message: finalStatus === 'success'
            ? `Successfully synced ${succeededCount} products`
            : `Synced ${succeededCount}/${payload.records.length} products. ${errors.length} errors.`,
      };
    } catch (error) {
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

      logger.error({
        syncJobId,
        tenant: payload.tenant_id,
        error: failureReason,
      }, 'Batch import failed');

      return {
        sync_job_id: syncJobId,
        status: 'failed',
        total_records: payload.records.length,
        succeeded: 0,
        failed: payload.records.length,
        errors: [{
            record_index: 0,
            error_code: 'CRITICAL_ERROR',
            error_message: failureReason,
        }],
        execution_time_ms: executionTimeMs,
        message: `Sync failed: ${failureReason}`,
      };
    }
  }

  private validateRecord(record: AccountingExportRecord): string | null {
    if (!record.product_id?.trim()) return 'product_id is required';
    if (!Number.isInteger(record.warehouse_available) || record.warehouse_available < 0) return 'warehouse_available must be a non-negative integer';
    return null;
  }

  /**
   * Translates Tally export stock into an immutable ledger adjustment
   */
  private async processInventoryAdjustment(
    tenantId: string,
    record: AccountingExportRecord,
    syncJobId: string,
    changeReason: ChangeReason
  ): Promise<void> {
    return this.db.transaction(async (trx) => {
      // Find tenant product ID mapping
      const product = await trx('tenant_products')
        .where({ tenant_id: tenantId })
        .andWhere(function() {
          this.where('sku_code', record.product_id).orWhere('id', record.product_id);
        })
        .first();

      if (!product) {
        throw new Error(`Product mapping not found for ${record.product_id}`);
      }

      const tenantProductId = product.id;

      // 1. Calculate current stock from ledger SUM
      const stockRow = await trx('inventory_movements')
        .sum('quantity_change as total_stock')
        .where({ tenant_id: tenantId, tenant_product_id: tenantProductId })
        .first();

      const currentStock = Number(stockRow?.total_stock || 0);
      const newStock = record.warehouse_available;
      const delta = newStock - currentStock;

      if (delta !== 0) {
        // Find 'adjustment' movement type reference
        const mt = await trx('inventory_movement_types').where({ code: 'adjustment' }).first();
        if (!mt) throw new Error('Reference missing: inventory_movement_types.code = adjustment');

        const sourceDoc = {
          sync_job_id: syncJobId,
          reason: changeReason,
          old_stock: currentStock,
          new_stock: newStock,
          invoice_id: record.invoice_id
        };

        // Insert into immutable ledger
        await trx('inventory_movements').insert({
          id: uuidv4(),
          tenant_id: tenantId,
          tenant_product_id: tenantProductId,
          movement_type_id: mt.id,
          quantity_change: delta,
          uom: record.unit_of_measure || product.pack_size,
          source_document: JSON.stringify(sourceDoc),
          external_reference: record.invoice_id,
          batch_id: syncJobId,
          created_at: new Date()
        });
      }

      // 2. Also record historical snapshot trace
      await trx('tenant_product_stock_snapshots').insert({
         id: uuidv4(),
         tenant_id: tenantId,
         tenant_product_id: tenantProductId,
         stock_qty: newStock,
         source: 'accounting_sync',
         captured_at: record.last_count_date ? new Date(record.last_count_date) : new Date(),
         created_at: new Date()
      });

      // 3. Evaluate low stock
      await this.evaluateLowStockAlert(trx, tenantId, record.product_id, newStock);
    });
  }

  private async evaluateLowStockAlert(trx: Knex.Transaction, tenantId: string, productId: string, currentQty: number): Promise<void> {
    const config = await trx('inventory_sync_config').where({ tenant_id: tenantId }).first();
    if (!config) return;

    const estimatedMax = 1000;
    const thresholdQty = (estimatedMax * config.low_stock_threshold_percent) / 100;

    if (currentQty < thresholdQty) {
      const existingAlert = await trx('inventory_low_stock_alerts')
        .where({ tenant_id: tenantId, product_id: productId, alert_status: 'active' })
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
      await trx('inventory_low_stock_alerts')
        .where({ tenant_id: tenantId, product_id: productId, alert_status: 'active' })
        .update({ alert_status: 'resolved', updated_at: new Date() });
    }
  }

  async getProductStock(tenantId: string, productId: string): Promise<InventorySnapshot | null> {
    const product = await this.db('tenant_products')
      .where({ tenant_id: tenantId })
      .andWhere(function() {
        this.where('sku_code', productId).orWhere('id', productId);
      })
      .first();

    if (!product) return null;

    const stockRow = await this.db('inventory_movements')
      .sum('quantity_change as qty')
      .where({ tenant_id: tenantId, tenant_product_id: product.id })
      .first();

    const lastSync = await this.db('tenant_product_stock_snapshots')
      .where({ tenant_id: tenantId, tenant_product_id: product.id })
      .orderBy('created_at', 'desc')
      .first();

    const available_quantity = Number(stockRow?.qty || 0);

    return {
      id: 0,
      tenant_id: tenantId,
      product_id: product.id,
      available_quantity: available_quantity,
      reserved_quantity: 0,
      committed_quantity: available_quantity,
      last_synced_at: lastSync?.captured_at || new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      sync_job_id: ''
    } as InventorySnapshot;
  }

  async getLowStockAlerts(tenantId: string) {
    return this.db('inventory_low_stock_alerts')
      .where({ tenant_id: tenantId, alert_status: 'active' })
      .orderBy('created_at', 'desc');
  }

  async getSyncJobStatus(syncJobId: string): Promise<InventorySyncJob | null> {
    return this.db<InventorySyncJob>('inventory_sync_jobs')
      .where({ id: syncJobId })
      .first()
      .then(res => res ?? null);
  }

  async getSyncJobHistory(tenantId: string, limit = 20) {
    return this.db<InventorySyncJob>('inventory_sync_jobs')
      .where({ tenant_id: tenantId })
      .orderBy('started_at', 'desc')
      .limit(limit);
  }

  async initiateReconciliation(tenantId: string, latestAccountingExport: AccountingExportRecord[]): Promise<SyncResult> {
    const syncJobId = uuidv4();
    const payload: BatchImportPayload = {
      tenant_id: tenantId,
      batch_id: `reconciliation_${syncJobId}`,
      import_format: 'json',
      records: latestAccountingExport,
      sync_timestamp: new Date(),
      source_system: 'manual_reconciliation',
    };

    await this.updateSyncJob(syncJobId, { sync_type: 'manual_reconciliation' });
    return this.processBatchImport(payload);
  }

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

  async getDashboardSummary(tenantId: string) {
    const products = await this.db('tenant_products').where({ tenant_id: tenantId });
    
    const stockAgg = await this.db('inventory_movements')
      .select('tenant_product_id')
      .sum('quantity_change as qty')
      .where({ tenant_id: tenantId })
      .groupBy('tenant_product_id');

    const lowStockProducts = await this.db('inventory_low_stock_alerts')
      .where({ tenant_id: tenantId, alert_status: 'active' });

    const lastSync = await this.db('inventory_sync_jobs')
      .where({ tenant_id: tenantId, sync_status: 'success' })
      .orderBy('completed_at', 'desc')
      .first();

    const stockMap = new Map<string, number>();
    for (const s of stockAgg) {
      stockMap.set(s.tenant_product_id, Number(s.qty || 0));
    }

    let outOfStockCount = 0;
    let inStockCount = 0;

    for (const p of products) {
       const qty = stockMap.get(p.id) || 0;
       if (qty <= 0) outOfStockCount++;
       else inStockCount++;
    }

    return {
      total_products: products.length,
      in_stock: inStockCount,
      low_stock_count: lowStockProducts.length,
      out_of_stock: outOfStockCount,
      last_sync_at: lastSync?.completed_at || null,
      health_percentage: products.length > 0
          ? Math.round(((products.length - outOfStockCount) / products.length) * 100)
          : 0,
    };
  }
}
