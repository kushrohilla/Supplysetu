/**
 * Inventory API Routes
 * 
 * Endpoints for:
 * - Manual sync trigger
 * - Stock queries
 * - Sync job status
 * - Low stock alerts
 * - Dashboard data
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Knex } from 'knex';
import { InventorySyncService } from './sync.service';
import { BatchImportPayload, AccountingExportRecord } from './types';
import { logger } from '../../shared/logger';

export function createInventoryRoutes(db: Knex): Router {
  const router = Router();
  const syncService = new InventorySyncService(db);

  /**
   * POST /api/inventory/sync
   * Manually trigger inventory sync from accounting system export
   *
   * Body:
   * {
   *   tenant_id: string,
   *   records: AccountingExportRecord[]
   * }
   */
  router.post('/sync', async (req: Request, res: Response) => {
    try {
      const { tenant_id, records, source_system = 'manual_api' } = req.body;

      // Validation
      if (!tenant_id || !Array.isArray(records) || records.length === 0) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'tenant_id and non-empty records array required',
        });
      }

      const payload: BatchImportPayload = {
        tenant_id,
        batch_id: `manual_${uuidv4()}`,
        import_format: 'json',
        records,
        sync_timestamp: new Date(),
        source_system,
      };

      const result = await syncService.processBatchImport(payload);

      res.status(result.status === 'failed' ? 500 : 200).json(result);
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Sync endpoint error');
      res.status(500).json({
        error: 'Internal server error',
        message: (error as Error).message,
      });
    }
  });

  /**
   * GET /api/inventory/snapshot/:productId
   * Get current stock snapshot for a product
   *
   * Query params:
   * - tenant_id: string (required)
   */
  router.get('/snapshot/:productId', async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const { tenant_id } = req.query;

      if (!tenant_id) {
        return res.status(400).json({
          error: 'Missing tenant_id query parameter',
        });
      }

      const snapshot = await syncService.getProductStock(tenant_id as string, productId);

      if (!snapshot) {
        return res.status(404).json({
          error: 'Product not found',
          message: `No inventory snapshot for product ${productId}`,
        });
      }

      // Add soft validation result
      const canFulfill = snapshot.available_quantity > 0;

      res.json({
        product_id: snapshot.product_id,
        available_quantity: snapshot.available_quantity,
        reserved_quantity: snapshot.reserved_quantity,
        committed_quantity: snapshot.committed_quantity,
        last_synced_at: snapshot.last_synced_at,
        is_low_stock: snapshot.available_quantity < 100, // Placeholder threshold
        can_fulfill_order: canFulfill,
        validation_status: canFulfill ? 'approved' : 'warning', // Soft validation
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Snapshot endpoint error');
      res.status(500).json({
        error: 'Internal server error',
        message: (error as Error).message,
      });
    }
  });

  /**
   * GET /api/inventory/sync-jobs/:syncJobId
   * Get status of a specific sync job
   */
  router.get('/sync-jobs/:syncJobId', async (req: Request, res: Response) => {
    try {
      const { syncJobId } = req.params;

      const job = await syncService.getSyncJobStatus(syncJobId);

      if (!job) {
        return res.status(404).json({
          error: 'Sync job not found',
        });
      }

      res.json({
        id: job.id,
        status: job.sync_status,
        type: job.sync_type,
        records_processed: job.records_processed,
        records_succeeded: job.records_succeeded,
        records_failed: job.records_failed,
        execution_time_ms: job.execution_time_ms,
        started_at: job.started_at,
        completed_at: job.completed_at,
        failure_reason: job.failure_reason ? JSON.parse(job.failure_reason) : null,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Sync job status endpoint error');
      res.status(500).json({
        error: 'Internal server error',
        message: (error as Error).message,
      });
    }
  });

  /**
   * GET /api/inventory/sync-jobs
   * List recent sync jobs for a tenant
   *
   * Query params:
   * - tenant_id: string (required)
   * - limit: number (default: 20)
   */
  router.get('/sync-jobs', async (req: Request, res: Response) => {
    try {
      const { tenant_id, limit } = req.query;

      if (!tenant_id) {
        return res.status(400).json({
          error: 'Missing tenant_id query parameter',
        });
      }

      const jobs = await syncService.getSyncJobHistory(
        tenant_id as string,
        parseInt(limit as string) || 20
      );

      res.json({
        total: jobs.length,
        jobs: jobs.map((job) => ({
          id: job.id,
          status: job.sync_status,
          type: job.sync_type,
          records: {
            processed: job.records_processed,
            succeeded: job.records_succeeded,
            failed: job.records_failed,
          },
          execution_time_ms: job.execution_time_ms,
          started_at: job.started_at,
          completed_at: job.completed_at,
        })),
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Sync jobs list endpoint error');
      res.status(500).json({
        error: 'Internal server error',
        message: (error as Error).message,
      });
    }
  });

  /**
   * GET /api/inventory/alerts
   * Get active low stock alerts
   *
   * Query params:
   * - tenant_id: string (required)
   */
  router.get('/alerts', async (req: Request, res: Response) => {
    try {
      const { tenant_id } = req.query;

      if (!tenant_id) {
        return res.status(400).json({
          error: 'Missing tenant_id query parameter',
        });
      }

      const alerts = await syncService.getLowStockAlerts(tenant_id as string);

      res.json({
        total: alerts.length,
        alerts: alerts.map((alert) => ({
          id: alert.id,
          product_id: alert.product_id,
          current_qty: alert.current_available_qty,
          threshold_qty: alert.threshold_qty,
          severity: alert.current_available_qty === 0 ? 'critical' : 'warning',
          created_at: alert.created_at,
        })),
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Alerts endpoint error');
      res.status(500).json({
        error: 'Internal server error',
        message: (error as Error).message,
      });
    }
  });

  /**
   * PUT /api/inventory/alerts/:alertId/acknowledge
   * Acknowledge a low stock alert
   */
  router.put('/alerts/:alertId/acknowledge', async (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      const { user_id } = req.body;

      if (!user_id) {
        return res.status(400).json({
          error: 'user_id required in request body',
        });
      }

      await db('inventory_low_stock_alerts')
        .where({ id: parseInt(alertId) })
        .update({
          alert_status: 'acknowledged',
          acknowledged_by_user_id: user_id,
          acknowledged_at: new Date(),
          updated_at: new Date(),
        });

      res.json({ success: true, message: 'Alert acknowledged' });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Alert acknowledge endpoint error');
      res.status(500).json({
        error: 'Internal server error',
        message: (error as Error).message,
      });
    }
  });

  /**
   * GET /api/inventory/dashboard
   * Get inventory health summary for admin dashboard
   *
   * Query params:
   * - tenant_id: string (required)
   */
  router.get('/dashboard', async (req: Request, res: Response) => {
    try {
      const { tenant_id } = req.query;

      if (!tenant_id) {
        return res.status(400).json({
          error: 'Missing tenant_id query parameter',
        });
      }

      const summary = await syncService.getDashboardSummary(tenant_id as string);

      res.json({
        inventory_health: {
          total_products: summary.total_products,
          in_stock: summary.in_stock,
          low_stock: summary.low_stock_count,
          out_of_stock: summary.out_of_stock,
          health_percentage: summary.health_percentage,
        },
        recent_activity: {
          last_sync_at: summary.last_sync_at,
          sync_frequency: 'daily', // From config
        },
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Dashboard endpoint error');
      res.status(500).json({
        error: 'Internal server error',
        message: (error as Error).message,
      });
    }
  });

  /**
   * POST /api/inventory/reconciliation
   * Manual reconciliation with accounting system
   * (Phase 2: would integrate with actual Tally API)
   *
   * Body:
   * {
   *   tenant_id: string,
   *   accounting_export: AccountingExportRecord[]
   * }
   */
  router.post('/reconciliation', async (req: Request, res: Response) => {
    try {
      const { tenant_id, accounting_export } = req.body;

      if (!tenant_id || !Array.isArray(accounting_export)) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'tenant_id and accounting_export array required',
        });
      }

      const result = await syncService.initiateReconciliation(tenant_id, accounting_export);

      res.json(result);
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Reconciliation endpoint error');
      res.status(500).json({
        error: 'Internal server error',
        message: (error as Error).message,
      });
    }
  });

  return router;
}

export default createInventoryRoutes;
