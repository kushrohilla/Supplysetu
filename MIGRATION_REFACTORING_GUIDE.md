# Database Migration Refactoring Guide

**Status**: 🔄 Transition Period  
**Effective**: March 25, 2026  
**Migration Strategy**: Dual-track (old and new in parallel)

---

## Overview

The database migration strategy has been refactored from **timestamp/feature-based naming** to **ordered domain-driven sequence**. This ensures clear business logic progression and easier maintenance.

### Old Naming Convention (Deprecated)
```
001_create_inventory_tables.ts
202603130001_initial_foundation.ts
202603130002_order_workflow_foundation.ts
202603210001_product_catalogue_foundation.ts
20260323_create_retailers_and_distributor_links.ts
20260323_enhance_orders_table.ts
```

**Problems**:
- Non-sequential numbering (001, then 202603130001, then 202603210001)
- Impossible to determine execution order by name
- Feature names don't indicate domain progression
- Hard to add new migrations in logical sequence

### New Naming Convention (Active)
```
001_core_entities.ts
002_catalogue_structure.ts
003_order_lifecycle_core.ts
004_inventory_movement_ledger.ts
005_payment_transactions.ts
006_dispatch_support.ts
007_event_sourcing_ledgers.ts
```

**Benefits**:
- ✅ Sequential, domain-driven order
- ✅ Clear business logic progression
- ✅ Easy to insert new migrations (e.g., new module gets 007.5)
- ✅ Self-documenting: domain name indicates what tables it creates

---

## Migration Mapping: Old → New

| Old Migration | New Migration | Status | Notes |
|---------------|---------------|--------|-------|
| 001_create_inventory_tables.ts | 004_inventory_movement_ledger.ts | ⚠️ REPLACED | Inventory snapshot concept replaced with immutable movement ledger |
| 202603130001_initial_foundation.ts | 001_core_entities.ts | ✅ COPIED | Same tables: tenants, users, audit_logs |
| 202603130002_order_workflow_foundation.ts | 003_order_lifecycle_core.ts | ✅ MERGED | Orders table; merged with retailers & links tables |
| 202603210001_product_catalogue_foundation.ts | 002_catalogue_structure.ts | ✅ COPIED | Same tables: brands, products, schemes, import jobs |
| 20260323_create_retailers_and_distributor_links.ts | 003_order_lifecycle_core.ts | ✅ MERGED | Retailers & links now part of order domain |
| 20260323_enhance_orders_table.ts | 003_order_lifecycle_core.ts | ✅ MERGED | Order enhancements (retailer_id, idempotency_key) included in initial definition |

---

## What Changed: Key Improvements

### 1. Type Consistency (Data Integrity Fix)

**Before** (Mixed types causing foreign key errors):
```typescript
// retailers table
table.increments("id").primary(); // INTEGER

// retailer_distributor_links table
table.integer("retailer_id") // INTEGER references INTEGER retailer
table.integer("tenant_id") // INTEGER but should be UUID

// orders table
table.uuid("id").primary(); // UUID
table.integer("retailer_id") // INTEGER ❌ Foreign key type mismatch!

// order_line_items table
table.integer("product_id") // INTEGER references UUID tenant_products.id ❌
```

**After** (Consistent UUIDs):
```typescript
// retailers table
table.uuid("id").primary(); // UUID

// retailer_distributor_links table
table.uuid("retailer_id") // UUID references retailers.id ✅
table.uuid("tenant_id") // UUID references tenants.id ✅

// orders table
table.uuid("id").primary(); // UUID
table.uuid("retailer_id") // UUID ✅ Consistent!

// order_line_items table
table.uuid("tenant_product_id") // UUID ✅ References tenant_products.id
```

### 2. New Event Sourcing Tables

**Added** (to capture state changes):
- `order_status_history` — Every order status transition
- `order_line_event_history` — Line-item level changes
- `inventory_movement_events` — Audit trail for inventory
- `payment_transaction_events` — Payment reconciliation history

**Purpose**: Enable temporal queries ("What happened on March 20?") and event-driven notifications.

### 3. Inventory Movement Ledger

**Replaced** the snapshot-based concept:

**Old**: Direct state updates (stateless)
```sql
UPDATE tenant_product_stock_snapshots
SET stock_qty = stock_qty - 5
WHERE tenant_product_id = 'abc-123';
```

**New**: Immutable ledger entries (event-sourced)
```sql
INSERT INTO inventory_movements (
  tenant_product_id, quantity_change, movement_type_id, order_id
) VALUES ('abc-123', -5, 'sales_order', 'order-456');

-- Current stock = SUM of all movements
SELECT SUM(quantity_change) FROM inventory_movements
WHERE tenant_product_id = 'abc-123';
```

**Benefits**:
- Complete audit trail (no overwrites)
- Handles concurrent updates safely
- Supports reversals and adjustments
- Reconciliation against accounting system

### 4. Payment Reconciliation Tables

**Added**: `payment_sync_config` table for accounting system integration

```sql
INSERT INTO payment_sync_config (
  tenant_id,
  accounting_system_type,
  auto_sync_enabled,
  sync_frequency_cron
) VALUES (
  'tenant-1',
  'tally',
  true,
  '0 */4 * * *'  -- Every 4 hours
);
```

Enables:
- Automatic reconciliation with accounting systems
- Tolerance windows for rounding differences
- Dispute tracking and reversal workflows

---

## Data Migration Strategy: Zero-Downtime

### Phase 1: Deploy New Migrations (No Data Yet)

```bash
# New tables are created but empty
npm run migrate:latest

# Old tables remain untouched
# Application continues using old schema
```

**Duration**: 15 minutes  
**Risk**: None — old tables unchanged, new tables empty

### Phase 2: Populate New Tables (Background Job)

```typescript
// Migration job (runs in background, doesn't block application)
async function migrateInventorySnapshots() {
  const snapshots = await db('inventory_snapshots').select('*');
  
  for (const snapshot of snapshots) {
    // Convert snapshot to movement ledger
    await db('inventory_movements').insert({
      tenant_product_id: snapshot.product_id,
      quantity_change: snapshot.available_quantity, // Initial stock as +X movement
      movement_type_id: 'initial_snapshot',
      source_document: JSON.stringify(snapshot),
      created_at: snapshot.last_synced_at
    });
  }
  
  // Also populate stock snapshots for comparison
  await db('tenant_product_stock_snapshots').insert(
    snapshots.map(s => ({
      tenant_product_id: s.product_id,
      stock_qty: s.available_quantity,
      captured_at: s.last_synced_at,
      source: 'legacy_migration'
    }))
  );
}
```

**Duration**: 2–10 minutes (depending on data volume)  
**Risk**: Low — read-only operation, no writes yet

### Phase 3: Dual-Write Mode

```typescript
// Application writes to BOTH old and new tables
// (Ensures consistency if rollback needed)

async function recordInventoryUpdate(productId, quantity) {
  // Old table write
  await db('inventory_snapshots')
    .where('product_id', productId)
    .update({ available_quantity: quantity });
  
  // New table write
  await db('inventory_movements').insert({
    tenant_product_id: productId,
    quantity_change: quantity - oldQuantity,
    movement_type_id: 'sales_order',
    created_by_user_id: req.user.id
  });
}
```

**Duration**: 48 hours (monitoring & validation)  
**Risk**: Low — both paths validating

### Phase 4: Feature Flag Cutover

```typescript
// Feature flag: USE_MOVEMENT_LEDGER
if (process.env.USE_MOVEMENT_LEDGER === 'true') {
  // Read from new table, write to new table only
  queryInventoryFrom = 'inventory_movements';
} else {
  // Read from old table, write to old table only
  queryInventoryFrom = 'inventory_snapshots';
}
```

**Duration**: Instant (flip flag)  
**Risk**: Low — can flip back if issues

### Phase 5: Archive Old Tables (Optional)

```bash
# After 30 days with zero issues:
# Keep old tables for reference (don't delete)
# Just stop writing to them

ALTER TABLE inventory_snapshots SET UNLOGGED;
# This table becomes read-only reference

# Optionally archive to S3 for compliance/audit
pg_dump supplysetu -t inventory_snapshots > s3://backup/inventory_snapshots.sql
```

---

## Execution Checklist

### Pre-Deployment (1 week before)

- [ ] Code review: New migrations reviewed for correctness
- [ ] Staging test: Run migrations against staging database
- [ ] Backup: Full production database backup created
- [ ] Rollback plan: Tested rollback procedure
- [ ] Team communication: Engineering & ops team briefed

### Day 1: Deploy New Migrations

```bash
# 1. Backup production
pg_dump supplysetu > /backups/supplysetu-2026-03-25.sql

# 2. Deploy application code (no database changes yet)
git pull && npm install && npm run build
pm2 stop supplysetu-app
pm2 start supplysetu-app

# 3. Run new migrations (creates new tables only)
npm run migrate:latest

# 4. Verify old tables still exist and unchanged
psql supplysetu -c "SELECT * FROM inventory_snapshots LIMIT 1;"

# 5. Verify new tables exist
psql supplysetu -c "\dt *_ledger* *_event* *_log*;"
```

### Day 2-3: Data Migration Job

```bash
# 1. Start background migration job
npm run job:migrateInventoryData &

# 2. Monitor progress
SELECT COUNT(*) FROM inventory_movements;

# 3. Validate counts match
SELECT COUNT(*) FROM inventory_snapshots;
SELECT COUNT(*) FROM inventory_movements;
# Should be equal (or movements count higher if existing adjustments)
```

### Day 4-5: Dual-Write Validation

```bash
# Application writes to both tables
# Logs should show both writes completing
grep "inventory_movements INSERT\|inventory_snapshots UPDATE" /var/log/supplysetu.log

# Verify consistency
SELECT tp.id,
  COALESCE(SUM(im.quantity_change), 0) as computed_stock,
  (SELECT stock_qty FROM tenant_product_stock_snapshots tps 
   WHERE tps.tenant_product_id = tp.id 
   ORDER BY captured_at DESC LIMIT 1) as last_snapshot
FROM tenant_products tp
LEFT JOIN inventory_movements im ON im.tenant_product_id = tp.id
WHERE tp.tenant_id = $1
GROUP BY tp.id
HAVING COALESCE(SUM(im.quantity_change), 0) != 
       (SELECT stock_qty FROM ... LIMIT 1);

# If counts match, queries align → safe to cutover
```

### Day 6: Feature Flag Cutover

```bash
# Set feature flag to use new schema
export USE_MOVEMENT_LEDGER=true
pm2 restart supplysetu-app

# Monitor application logs for 24 hours
tail -f /var/log/supplysetu.log

# Check that old tables aren't being written to
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del
FROM pg_stat_user_tables
WHERE tablename IN ('inventory_snapshots', 'inventory_sync_jobs')
ORDER BY n_tup_upd DESC;

# Should show 0 new writes (only historical data)
```

---

## Rollback Procedures

### Quick Rollback (If Issues Found in First 24 Hours)

```bash
# 1. Flip feature flag back
export USE_MOVEMENT_LEDGER=false
pm2 restart supplysetu-app

# 2. Monitor application logs
tail -f /var/log/supplysetu.log

# 3. If all healthy, keep old schema and scheduled new attempt
# (No database rollback needed — old tables unchanged)
```

### Full Rollback (If Critical Issues)

```bash
# 1. Stop application
pm2 stop supplysetu-app

# 2. Drop new tables (preserves old tables)
npm run migrate:rollback --steps 7

# 3. Restart application with old code deployed
git checkout {old_commit_hash}
npm install && npm run build
pm2 start supplysetu-app

# 4. Engage incident response team
```

---

## Testing Checklist

### Unit Tests

- [ ] `inventory_movements` insert/query tests
- [ ] Stock calculation (SUM query) tests
- [ ] Order → movement linkage tests
- [ ] Event sourcing trigger tests

### Integration Tests

- [ ] End-to-end order creation flows
- [ ] Inventory adjustment workflows
- [ ] Payment reconciliation flows
- [ ] Dispatch route optimization

### Query Performance Tests

```sql
-- Original query (inventory snapshots)
\timing
SELECT stock_qty FROM tenant_product_stock_snapshots
WHERE tenant_product_id = 'abc-123'
ORDER BY captured_at DESC LIMIT 1;
-- Should be ~1ms

-- New query (movement ledger)
\timing
SELECT SUM(quantity_change) FROM inventory_movements
WHERE tenant_product_id = 'abc-123';
-- Should be ~5-10ms (acceptable for analytical query)

-- Verify index usage
EXPLAIN ANALYZE
SELECT SUM(quantity_change) FROM inventory_movements
WHERE tenant_product_id = 'abc-123';
-- Should use idx_movements_product index
```

---

## FAQ

### Q: Can I run old migrations alongside new ones?

**A**: Yes, during transition period. Old tables remain, new tables are empty initially. Once data migration complete, old tables are kept for reference (read-only).

### Q: What if my existing code references old table names?

**A**: Update references gradually:
1. Create data access layer abstraction
2. Add feature flag for table selection
3. Migrate code piece-by-piece
4. Test extensively in staging

### Q: How do I add new migrations now?

**A**: Use the new naming format:
- Next migration after 007 = `008_module_name.ts`
- Follows same domain-driven pattern
- Update `DATABASE_EVOLUTION.md` with new phase

### Q: What about existing test databases?

**A**: Regenerate test DB from new migration sequence:
```bash
npm run db:test:clean
npm run migrate:latest --env test
npm run db:seed
```

### Q: Can I delete old migrations?

**A**: Not yet. Keep for:
1. Historical reference
2. Rollback capability
3. Audit trail
4. ~30 days, then archive to version control tag

---

## Post-Deployment Monitoring

### Metrics to Track (First Week)

- Query response times (should be within 5% of baseline)
- Inventory accuracy (movements vs. old snapshots)
- Order fulfillment times (should be unchanged)
- Application error rates (should be 0)

### Dashboard Queries

```sql
-- Stock reconciliation
SELECT COUNT(*) as products_with_movements
FROM (
  SELECT DISTINCT(tenant_product_id)
  FROM inventory_movements
) movements
WHERE tenant_product_id IN (
  SELECT DISTINCT(tenant_product_id)
  FROM tenant_product_stock_snapshots
);

-- Event completeness
SELECT event_type, COUNT(*) as count
FROM order_status_history
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type
ORDER BY count DESC;

-- Payment reconciliation success
SELECT reconciliation_status, COUNT(*) as count
FROM payment_transaction_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY reconciliation_status;
```

---

## Support & Contact

**Questions about new migrations?**
- See `DATABASE_EVOLUTION.md` for conceptual overview
- See `src/database/migrations/*.ts` for implementation details
- Run `npm run migrate:status` to see migration state

**Issues or rollback needed?**
- Engage DevOps team immediately
- Reference this guide's rollback section
- Escalate to database architect

---

**Version History:**
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-25 | DevOps | Initial migration refactoring guide |

