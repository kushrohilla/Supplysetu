/**
 * Inventory Module Integration Guide
 * 
 * Step-by-step instructions to integrate the inventory system
 * into the existing SupplySetu backend application.
 */

// ============================================
// STEP 1: UPDATE src/routes/index.ts
// ============================================

/*
Add the inventory routes to your main routes file:

FILE: src/routes/index.ts
*/

import { Router } from 'express';
import { db } from '../database/knex'; // Your db instance
import createInventoryRoutes from '../modules/inventory/inventory.routes';

export function setupRoutes(app: Router): void {
  // Existing routes
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/catalogue', catalogueRoutes);
  
  // NEW: Inventory routes
  app.use('/api/inventory', createInventoryRoutes(db));
  
  // ... rest of routes
}

// ============================================
// STEP 2: UPDATE src/app.ts
// ============================================

/*
Initialize the inventory scheduler during app boot:

FILE: src/app.ts
*/

import { setupRoutes } from './routes';
import { initializeInventorySyncScheduler } from './modules/inventory/scheduler';

async function startApp() {
  const app = express();
  
  // ... middleware setup ...
  
  // Setup routes
  setupRoutes(app);
  
  // Initialize inventory sync scheduler
  try {
    const syncScheduler = await initializeInventorySyncScheduler(db);
    console.log('✓ Inventory sync scheduler initialized');
    
    // Store scheduler reference for graceful shutdown
    app.locals.syncScheduler = syncScheduler;
  } catch (error) {
    console.error('Failed to initialize inventory scheduler:', error);
    // Don't fail app startup, but warn in logs
  }
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    if (app.locals.syncScheduler) {
      await app.locals.syncScheduler.shutdown();
    }
    process.exit(0);
  });
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startApp();

// ============================================
// STEP 3: RUN DATABASE MIGRATIONS
// ============================================

/*
Execute the migration to create inventory tables:

In terminal, run:
*/

// npx knex migrate:latest --env development
// Output: Batch 1 run: 1 migration

// Alternatively, from package.json scripts:
// npm run migrate:latest

// Verify tables created:
// SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'inventory%';

// ============================================
// STEP 4: CREATE Inventory Sync Config Records
// ============================================

/*
Create default configuration for each tenant.
Run this INSERT statement in your database:
*/

INSERT INTO inventory_sync_config (
  tenant_id,
  auto_sync_enabled,
  sync_frequency_cron,
  low_stock_threshold_percent,
  strict_order_validation,
  import_format,
  accounting_system_type,
  max_retry_attempts,
  retry_backoff_ms,
  created_at,
  updated_at
) VALUES
  ('retailer_001', true, '0 2 * * *', 20, false, 'json', 'tally', 3, 5000, NOW(), NOW()),
  ('retailer_002', true, '0 2 * * *', 20, false, 'json', 'tally', 3, 5000, NOW(), NOW()),
  ('retailer_003', false, '0 2 * * *', 20, false, 'json', 'tally', 3, 5000, NOW(), NOW());
  
-- Explanation of fields:
-- tenant_id: Unique distributor/retailer ID
-- auto_sync_enabled: Whether to run scheduled syncs
-- sync_frequency_cron: '0 2 * * *' = Daily at 2 AM
-- low_stock_threshold_percent: 20 = Alert when stock < 20%
-- strict_order_validation: false = Soft warnings only
-- import_format: 'json' for API, 'csv' for file upload
-- accounting_system_type: 'tally' for Tally integration
-- max_retry_attempts: 3 = Retry failed syncs up to 3 times
-- retry_backoff_ms: 5000 = 5 seconds between retries (exponential)

// ============================================
// STEP 5: INSTALL REQUIRED DEPENDENCIES
// ============================================

/*
If not already installed, add to package.json:

npm install node-cron bull uuid

Also ensure you have:
- knex (for database)
- express
- typescript
- @types/node
- @types/express
*/

// ============================================
// STEP 6: UPDATE .env Configuration
// ============================================

/*
Add environment variables if needed:

FILE: .env
*/

# Inventory Sync Configuration
INVENTORY_REDIS_URL=redis://localhost:6379
INVENTORY_ENABLED=true
INVENTORY_LOG_LEVEL=info

// ============================================
// STEP 7: TEST THE INTEGRATION
// ============================================

/*
Use curl or Postman to test endpoints:
*/

# Test 1: Manual Sync Trigger
curl -X POST http://localhost:3000/api/inventory/sync \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "retailer_001",
    "records": [
      {
        "product_id": "PROD001",
        "product_name": "Wheat Flour 10kg",
        "sku": "WF10K",
        "warehouse_available": 150,
        "reserved": 0,
        "unit_of_measure": "bags",
        "last_count_date": "2024-01-15T10:00:00Z",
        "invoice_id": "INV2024001"
      },
      {
        "product_id": "PROD002",
        "product_name": "Rice 20kg",
        "sku": "RICE20K",
        "warehouse_available": 45,
        "reserved": 0,
        "unit_of_measure": "bags",
        "last_count_date": "2024-01-15T10:00:00Z"
      }
    ]
  }'

# Expected Response (200 OK):
{
  "sync_job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "success",
  "total_records": 2,
  "succeeded": 2,
  "failed": 0,
  "errors": [],
  "execution_time_ms": 250,
  "message": "Successfully synced 2 products"
}

# Test 2: Query Stock Snapshot
curl "http://localhost:3000/api/inventory/snapshot/PROD001?tenant_id=retailer_001"

# Expected Response (200 OK):
{
  "product_id": "PROD001",
  "available_quantity": 150,
  "reserved_quantity": 0,
  "committed_quantity": 150,
  "last_synced_at": "2024-01-15T10:05:30Z",
  "is_low_stock": false,
  "can_fulfill_order": true,
  "validation_status": "approved"
}

# Test 3: Get Dashboard Summary
curl "http://localhost:3000/api/inventory/dashboard?tenant_id=retailer_001"

# Expected Response (200 OK):
{
  "inventory_health": {
    "total_products": 2,
    "in_stock": 2,
    "low_stock": 0,
    "out_of_stock": 0,
    "health_percentage": 100
  },
  "recent_activity": {
    "last_sync_at": "2024-01-15T10:05:30Z",
    "sync_frequency": "daily"
  }
}

// ============================================
// STEP 8: VERIFY DATABASE TABLES
// ============================================

/*
Check that all tables were created:
*/

-- Using SQLite (development):
.tables
-- Output: inventory_alerts, inventory_audit_log, inventory_snapshots, inventory_sync_config, inventory_sync_jobs, inventory_sync_queue...

-- Verify schema:
.schema inventory_snapshots
-- Output: Shows table structure with columns

// ============================================
// STEP 9: INTEGRATION WITH ORDER PLACING
// ============================================

/*
Update order placement logic to check inventory:

FILE: src/modules/orders/order.service.ts
*/

import { InventorySyncService } from '../inventory/sync.service';

export class OrderService {
  private inventoryService: InventorySyncService;
  
  constructor(private db: Knex) {
    this.inventoryService = new InventorySyncService(db);
  }
  
  async placeOrder(tenantId: string, items: OrderItem[]): Promise<Order> {
    // Step 1: Validate inventory for each item (soft validation)
    const validations = await Promise.all(
      items.map(item => 
        this.inventoryService.getProductStock(tenantId, item.product_id)
      )
    );
    
    // Step 2: Build warnings for items with insufficient stock
    const warnings: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const stock = validations[i];
      const item = items[i];
      
      if (!stock) {
        warnings.push(`${item.product_id}: No stock data available`);
        continue;
      }
      
      if (stock.available_quantity < item.quantity) {
        warnings.push(
          `${item.product_id}: Only ${stock.available_quantity} available (requested ${item.quantity})`
        );
      }
    }
    
    // Step 3: If warnings but not strict validation, proceed with warnings
    const config = await this.db('inventory_sync_config')
      .where({ tenant_id: tenantId })
      .first();
    
    if (warnings.length > 0 && config?.strict_order_validation) {
      // Hard block: reject order
      throw new Error(`Cannot fulfill order: ${warnings.join('; ')}`);
    }
    
    // Step 4: Create order (with or without warnings)
    const order = await this.createOrderRecord({
      tenant_id: tenantId,
      items,
      warnings, // Store warnings for audit
    });
    
    return order;
  }
}

// ============================================
// STEP 10: MONITORING & OBSERVABILITY
// ============================================

/*
Set up logging for inventory operations:

FILE: Logs to configure
*/

// All operations log to logger instance:
// - Successfully synced: logger.info()
// - Partial failures: logger.warn()
// - Errors: logger.error()

// Monitor these metrics:
// 1. Sync Success Rate: (successful_syncs / total_syncs) * 100
// 2. Average Sync Time: avg(execution_time_ms) over last 24h
// 3. Error Count: failed_syncs per tenant per day
// 4. Alert Count: active inventory_low_stock_alerts
// 5. Retry Queue Length: pending items in inventory_sync_queue

// ============================================
// STEP 11: ADMIN DASHBOARD UI (React)
// ============================================

/*
Example React component structure for admin dashboard:

FILE: apps/admin-web/src/pages/InventoryDashboard.jsx
*/

import React, { useEffect, useState } from 'react';
import { InventoryHealthCard } from '../components/InventoryHealthCard';
import { LowStockAlertsPanel } from '../components/LowStockAlertsPanel';
import { SyncHistoryPanel } from '../components/SyncHistoryPanel';

export function InventoryDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchData() {
      const res = await fetch(
        `/api/inventory/dashboard?tenant_id=${tenantId}`
      );
      const data = await res.json();
      setDashboardData(data);
      setLoading(false);
    }
    
    fetchData();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div className="inventory-dashboard">
      <h1>Inventory Management</h1>
      
      <InventoryHealthCard
        {...dashboardData.inventory_health}
        lastSyncAt={dashboardData.recent_activity.last_sync_at}
        onRefresh={() => triggerManualSync()}
      />
      
      <LowStockAlertsPanel />
      <SyncHistoryPanel />
    </div>
  );
}

// ============================================
// STEP 12: RETAILER APP UPDATE (Flutter)
// ============================================

/*
Example Flutter component for stock visibility:

FILE: apps/mobile_flutter/lib/features/orders/widgets/stock_badge.dart
*/

import 'package:flutter/material.dart';

class StockBadge extends StatelessWidget {
  final int quantity;
  final StockStatus status;
  
  StockBadge({
    required this.quantity,
    required this.status,
  });
  
  @override
  Widget build(BuildContext context) {
    Color badgeColor;
    String label;
    
    switch (status) {
      case StockStatus.available:
        badgeColor = Colors.green;
        label = 'Available ($quantity)';
        break;
      case StockStatus.lowStock:
        badgeColor = Colors.orange;
        label = 'Low Stock ($quantity)';
        break;
      case StockStatus.outOfStock:
        badgeColor = Colors.red;
        label = 'Out of Stock';
        break;
      case StockStatus.unknown:
        badgeColor = Colors.grey;
        label = 'Stock Unknown';
        break;
    }
    
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: badgeColor.withOpacity(0.2),
        border: Border.all(color: badgeColor),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(color: badgeColor, fontWeight: FontWeight.bold),
      ),
    );
  }
}

enum StockStatus { available, lowStock, outOfStock, unknown }

// ============================================
// TROUBLESHOOTING
// ============================================

/*
Common issues and solutions:

1. Migration fails with "table already exists"
   Solution: Check if table exists in DB. If old schema, drop and re-run.
   
2. Scheduler not running after restart
   Solution: Verify sync config has auto_sync_enabled = true
   
3. Sync completing but data not updating
   Solution: Check database transaction logs. Verify tenant_id in records.
   
4. High memory usage with Bull queue
   Solution: Configure Redis. Reduce retry backoff if too many queued items.
   
5. API returning 400 "Missing tenant_id"
   Solution: All endpoints require ?tenant_id query param. Update API calls.
   
6. Low stock alerts not showing
   Solution: Check threshold_percent in sync_config. Default is 20%.
   Verify product max quantities in audit logs to calculate threshold.

// ============================================
// DEPLOYMENT CHECKLIST
// ============================================

Checklist before production deployment:

☐ Run migrations on production DB
☐ Create inventory_sync_config for all production tenants
☐ Test manual sync with sample data (Postman)
☐ Deploy updated backend code with inventory routes
☐ Verify scheduler initialized in logs
☐ Test order placement with inventory checks
☐ Deploy admin dashboard UI
☐ Deploy retailer app with stock visibility
☐ Monitor error rates for first 24 hours
☐ Set up alerts for sync failures
☐ Document runbook for manual reconciliation
☐ Train support team on low-stock alert acknowledgment

// ============================================
// END OF INTEGRATION GUIDE
// ============================================
*/
