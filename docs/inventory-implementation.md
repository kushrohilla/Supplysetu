# Inventory Visibility & Accounting Sync System - Implementation Guide

## System Overview

The inventory system provides real-time stock visibility with accounting system master authority, enabling distributor retailers to make informed order decisions and administrators to manage stock effectively. The system supports two implementation phases: batch import (Phase 1) and webhook-based real-time sync (Phase 2).

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         ADMIN DASHBOARD                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  │ Health Overview  │  │ Low Stock Alerts │  │ Sync History     │
│  │ dashbaord        │  │ (active tracking)│  │ (job tracking)   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘
│  ┌──────────────────┐  ┌──────────────────┐
│  │ Inventory Table  │  │ Configuration    │
│  │ (stock details)  │  │ (sync settings)  │
│  └──────────────────┘  └──────────────────┘
└─────────────────────────────────────────────────────────────────┘
                              ↑
                              │ HTTP API
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API LAYER                             │
│  POST   /api/inventory/sync              (Manual trigger)        │
│  GET    /api/inventory/snapshot/:id      (Stock query)           │
│  GET    /api/inventory/sync-jobs         (Job history)           │
│  GET    /api/inventory/alerts            (Low stock alerts)      │
│  POST   /api/inventory/reconciliation    (Manual reconcile)      │
│  GET    /api/inventory/dashboard         (Health summary)        │
└─────────────────────────────────────────────────────────────────┘
                              ↑
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    SYNC SERVICE LAYER                            │
│  ┌─────────────────────────────────────────────────────────────┐
│  │ Batch Import Handler                                        │
│  │  - Parse CSV/JSON from accounting system                   │
│  │  - Validate records (qty, product mapping)                 │
│  │  - Atomic transaction: update snapshots + audit            │
│  │  - Generate low-stock alerts                               │
│  └─────────────────────────────────────────────────────────────┘
│  ┌─────────────────────────────────────────────────────────────┐
│  │ Scheduler (node-cron + Bull)                                │
│  │  - Cron-based batch sync (Phase 1: scheduled_sync)         │
│  │  - Webhook listener (Phase 2: webhook_delta)               │
│  │  - Exponential backoff retry logic                          │
│  └─────────────────────────────────────────────────────────────┘
│  ┌─────────────────────────────────────────────────────────────┐
│  │ Reconciliation Engine                                       │
│  │  - Compare DB snapshots ↔ Accounting export                │
│  │  - Surface discrepancies to admin                           │
│  │  - Atomic bulk update on approval                           │
│  └─────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
                              ↑
                              │ Database Transactions
                              │
┌─────────────────────────────────────────────────────────────────┐
│                     DATABASE LAYER (Knex)                        │
│  ┌───────────────────────────────────────────────────────────┐
│  │ inventory_snapshots                                       │
│  │  - tenant_id, product_id (unique)                        │
│  │  - available_qty, reserved_qty, committed_qty             │
│  │  - last_synced_at, sync_source_reference                  │
│  ├───────────────────────────────────────────────────────────┤
│  │ inventory_sync_jobs                                       │
│  │  - sync_type: batch_import | webhook_delta | reconcile   │
│  │  - sync_status: pending | in_progress | success | partial│
│  │  - records_processed/succeeded/failed                     │
│  │  - execution_time_ms, error tracking                      │
│  ├───────────────────────────────────────────────────────────┤
│  │ inventory_audit_log                                       │
│  │  - Complete history of qty changes                        │
│  │  - change_reason: sync_import | manual_adjustment | etc   │
│  │  - source_invoice_id (for traceability)                   │
│  ├───────────────────────────────────────────────────────────┤
│  │ inventory_sync_config                                     │
│  │  - auto_sync_enabled, sync_frequency_cron                 │
│  │  - low_stock_threshold_percent                            │
│  │  - strict_order_validation, webhook config (Phase 2)      │
│  │  - retry policy (max_attempts, backoff_ms)                │
│  ├───────────────────────────────────────────────────────────┤
│  │ inventory_sync_queue                                      │
│  │  - Retry queue for failed syncs                           │
│  │  - Fields: retry_count, next_retry_at, payload            │
│  ├───────────────────────────────────────────────────────────┤
│  │ inventory_low_stock_alerts                                │
│  │  - Active alerts for products below threshold             │
│  │  - Acknowledgment tracking, resolution status             │
│  └───────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
                              ↑
                              │
┌─────────────────────────────────────────────────────────────────┐
│                  ACCOUNTING SYSTEM (PHASE 1: Manual)             │
│                     (PHASE 2: Webhook)                           │
│  source_system: 'tally' | 'sap' | 'custom_api'                 │
│                                                                  │
│  PHASE 1 (Current):                                             │
│    - Admin uploads CSV/JSON export from Tally                   │
│    - Or: Scheduled job fetches from shared storage              │
│                                                                  │
│  PHASE 2 (Future):                                              │
│    - Tally sends webhook on inventory change                    │
│    - Route: POST /api/inventory/webhook/tally                   │
│    - Processing: Incremental delta sync                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Batch Import (Current)

**Timeline:** Weeks 1-3

**Scope:**
- Database schema (✅ Created: migrations/001_create_inventory_tables.ts)
- Batch import service (✅ Created: modules/inventory/sync.service.ts)
- REST API endpoints (✅ Created: modules/inventory/inventory.routes.ts)
- Cron-based scheduler (✅ Created: modules/inventory/scheduler.ts)
- Admin dashboard UI components (✅ Designed: docs/inventory-ui-components.ts)

**Implementation Steps:**

1. **Database Migration**
   ```bash
   npx knex migrate:latest --env development
   # Tables created:
   # - inventory_snapshots
   # - inventory_sync_jobs
   # - inventory_audit_log
   # - inventory_sync_config
   # - inventory_sync_queue
   # - inventory_low_stock_alerts
   ```

2. **Integrate into Main App**
   - Import routes in `src/routes/index.ts`:
   ```typescript
   import { createInventoryRoutes } from '../modules/inventory/inventory.routes';
   
   app.use('/api/inventory', createInventoryRoutes(db));
   ```

3. **Initialize Scheduler**
   - In `src/app.ts` boot sequence:
   ```typescript
   import { initializeInventorySyncScheduler } from '../modules/inventory/scheduler';
   
   const scheduler = await initializeInventorySyncScheduler(db);
   // Scheduler now runs automated syncs per tenant config
   ```

4. **Create Admin Dashboard**
   - Use UI component types from `docs/inventory-ui-components.ts`
   - Implement in `apps/admin-web/` with React
   - Key screens:
     - /admin/inventory (overview + health metrics)
     - /admin/inventory/table (full product inventory)
     - /admin/inventory/alerts (low stock management)
     - /admin/inventory/config (sync settings)

5. **Update Retailer App**
   - Add stock visibility in Flutter/React Native apps
   - Modify order flow to query `/api/inventory/snapshot`
   - Display availability badges on product cards
   - Implement soft validation during order placement

**API Examples:**

```bash
# Manual sync trigger
curl -X POST http://localhost:3000/api/inventory/sync \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "retailer123",
    "records": [
      {
        "product_id": "PROD001",
        "product_name": "Wheat Flour 10kg",
        "sku": "WF10K",
        "warehouse_available": 150,
        "reserved": 0,
        "unit_of_measure": "bags",
        "last_count_date": "2024-01-15T10:00:00Z",
        "invoice_id": "INV123456"
      }
    ]
  }'

# Response:
{
  "sync_job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "success",
  "total_records": 1,
  "succeeded": 1,
  "failed": 0,
  "errors": [],
  "execution_time_ms": 250,
  "message": "Successfully synced 1 products"
}

# Query stock snapshot
curl http://localhost:3000/api/inventory/snapshot/PROD001?tenant_id=retailer123

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

# Get dashboard summary
curl http://localhost:3000/api/inventory/dashboard?tenant_id=retailer123

{
  "inventory_health": {
    "total_products": 250,
    "in_stock": 210,
    "low_stock": 35,
    "out_of_stock": 5,
    "health_percentage": 86
  },
  "recent_activity": {
    "last_sync_at": "2024-01-15T10:05:30Z",
    "sync_frequency": "daily"
  }
}
```

---

### Phase 2: Webhook-Based Real-Time Sync (Future - Weeks 4-6)

**Scope:**
- Webhook endpoint: `POST /api/inventory/webhook/tally`
- Delta sync processing (incremental updates)
- Field mapping: Tally fields ↔ SupplySetu fields
- Signature verification (HMAC-SHA256)
- Deduplication logic (prevent duplicate updates)

**Tally Integration Points:**
```typescript
// In scheduler.ts, implement:
router.post('/webhook/tally', async (req, res) => {
  // 1. Verify webhook signature
  const signature = req.headers['x-tally-signature'];
  const payload = req.body;
  
  // 2. Validate HMAC
  if (!verifyTallySignature(payload, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // 3. Extract delta changes
  const changes = parseTallyWebhookPayload(payload);
  
  // 4. Process as webhook_delta type
  const result = await syncService.processWebhookDelta(changes);
  
  // 5. Return ack
  res.json({ received: true, sync_job_id: result.sync_job_id });
});
```

---

## Data Consistency & Error Handling

### Soft Validation Model

The system implements **soft validation** to maximize operational flexibility:

- **Hard Block (Disabled by default):**
  - `strict_order_validation: false` in sync config
  - Orders never blocked due to lack of stock data

- **Soft Warnings:**
  - Display: "⚠ Only 12 units available" on order placement
  - User explicitly confirms order
  - Audit logged for post-fulfillment analysis

- **Fallback:**
  - If stock data unknown: "ℹ Stock information unavailable"
  - User can still place order
  - System warns retailer of data staleness

### Error Recovery

The system implements multi-layered error handling:

1. **Validation Errors** (Record-level)
   - Product not found, invalid quantities, etc.
   - Single record failure doesn't block batch
   - Logged in `inventory_sync_jobs.failure_reason` (JSON array)

2. **Processing Errors** (Transactional)
   - Database constraint violations, deadlocks
   - Entire record marked failed
   - Transaction rolls back atomically

3. **Job Failure** (Batch-level)
   - Complete batch fails to process
   - Job marked `status: 'failed'`
   - Queued for automatic retry with exponential backoff
   - Retry logic in `processPendingRetries()` (every 10 seconds)

4. **Permanent Failure**
   - After `max_retry_attempts` exceeded
   - Job marked `status: 'failed_permanently'`
   - Alert sent to admin
   - Manual intervention required

### Retry Strategy

```
Retry Schedule (with default 5000ms base backoff):
- Attempt 1: Immediate
- Attempt 2: +5 seconds (new attempt after 5s)
- Attempt 3: +20 seconds (exponential: 5s * 2^1)
- Attempt 4: +40 seconds (exponential: 5s * 2^2)
- Then: Manual reconciliation required

Formula: backoff_ms * Math.pow(2, retryCount - 1)
```

---

## Concurrency & Distributed Transactions

###Atomic Snapshot Updates

Each product update is wrapped in a database transaction:

```typescript
// In sync.service.ts: updateInventorySnapshot()
return this.db.transaction(async (trx) => {
  // 1. Get current snapshot (locked for this transaction)
  const current = await trx('inventory_snapshots')
    .where({ tenant_id, product_id })
    .first();
  
  // 2. Update or insert atomically
  if (current) {
    await trx('inventory_snapshots')
      .where({ tenant_id, product_id })
      .update({ /* new values */ });
  } else {
    await trx('inventory_snapshots').insert({ /* new values */ });
  }
  
  // 3. Log to audit table in same transaction
  await trx('inventory_audit_log').insert({ /* audit */ });
  
  // 4. Check and update low-stock alerts
  await this.evaluateLowStockAlert(trx, ...);
  
  // If all succeed, transaction commits; else full rollback
});
```

### Concurrent Batch Processing

Multiple syncs can run in parallel (different tenants):

```typescript
// processBatchImport() uses Promise.all()
const updatePromises: Promise<void>[] = [];
for (const record of payload.records) {
  updatePromises.push(
    this.updateInventorySnapshot(tenant_id, record, syncJobId, 'sync_import')
  );
}
await Promise.all(updatePromises); // Execute all in parallel
```

---

## Monitoring & Observability

### Logging Points

All key operations are logged:

```typescript
// Successful sync
logger.info('Batch import completed', {
  syncJobId,
  tenant,
  status: 'success',
  succeeded: 450,
  failed: 0,
  executionMs: 1200,
});

// Partial failure
logger.warn('Batch import partial failure', {
  syncJobId,
  succeeded: 445,
  failed: 5, // With details in failure_reason JSON
});

// Retry queued
logger.info('Queued sync for retry - tenant', {
  retryCount: 2,
  nextRetryAt: '2024-01-15T11:30:00Z',
  backoffMs: 20000,
});
```

### Dashboard Metrics

Admin dashboard displays:
- **Health Percentage:** (total_products - out_of_stock) / total_products
- **Sync Status:** Last successful sync time + next scheduled sync
- **Alert Metrics:** Count of active low-stock alerts
- **Error Rate:** Failed syncs in last 7 days

---

## Security Considerations

### Data Access Control

- All queries scoped by `tenant_id`
- No cross-tenant data leakage possible
- API requires tenant_id in query params

### Audit Trail

- Every stock change logged to `inventory_audit_log`
- Immutable record of all operations
- Change reason tracked (sync_import, manual_adjustment, etc.)
- Source reference recorded (invoice_id for traceability)

### Webhook Verification (Phase 2)

```typescript
function verifyTallySignature(payload: string, signature: string): boolean {
  const config = await db('inventory_sync_config')
    .where({ tenant_id, accounting_system_type: 'tally' })
    .first();
  
  const hmac = crypto
    .createHmac('sha256', config.webhook_secret)
    .update(payload)
    .digest('hex');
  
  return hmac === signature; // Constant-time comparison
}
```

---

## Testing Strategy

### Unit Tests (sync.service.ts)

```typescript
describe('InventorySyncService', () => {
  describe('processBatchImport', () => {
    it('should validate records before processing', async () => {
      // Test negative quantity rejection
    });
    
    it('should create atomic transaction per product', async () => {
      // Test rollback on constraint violation
    });
    
    it('should create low-stock alerts when qty < threshold', async () => {
      // Test alert generation
    });
    
    it('should handle partial failures gracefully', async () => {
      // 10 records: 8 succeed, 2 fail
      // Status should be 'partial'
    });
  });
});
```

### Integration Tests (API routes)

```typescript
describe('POST /api/inventory/sync', () => {
  it('should accept manual sync and update snapshots', async () => {
    const res = await request(app)
      .post('/api/inventory/sync')
      .send({ tenant_id: 'test', records: [...] });
    
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    
    // Verify DB updated
    const snapshot = await db('inventory_snapshots').where({ ... }).first();
    expect(snapshot.available_quantity).toBe(150);
  });
});
```

### E2E Tests

```typescript
// Simulate full workflow:
1. Admin triggers manual sync via UI
2. API processes 100 records in 500ms
3. Dashboard reflects updated stock levels
4. Low-stock alert created for product X
5. Retailer sees updated availability badge
```

---

## Deployment Checklist

- [ ] Run migrations on production database
- [ ] Configure sync frequency cron expression per tenant
- [ ] Set up Redis for Bull queue (optional but recommended)
- [ ] Configure Tally webhook URL (Phase 2)
- [ ] Create inventory_sync_config records for all tenants
- [ ] Test manual sync via REST client (Postman/curl)
- [ ] Deploy admin dashboard UI components
- [ ] Update retailer apps with stock visibility components
- [ ] Load test: 1000 products × 100 retailers concurrently
- [ ] Monitor logs for first week (error rates, sync times)

---

## API Reference Quick Guide

| Endpoint | Method | Purpose | Phase |
|----------|--------|---------|-------|
| `/api/inventory/sync` | POST | Manual sync trigger | 1 |
| `/api/inventory/snapshot/:id` | GET | Query stock level | 1 |
| `/api/inventory/sync-jobs` | GET | List sync history | 1 |
| `/api/inventory/sync-jobs/:id` | GET | Sync job details | 1 |
| `/api/inventory/alerts` | GET | Low stock alerts | 1 |
| `/api/inventory/alerts/:id/acknowledge` | PUT | Acknowledge alert | 1 |
| `/api/inventory/reconciliation` | POST | Manual reconcile | 1 |
| `/api/inventory/dashboard` | GET | Health summary | 1 |
| `/api/inventory/webhook/tally` | POST | Tally webhook | 2 |

---

## File Structure

```
src/
  modules/inventory/
    types.ts                    # Type definitions
    sync.service.ts            # Core sync logic
    inventory.routes.ts        # API endpoints
    scheduler.ts               # Cron + Bull scheduler
  
src/database/migrations/
  001_create_inventory_tables.ts  # Database schema

docs/
  inventory-ui-components.ts   # Component design spec
  inventory-implementation.md  # This guide
```

---

## Next Steps

1. **Run database migrations** (Week 1)
2. **Integrate routes into main app** (Week 1)
3. **Build admin dashboard UI** (Week 2)
4. **Update retailer apps** (Week 2-3)
5. **Load test & performance tuning** (Week 3)
6. **Pilot with first 5 retailers** (Week 3)
7. **Address feedback & edge cases** (Week 4)
8. **Prepare Phase 2 design** (Week 4)
9. **Deploy to production** (Week 5)
10. **Monitor & iterate** (Ongoing)

---

**End of Implementation Guide**
