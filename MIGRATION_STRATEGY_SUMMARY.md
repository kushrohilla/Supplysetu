# Database Migration Strategy Summary

**Status**: ✅ Complete  
**Created**: March 25, 2026  
**Next Review**: April 25, 2026

---

## Quick Reference

### 7-Phase Domain-Driven Migration Sequence

```
001: Core Entities
    └─ tenants, users, audit_logs

002: Catalogue Structure
    └─ brands, products, schemes, snapshots, import_jobs

003: Order Lifecycle Core
    └─ retailers, links, orders, line_items

004: Inventory Movement Ledger ⭐ NEW
    └─ movements (immutable), movement_types, adjustment_reasons

005: Payment Transactions ⭐ ENHANCED
    └─ order_payments, payment_transaction_log, sync_config

006: Dispatch Support ⭐ NEW
    └─ routes, stops, pod_items, performance_summary

007: Event Sourcing Ledgers ⭐ NEW
    └─ order_status_history, line_events, movement_events, payment_events
```

---

## What Changed

| Aspect | Before | After | Impact |
|--------|--------|-------|--------|
| **Naming** | Timestamp/feature (001_*, 202603130001_*) | Ordered domain (001_, 002_, 003_, ...) | Clear execution order |
| **Inventory** | Direct snapshots (UPDATE stock = X) | Immutable movements (INSERT -5 qty) | Audit trail, no race conditions |
| **Events** | No structured history | 4 event tables | Temporal queries, notifications |
| **Foreign Keys** | Mixed INT/UUID types | Consistent UUIDs | No type mismatches |
| **Payment Flow** | Simple table | Sync config + transaction log | Accounting integration |
| **Dispatch** | No tracking | Full route/POD tracking | Last-mile visibility |

---

## Key Files

### Documentation (Read First)
1. **[DATABASE_EVOLUTION.md](DATABASE_EVOLUTION.md)** — Complete strategy & design decisions
2. **[MIGRATION_REFACTORING_GUIDE.md](MIGRATION_REFACTORING_GUIDE.md)** — Execution checklist & zero-downtime plan

### Migration Files (New)
```
src/database/migrations/
├── 001_core_entities.ts
├── 002_catalogue_structure.ts
├── 003_order_lifecycle_core.ts
├── 004_inventory_movement_ledger.ts ⭐
├── 005_payment_transactions.ts
├── 006_dispatch_support.ts
└── 007_event_sourcing_ledgers.ts
```

### Old Migration Files (Deprecated)
```
src/database/migrations/
├── 001_create_inventory_tables.ts (replace with 004)
├── 202603130001_initial_foundation.ts (use 001)
├── 202603130002_order_workflow_foundation.ts (use 003)
├── 202603210001_product_catalogue_foundation.ts (use 002)
├── 20260323_create_retailers_and_distributor_links.ts (merge into 003)
└── 20260323_enhance_orders_table.ts (merge into 003)
```

---

## Implementation Stages

### Stage 1: Deployment (Day 1)
```bash
npm run migrate:latest  # Creates new tables (old tables untouched)
```
- ✅ New tables created
- ✅ Old tables remain unchanged
- ✅ Zero downtime
- ⏱️ 15 minutes

### Stage 2: Data Migration (Days 2-3)
```bash
npm run job:migrateInventoryData  # Background population
```
- ✅ Existing data copied to new tables
- ✅ Non-blocking operation
- ✅ Can rollback instantly
- ⏱️ 10-30 minutes (data volume dependent)

### Stage 3: Dual Write (Days 4-5)
- ✅ Application writes to both old + new
- ✅ Reads from new table only
- ✅ Validation in progress
- ⏱️ 48 hours monitoring

### Stage 4: Feature Flag Cutover (Day 6)
```bash
export USE_MOVEMENT_LEDGER=true
pm2 restart supplysetu-app
```
- ✅ No database changes
- ✅ Instant rollback possible
- ✅ Monitoring continues
- ⏱️ Instantaneous

### Stage 5: Archive Old Tables (Day 30+)
```bash
ALTER TABLE inventory_snapshots SET UNLOGGED;
# Keep for reference, stop writing entirely
```
- ✅ Old data preserved
- ✅ No longer written to
- ✅ Available for audit/comparison
- ✅ Can be archived to S3

---

## New Capabilities

### 1. Immutable Inventory Ledger

**Query**: "What's the stock right now?"
```sql
SELECT SUM(quantity_change) 
FROM inventory_movements
WHERE tenant_product_id = 'abc-123';
```

**Query**: "What was the stock on March 20?"
```sql
SELECT SUM(quantity_change) 
FROM inventory_movements
WHERE tenant_product_id = 'abc-123'
  AND created_at <= '2026-03-20'::timestamp;
```

**Benefits**:
- ✅ Complete transaction history (no overwrites)
- ✅ Safe concurrent updates (no race conditions)
- ✅ Reversals & adjustments supported
- ✅ Reconciliation with accounting system possible

### 2. Order Status Timeline

**Query**: "Show me everything that happened to order #123"
```sql
SELECT created_at, previous_status, new_status, trigger_reason
FROM order_status_history
WHERE order_id = 'order-123'
ORDER BY created_at ASC;
```

**Result**:
```
2026-03-20 10:30:00 | NULL            | pending_approval  | { reason: "order_created" }
2026-03-20 10:35:00 | pending_approval | confirmed         | { reason: "payment_received", amount: 50000 }
2026-03-20 14:00:00 | confirmed       | dispatched        | { reason: "all_items_packed" }
2026-03-20 18:30:00 | dispatched      | delivered         | { reason: "delivery_confirmed" }
```

### 3. Payment Reconciliation

**Query**: "Are all payments reconciled?"
```sql
SELECT reconciliation_status, COUNT(*) as count
FROM payment_transaction_log
WHERE tenant_id = 'tenant-1'
GROUP BY reconciliation_status;
```

**Result**:
```
reconciled              | 145
accounting_sync_pending | 3
disputed                | 1
```

### 4. Dispatch Tracking

**Query**: "What's the delivery status for order line #456?"
```sql
SELECT dpi.condition, dpi.quantity_delivered, dpi.created_at
FROM dispatch_pod_items dpi
WHERE dpi.order_line_item_id = 'line-456'
ORDER BY dpi.created_at DESC LIMIT 1;
```

**Result**:
```
acceptable | 10 | 2026-03-20 18:30:00
```

---

## Example Workflows

### Workflow 1: Create an Order (New Flow)

```typescript
// 1. Create order
const order = await db('orders').insert({
  id: orderId,
  tenant_id: tenantId,
  retailer_id: retailerId,
  status: 'pending_approval'
});

// 2. Record status change in event table
await db('order_status_history').insert({
  order_id: orderId,
  new_status: 'pending_approval',
  trigger_reason: { reason: 'order_created' }
});

// 3. Create line items
await db('order_line_items').insert(lineItems);

// 4. Record line item events
for (const item of lineItems) {
  await db('order_line_event_history').insert({
    order_line_item_id: item.id,
    event_type: 'created',
    new_quantity: item.quantity
  });
}

// 5. Record inventory movements
for (const item of lineItems) {
  await db('inventory_movements').insert({
    tenant_product_id: item.tenant_product_id,
    quantity_change: -item.quantity,  // Negative for outgoing
    movement_type_id: 'sales_order',
    order_id: orderId,
    order_line_item_id: item.id
  });
}
```

### Workflow 2: Dispatch Order (New Flow)

```typescript
// 1. Create dispatch route
const route = await db('dispatch_routes').insert({
  tenant_id: tenantId,
  planned_date: today,
  status: 'planning'
});

// 2. Add stops
const stop = await db('dispatch_route_stops').insert({
  dispatch_route_id: route.id,
  retailer_id: retailerId,
  order_ids: [orderId],
  sequence_no: 1
});

// 3. Mark as in transit
await db('dispatch_routes').update({ status: 'in_transit' });

// 4. On delivery, record POD items
for (const item of lineItems) {
  await db('dispatch_pod_items').insert({
    route_stop_id: stop.id,
    order_line_item_id: item.id,
    quantity_delivered: item.quantity,
    condition: 'acceptable'
  });
}

// 5. Record delivery in order history
await db('order_status_history').insert({
  order_id: orderId,
  previous_status: 'dispatched',
  new_status: 'delivered',
  trigger_reason: { reason: 'delivery_confirmed' }
});
```

---

## Performance Expectations

### Query Benchmarks

| Query | Table | Expected Time |
|-------|-------|----------------|
| Current stock | inventory_movements | 5–10ms |
| Historical stock | inventory_movements | 50–100ms |
| Order timeline | order_status_history | 2–5ms |
| Payment status | payment_transaction_log | 5–10ms |
| Dispatch info | dispatch_pod_items | 2–5ms |

*Baseline: Without excessive filtering; indexes in place*

### Recommendations

- Run `ANALYZE` after data migration for query planning
- Monitor index usage: `pg_stat_user_indexes`
- Consider partitioning after 500M+ rows (future)
- Archive old tables after 30 days if needed

---

## Troubleshooting

### Issue: "Stock doesn't match between old and new tables"

**Diagnosis**:
```sql
SELECT COUNT(DISTINCT tenant_product_id) as products_with_movements,
       SUM(quantity_change) as total_movements
FROM inventory_movements;

SELECT COUNT(DISTINCT tenant_product_id) as products_in_snapshots,
       SUM(stock_qty) as total_stock
FROM tenant_product_stock_snapshots;
```

**Root Causes**:
1. Data migration incomplete — check migration job logs
2. Race conditions during dual-write — likely old table reads stale
3. Schema mismatch — verify UUIDs match exactly

**Resolution**:
```sql
-- Run reconciliation query
SELECT tp.id, 
  (SELECT SUM(quantity_change) FROM inventory_movements 
   WHERE tenant_product_id = tp.id) as computed_stock,
  (SELECT MAX(stock_qty) FROM tenant_product_stock_snapshots
   WHERE tenant_product_id = tp.id) as max_snapshot
FROM tenant_products tp
WHERE computed_stock != max_snapshot;
```

### Issue: "Old tables still being written to after cutover"

**Diagnosis**:
```sql
SELECT schemaname, tablename, n_tup_upd, n_tup_del
FROM pg_stat_user_tables
WHERE tablename IN ('inventory_snapshots', 'order_payments')
ORDER BY n_tup_upd DESC;
```

**Resolution**: Feature flag didn't flip correctly
1. Check: `echo $USE_MOVEMENT_LEDGER`
2. If false/unset, restart app with flag enabled
3. Verify: Check logs after restart

### Issue: "Queries timing out after migration"

**Diagnosis**:
```sql
EXPLAIN ANALYZE SELECT SUM(quantity_change) 
FROM inventory_movements WHERE tenant_product_id = 'x';
-- Check if using idx_movements_product index
```

**Root Cause**: Missing index usage

**Resolution**:
```sql
-- Refresh statistics
ANALYZE inventory_movements;

-- Force index hint (if needed)
SELECT SUM(quantity_change)
FROM inventory_movements
  USE INDEX (idx_movements_product)
WHERE tenant_product_id = 'x';
```

---

## Rollback Quick Reference

| Scenario | Action | Time |
|----------|--------|------|
| Pre-data migration issues | Revert code, don't run migrations | 5 min |
| Post-data migration issues | Flip feature flag back | 5 min |
| Critical data corruption | Restore from backup | 30 min |

---

## Next Steps

1. ✅ **Review** `DATABASE_EVOLUTION.md` for complete strategy
2. ✅ **Review** `MIGRATION_REFACTORING_GUIDE.md` for execution plan
3. 📋 **Schedule** migration week with team
4. 📋 **Test** migrations in staging environment
5. 📋 **Create** runbooks for all stages
6. 📋 **Brief** ops & support teams
7. 🚀 **Execute** using stage-by-stage checklist

---

## References

- **Core Concepts**: See `DATABASE_EVOLUTION.md` § Design Philosophy
- **Execution Plan**: See `MIGRATION_REFACTORING_GUIDE.md` § Execution Checklist
- **Migration Code**: See `src/database/migrations/*.ts`
- **Test Queries**: See `DATABASE_EVOLUTION.md` § Appendix: Query Patterns

---

**Key Contacts:**
- **Database Architect**: [DevOps Team]
- **Development Lead**: [Backend Team Lead]
- **Operations**: [DevOps Manager]

---

**Document Version**: 1.0 | Last Updated: 2026-03-25

