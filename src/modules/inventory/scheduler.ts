/**
 * Inventory Sync Scheduler
 * 
 * Handles scheduled sync jobs, retry logic, and webhook events
 * Uses node-cron for scheduling and implements exponential backoff retry
 */

import cron from 'node-cron';
import { Knex } from 'knex';
import { logger } from '../../shared/logger';
import { InventorySyncService } from './sync.service';
import { BatchImportPayload, AccountingExportRecord } from './types';
import Bull, { Queue } from 'bull';

export class InventorySyncScheduler {
  private syncService: InventorySyncService;
  private retryQueue: Queue;
  private cronJobs: Map<string, any> = new Map();

  constructor(private db: Knex, private redisUrl?: string) {
    this.syncService = new InventorySyncService(db);

    // Initialize retry queue (uses Redis)
    // In production, would use a real Redis instance
    this.retryQueue = new Bull('inventory-sync-retry', this.redisUrl || 'redis://127.0.0.1:6379');
    this.setupRetryQueueHandlers();
  }

  /**
   * Initialize scheduler for a tenant's sync config
   * Validates cron expression and sets up job
   */
  async initializeTenantScheduler(tenantId: string): Promise<void> {
    try {
      const config = await this.db('inventory_sync_config')
        .where({ tenant_id: tenantId })
        .first();

      if (!config || !config.auto_sync_enabled) {
        logger.debug(`Sync scheduler disabled for tenant ${tenantId}`);
        return;
      }

      // Remove existing job if present
      this.stopTenantScheduler(tenantId);

      // Validate cron expression
      if (!this.isValidCronExpression(config.sync_frequency_cron)) {
        logger.error({
          cron: config.sync_frequency_cron,
        }, `Invalid cron expression for tenant ${tenantId}`);
        return;
      }

      // Schedule new job
      const job = cron.schedule(config.sync_frequency_cron, () => {
        this.executeScheduledSync(tenantId);
      });

      this.cronJobs.set(tenantId, job);
      logger.info({
        cron: config.sync_frequency_cron,
      }, `Inventory sync scheduler initialized for tenant ${tenantId}`);
    } catch (error) {
      logger.error({
        error: (error as Error).message,
      }, `Failed to initialize scheduler for tenant ${tenantId}`);
    }
  }

  /**
   * Stop scheduler for a tenant
   */
  stopTenantScheduler(tenantId: string): void {
    const job = this.cronJobs.get(tenantId);
    if (job) {
      job.stop();
      this.cronJobs.delete(tenantId);
      logger.info(`Inventory sync scheduler stopped for tenant ${tenantId}`);
    }
  }

  /**
   * Execute scheduled sync - fetches from accounting system and processes
   * In Phase 1: reads from mock/uploaded files
   * In Phase 2: calls Tally webhook or API directly
   */
  private async executeScheduledSync(tenantId: string): Promise<void> {
    try {
      logger.info(`Starting scheduled inventory sync for tenant ${tenantId}`);

      // In Phase 2, this would call:
      // const export = await this.fetchFromTallyAPI(tenantId);
      // For now, simulate fetching from mock storage
      const mockExport = await this.fetchMockAccountingExport(tenantId);

      if (!mockExport || mockExport.length === 0) {
        logger.warn(`No accounting data available for tenant ${tenantId}`);
        return;
      }

      const payload: BatchImportPayload = {
        tenant_id: tenantId,
        batch_id: `scheduled_${Date.now()}`,
        import_format: 'json',
        records: mockExport,
        sync_timestamp: new Date(),
        source_system: 'scheduled_sync',
      };

      const result = await this.syncService.processBatchImport(payload);

      if (result.status === 'failed') {
        logger.error({
          syncJobId: result.sync_job_id,
          errors: result.errors,
        }, `Scheduled sync failed for tenant ${tenantId}`);
        // Queue for retry
        await this.queueForRetry(tenantId, payload);
      } else {
        logger.info({
          syncJobId: result.sync_job_id,
          succeeded: result.succeeded,
          failed: result.failed,
        }, `Scheduled sync completed for tenant ${tenantId}`);
      }
    } catch (error) {
      logger.error({
        error: (error as Error).message,
      }, `Scheduled sync error for tenant ${tenantId}`);
      // Queue for retry
      await this.queueForRetry(tenantId, null);
    }
  }

  /**
   * Queue failed sync for retry with exponential backoff
   * Stored in inventory_sync_queue table
   */
  private async queueForRetry(
    tenantId: string,
    payload: BatchImportPayload | null
  ): Promise<void> {
    const config = await this.db('inventory_sync_config')
      .where({ tenant_id: tenantId })
      .first();

    if (!config) {
      return;
    }

    // Calculate next retry time with exponential backoff
    const lastQueue = await this.db('inventory_sync_queue')
      .where({ tenant_id: tenantId, status: 'pending' })
      .orderBy('retry_count', 'desc')
      .first();

    const retryCount = (lastQueue?.retry_count ?? 0) + 1;
    const backoffMs = config.retry_backoff_ms * Math.pow(2, retryCount - 1);

    if (retryCount > config.max_retry_attempts) {
      logger.error({
        maxAttempts: config.max_retry_attempts,
      }, `Max retry attempts exceeded for tenant ${tenantId}`);
      return;
    }

    const nextRetryAt = new Date(Date.now() + backoffMs);

    await this.db('inventory_sync_queue').insert({
      tenant_id: tenantId,
      sync_job_id: `retry_${Date.now()}`,
      payload: payload || {},
      retry_count: retryCount,
      next_retry_at: nextRetryAt,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    });

    logger.info({
      retryCount,
      nextRetryAt,
      backoffMs,
    }, `Queued sync for retry - tenant ${tenantId}`);
  }

  /**
   * Process pending retries - called periodically (e.g., every 10 seconds)
   */
  async processPendingRetries(): Promise<void> {
    try {
      const now = new Date();

      // Get all items due for retry
      const queueItems = await this.db('inventory_sync_queue')
        .where('status', 'pending')
        .andWhere('next_retry_at', '<=', now);

      logger.debug(`Processing ${queueItems.length} pending retries`);

      for (const item of queueItems) {
        try {
          await this.db('inventory_sync_queue')
            .where({ id: item.id })
            .update({ status: 'processing' });

          const payload = item.payload as BatchImportPayload;

          const result = await this.syncService.processBatchImport(payload);

          if (result.status === 'success' || result.status === 'partial') {
            await this.db('inventory_sync_queue')
              .where({ id: item.id })
              .update({ status: 'failed_permanently' }); // Mark as completed
          } else {
            // Still failing, increment retry count
            await this.db('inventory_sync_queue')
              .where({ id: item.id })
              .update({
                status: 'pending',
                retry_count: item.retry_count + 1,
                next_retry_at: new Date(Date.now() + 5000), // Simple backoff
              });
          }
        } catch (error) {
          logger.error({
            error: (error as Error).message,
          }, `Error processing retry queue item ${item.id}`);

          await this.db('inventory_sync_queue')
            .where({ id: item.id })
            .update({
              status: 'pending',
              last_error: (error as Error).message,
              retry_count: item.retry_count + 1,
            });
        }
      }
    } catch (error) {
      logger.error({
        error: (error as Error).message,
      }, 'Error in processPendingRetries');
    }
  }

  /**
   * Setup retry queue handlers (Bull)
   * For distributed retry processing
   */
  private setupRetryQueueHandlers(): void {
    this.retryQueue.process(async (job) => {
      const { tenantId, payload } = job.data;

      try {
        const result = await this.syncService.processBatchImport(payload);
        return result;
      } catch (error) {
        throw error; // Bull will handle retry
      }
    });

    this.retryQueue.on('failed', (job, err) => {
      logger.error({
        error: err.message,
        attempts: job.attemptsMade,
      }, `Bull retry job failed for tenant ${job.data.tenantId}`);
    });

    this.retryQueue.on('completed', (job) => {
      logger.info({
        attempts: job.attemptsMade,
      }, `Bull retry job completed for tenant ${job.data.tenantId}`);
    });
  }

  /**
   * Simulate fetching accounting export
   * In Phase 2, this would call real Tally API or webhook
   */
  private async fetchMockAccountingExport(tenantId: string): Promise<AccountingExportRecord[]> {
    // In production, would:
    // 1. Call Tally API via REST/webhook
    // 2. Parse CSV/JSON response
    // 3. Transform to AccountingExportRecord format

    // Mock data for now
    return [
      {
        product_id: 'PROD001',
        product_name: 'Wheat Flour 10kg',
        sku: 'WF10K',
        warehouse_available: 150,
        reserved: 0,
        unit_of_measure: 'bags',
        last_count_date: new Date().toISOString(),
        invoice_id: `INV_${Date.now()}`,
      },
      {
        product_id: 'PROD002',
        product_name: 'Rice 20kg',
        sku: 'RICE20K',
        warehouse_available: 45,
        reserved: 0,
        unit_of_measure: 'bags',
        last_count_date: new Date().toISOString(),
      },
    ];
  }

  /**
   * Validate cron expression format
   */
  private isValidCronExpression(expr: string): boolean {
    try {
      cron.validate(expr);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gracefully shutdown scheduler
   */
  async shutdown(): Promise<void> {
    // Stop all cron jobs
    for (const job of this.cronJobs.values()) {
      job.stop();
    }
    this.cronJobs.clear();

    // Close retry queue
    if (this.retryQueue) {
      await this.retryQueue.close();
    }

    logger.info('Inventory sync scheduler shut down');
  }
}

/**
 * Initialize global scheduler instance
 * Call from app.ts during boot
 */
export async function initializeInventorySyncScheduler(db: Knex): Promise<InventorySyncScheduler> {
  const scheduler = new InventorySyncScheduler(db);

  // Initialize schedulers for all tenants
  const configs = await db('inventory_sync_config').select('tenant_id');

  for (const config of configs) {
    await scheduler.initializeTenantScheduler(config.tenant_id);
  }

  // Start periodic retry processor
  setInterval(() => {
    scheduler.processPendingRetries();
  }, 10000); // Every 10 seconds

  logger.info(`Initialized inventory sync scheduler for ${configs.length} tenants`);

  return scheduler;
}
