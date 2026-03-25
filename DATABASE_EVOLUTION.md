# Database Evolution Strategy: Domain-Driven Lifecycle Model

**Last Updated**: March 25, 2026  
**Version**: 1.0  
**Status**: ✅ Active Implementation

---

## Executive Summary

Transforming the database schema from CRUD-based ecommerce to **lifecycle-driven supply transaction system**. Instead of direct state overwrites, the system now tracks every state change through immutable event/history tables, providing complete audit trails and enabling complex transaction flows.

**Fundamental Shift:**
- **Before**: Direct state updates (stock = 100 → stock = 95)
- **After**: Immutable ledgers (movement #1: -5 units for order #123 @ 2024-03-25 10:30)

---

## Migration Sequence: Ordered Domain Logic Flow

The migration sequence follows business domain progression, not data dependency order. Each phase assumes the prior phase exists.

### Phase 1: Core Foundation (001-002)

**001_core_entities**
- Establishes multi-tenant boundaries
- Creates audit logging infrastructure
- Domain: Authentication & Governance

Tables created:
- `tenants` — Organizational isolation boundary
- `users` — Authentication principals with roles
- `audit_logs` — Immutable activity record (foundation for event sourcing)

**Why first**: Everything is tenant-scoped. Users represent authenticated principals. Audit logs form the foundation for event sourcing later.

---

### Phase 2: Catalogue Foundation (002)

**002_catalogue_structure**
- Establishes product universe (global + tenant-specific)
- Pricing schemes and performance tracking
- Domain: Product Information Management

Tables created:
- `global_brands` — System-wide product brands
- `global_products` — Standard product definitions (immutable)
- `tenant_products` — Tenant-specific product customizations
- `tenant_product_schemes` — Pricing/offer schemes (time-boxed)
- `tenant_product_stock_snapshots` — Point-in-time stock records (immutable)
- `tenant_product_import_jobs` — Batch import tracking with granular row validation

**Key Design**: Global products are immutable reference data; tenant products are customizations per distributor.

**Why after core**: Requires `tenants` and `users` for scoping and audit trail creation.

---

### Phase 3: Order Lifecycle Core (003)

**003_order_lifecycle_core**
- Creates order transactional entity and related actors
- Establishes order state machine (pending_approval → confirmed → dispatched → delivered → closed)
- Domain: Order Management & Fulfillment

Tables created:
- `retailers` — Buyer entities (individual distributor outlets)
- `retailer_distributor_links` — Relationship between retailers and parent distributors (sales team allocation)
- `orders` — Main transactional record (immutable once created, status field for current state)
- `order_line_items` — Individual line items with product reference and quantities
- `order_payments` — Payment records per order (can have multiple for installments/refunds)

**State Machine**:
```
pending_approval
    ↓ [Invoice confirmed + all items in stock]
confirmed
    ↓ [Goods physically packed]
dispatched
    ↓ [Goods delivered]
delivered
    ↓ [Any pending items closed/cancelled]
closed
```

**Why after catalogue**: Orders reference products; requires tenant context from tenants table.

---

### Phase 4: Inventory Movement Ledger (004)

**004_inventory_movement_ledger**
- Transforms from "stock = X" to "tracked movements"
- Creates immutable movement journal
- Supports multi-source stock adjustments
- Domain: Inventory Transactions & Reconciliation

Tables created:
- `inventory_movements` — Immutable ledger entries (one per transaction)
- `inventory_movement_types` — Reference table: purchase, sales_order, return, adjustment, cycle_count
- `inventory_adjustment_reasons` — Reference table: stock_correction, damage, expiry, theft_loss, reconciliation_discrepancy

Key columns per movement:
- `tenant_product_id` — Product involved
- `movement_type_id` — What caused this movement (order, return, adjustment)
- `quantity_change` — Amount increased/decreased (can be negative)
- `reference_id` — Links to reason:
  - `order_id` — Sales order consuming stock
  - `return_id` — Return/rejection increasing stock
  - `adjustment_reason_id` — Manual adjustment (stock count)
- `source_document` — JSON with context (PO number, GRN date, etc.)
- `created_at` — Immutable timestamp
- `created_by_user_id` — Who recorded this

**Stock Calculation**:
```sql
-- Current stock = Sum of all movements for a product
SELECT tenant_product_id, SUM(quantity_change) as current_stock
FROM inventory_movements
WHERE tenant_id = $1
GROUP BY tenant_product_id
```

**Why after orders**: Order line items trigger inventory movements. Movement ledger needs order references.

---

### Phase 5: Payment Transactions (005)

**005_payment_transactions**
- Tracks every rupee flowing through the system
- Supports partial/installment payments
- Enables reconciliation with accounting
- Domain: Financial Transactions & Reporting

Tables created:
- `payment_transaction_log` — Immutable payment record
  - `order_id` — Order this payment is for
  - `amount` — Rupees paid
  - `payment_method` — cash|check|transfer|credit
  - `payment_mode_reason` — Why this mode (e.g., "due_date_breach_discount", "advance_payment_incentive")
  - `payment_reference` — External ID (cheque number, transfer receipt, etc.)
  - `reconciliation_status` — accounting_sync_pending|reconciled|dispute
  - `accounting_journal_reference` — Link to accounting system entry
  - `created_at` — When payment was recorded
  - `created_by_user_id` — Who recorded payment

**Why after orders**: Payments settle orders. Links payment to order_id.

---

### Phase 6: Dispatch Support Tables (006)

**006_dispatch_support**
- Supports route optimization, vehicle tracking, proof-of-delivery
- Domain: Logistics & Last-Mile Fulfillment

Tables created:
- `dispatch_routes` — Daily delivery routes
  - `tenant_id`
  - `planned_date`
  - `vehicle_id` (nullable, assigned later)
  - `assigned_to_user_id` — Sales rep/route owner
  - `status` — planning|assigned|in_transit|completed
  - `optimized_geometry` — JSON with route coordinates for mapping
  - `created_at`

- `dispatch_route_stops` — Individual stops on a route
  - `dispatch_route_id`
  - `sequence_no` — Order in route
  - `retailer_id` — Destination
  - `order_ids` — JSON array of orders to deliver here
  - `actual_arrival_time` — When driver actually arrived
  - `pod_signature_url` — Proof of delivery

- `dispatch_pod_items` — Proof of delivery item level
  - `route_stop_id`
  - `order_line_item_id` — Which line item delivered
  - `quantity_delivered` — What actually delivered (may differ if short delivery)
  - `condition` — acceptable|damaged|rejected
  - `notes` — Why rejected/damaged

**Why after orders & movements**: Routes contain orders; POD tracks deliveries against inventory movements.

---

### Phase 7: Event Sourcing Layer (007)

**007_event_sourcing_ledgers**
- Creates immutable history of every state change
- Enables temporal queries ("What happened to order #123 on March 25?")
- Supports event-driven notifications
- Domain: Event Sourcing & Audit Trail

Tables created:

**order_status_history**
```
id (uuid)
tenant_id (uuid)
order_id (uuid) [FK: orders.id]
previous_status (varchar)
new_status (varchar)
triggered_by_user_id (uuid) [FK: users.id]
trigger_reason (jsonb) — payment_confirmed, stock_available, dispatch_initiated, etc.
created_at (timestamp)

Index: (tenant_id, order_id, created_at DESC)
Usage: "Show all status changes for order #123"
```

**order_line_event_history**
```
id (uuid)
tenant_id (uuid)
order_id (uuid) [FK: orders.id]
order_line_item_id (uuid) [FK: order_line_items.id]
event_type (varchar) — created|quantity_adjusted|item_cancelled|delivery_partial|delivery_complete
old_quantity (decimal)
new_quantity (decimal)
event_reason (jsonb) — stock_shortage, customer_request, damaged_in_transit, etc.
triggered_by_user_id (uuid)
created_at (timestamp)

Index: (tenant_id, order_line_item_id, created_at DESC)
Usage: "Show all changes to line item #456"
```

**inventory_movement_events**
```
id (uuid)
tenant_id (uuid)
movement_id (uuid) [FK: inventory_movements.id]
event_type (varchar) — movement_recorded|movement_audited|movement_reconciled
event_reason (jsonb) — audit_correction, system_sync, manual_correction, etc.
auditor_user_id (uuid) [FK: users.id]
created_at (timestamp)

Index: (tenant_id, movement_id, created_at DESC)
Usage: "Was this movement audited? When and by whom?"
```

**payment_transaction_events**
```
id (uuid)
tenant_id (uuid)
payment_id (uuid) [FK: payment_transaction_log.id]
event_type (varchar) — recorded|reconciled|disputed|reversal_initiated|reversal_completed
old_reconciliation_status (varchar)
new_reconciliation_status (varchar)
reason (jsonb) — accounting_mismatch, cheque_bounce, etc.
processed_by_user_id (uuid) [FK: users.id]
created_at (timestamp)

Index: (tenant_id, payment_id, created_at DESC)
Usage: "Payment reconciliation history for dispute resolution"
```

**Why last**: Event tables are derivative. They capture transitions from all prior tables. Should be populated via triggers or application logic after core flows exist.

---

## Migration Execution Strategy

### Backward Compatibility

**Existing data preservation:**
1. Old `inventory_snapshots` table:
   - Will be kept but deprecated
   - New code ignores it; writes to `inventory_movements` instead
   - Future: Archive after parallel run period (30 days)

2. Legacy timestamp fields:
   - Keep existing `invoice_confirmed_at`, `dispatched_at`, `delivered_at` columns in orders
   - These are now **derived** from `order_status_history`
   - Application maintains both for API backward compatibility

3. Foreign key type consolidation:
   - **Phase 3**: Fix data integrity by ensuring all product IDs are UUIDs
   - Add `_migrated` column to orders for Phase 3 transition tracking

### Running the Migrations

```bash
# Prerequisites: PostgreSQL 12+, Knex installed
npm run migrate:latest

# Execution order (automatic via Knex):
# 1. 001_core_entities
# 2. 002_catalogue_structure
# 3. 003_order_lifecycle_core
# 4. 004_inventory_movement_ledger
# 5. 005_payment_transactions
# 6. 006_dispatch_support
# 7. 007_event_sourcing_ledgers

# Rollback (if needed):
npm run migrate:rollback --steps 1  # Rolls back 007
```

### Data Migration Path (Zero-Downtime)

**Step 1**: Run forward migrations (creates new tables, no data touched)
- Old tables: `inventory_snapshots`, `orders`, `order_payments` remain untouched
- New tables: Empty, waiting for data

**Step 2**: Populate derived tables from existing data (background job)
```typescript
// Pseudo-code for migration job
async function migrateInventorySnapshots() {
  const snapshots = await db('inventory_snapshots').select('*');
  
  for (const snapshot of snapshots) {
    // Create movements equivalent
    await db('inventory_movements').insert({
      tenant_product_id: snapshot.tenant_product_id,
      quantity_change: snapshot.stock_qty,
      movement_type_id: 'initial_snapshot',
      reference_id: snapshot.id,
      created_at: snapshot.captured_at,
      source_document: JSON.stringify(snapshot)
    });
  }
}
```

**Step 3**: Dual-write mode (write to both old + new)
- Application code writes to both tables (reads from new only)
- Ensures no data loss if rollback needed

**Step 4**: Cutover (switch to new tables completely)
- Set feature flag: `USE_MOVEMENT_LEDGER = true`
- Monitor for 48 hours
- Keep old tables for comparison (no longer written to)

---

## Domain Entity Relationships

```
TENANTS
├─ USERS (per-tenant authentication)
├─ AUDIT_LOGS (immutable activity)
├─ RETAILERS (buyer entities)
│  └─ RETAILER_DISTRIBUTOR_LINKS (parent relationships)
├─ ORDERS (main transaction)
│  ├─ ORDER_LINE_ITEMS (product instances)
│  ├─ ORDER_STATUS_HISTORY (state changes)
│  ├─ ORDER_LINE_EVENT_HISTORY (item-level changes)
│  ├─ ORDER_PAYMENTS (rupee tracking)
│  │  └─ PAYMENT_TRANSACTION_EVENTS (reconciliation history)
│  └─ DISPATCH_ROUTES (delivery grouping)
│     └─ DISPATCH_ROUTE_STOPS (individual drops)
│        └─ DISPATCH_POD_ITEMS (proof of delivery)
├─ PRODUCTS (product universe)
│  ├─ GLOBAL_BRANDS
│  ├─ GLOBAL_PRODUCTS
│  ├─ TENANT_PRODUCTS (customizations)
│  ├─ TENANT_PRODUCT_SCHEMES (time-boxed offers)
│  ├─ TENANT_PRODUCT_STOCK_SNAPSHOTS (history)
│  └─ TENANT_PRODUCT_IMPORT_JOBS (batch processing)
└─ INVENTORY (stock tracking)
   ├─ INVENTORY_MOVEMENTS (immutable ledger)
   └─ INVENTORY_MOVEMENT_EVENTS (audit trail)
```

---

## Key Design Decisions

### 1. Immutable Core Tables

| Table | Why Immutable | Append Only |
|-------|--------------|------------|
| `audit_logs` | Compliance, forensics | ✅ Yes |
| `inventory_movements` | Supply truth, reconciliation | ✅ Yes |
| `order_status_history` | Audit trail requirement | ✅ Yes |
| `order_line_event_history` | Dispute resolution | ✅ Yes |
| `payment_transaction_log` | Financial audit | ✅ Yes |
| `dispatch_pod_items` | Proof of delivery | ✅ Yes |

### 2. Mutable Convenience Tables

| Table | Why Mutable | Update Use Case |
|-------|-----------|-----------------|
| `orders` | Current status caching | Status transitions (derive from history) |
| `order_line_items` | Quantity tracking | Partial deliveries |
| `retailers` | Profile management | Updating contact info |
| `users` | Profile/permission changes | New role assignment |

### 3. Reference Data (Rarely Changed)

| Table | Immutability | Reason |
|-------|------------|--------|
| `tenants` | Nearly immutable | Once created, rarely deleted |
| `global_brands` | Immutable | Product master data |
| `global_products` | Immutable | Product definitions frozen at creation |
| `inventory_movement_types` | Static reference | Business logic constants |

---

## Temporal Query Patterns

### Pattern 1: "What was the stock on March 20?"

```sql
SELECT tenant_product_id, SUM(quantity_change) as stock_as_of_20th
FROM inventory_movements
WHERE tenant_id = $1
  AND created_at <= '2026-03-20'::timestamp
GROUP BY tenant_product_id
```

### Pattern 2: "Show order status timeline"

```sql
SELECT 
  created_at,
  previous_status,
  new_status,
  triggered_by_user_id,
  trigger_reason
FROM order_status_history
WHERE order_id = $1
ORDER BY created_at ASC
```

### Pattern 3: "Which products have movement discrepancies?"

```sql
-- Compare computed stock vs. last snapshot
WITH computed AS (
  SELECT tenant_product_id, SUM(quantity_change) as computed_stock
  FROM inventory_movements
  WHERE tenant_id = $1
  GROUP BY tenant_product_id
),
latest_snapshot AS (
  SELECT DISTINCT ON (tenant_product_id) 
    tenant_product_id, stock_qty
  FROM tenant_product_stock_snapshots
  WHERE tenant_id = $1
  ORDER BY tenant_product_id, captured_at DESC
)
SELECT c.tenant_product_id, c.computed_stock, s.stock_qty, 
       (c.computed_stock - s.stock_qty) as discrepancy
FROM computed c
LEFT JOIN latest_snapshot s USING (tenant_product_id)
WHERE c.computed_stock != s.stock_qty
```

---

## Performance Considerations

### Indexing Strategy

**High-query tables** (Order lookup, Stock calculation):
```sql
CREATE INDEX idx_inventory_movements_tenant_product 
ON inventory_movements(tenant_id, tenant_product_id);

CREATE INDEX idx_order_status_history_order 
ON order_status_history(tenant_id, order_id, created_at DESC);

CREATE INDEX idx_orders_tenant_status 
ON orders(tenant_id, status) 
WHERE status != 'closed';
```

**Write-heavy tables** (Event logs):
```sql
-- Minimal indexes, optimized for INSERT throughput
CREATE INDEX idx_payment_events_tenant_payment 
ON payment_transaction_events(tenant_id, payment_id);
```

### Partitioning Plan (Phase 2)

For tables exceeding 100M rows, consider range partitioning by `created_at`:
```sql
-- After 6 months of production data
ALTER TABLE inventory_movements 
PARTITION BY RANGE (EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at));
```

---

## Application Integration Points

### 1. Order Status Updates (Middleware)

**Old Flow**:
```typescript
Order {
  status: "dispatched"
}
```

**New Flow**:
```typescript
// Application code (automatic via triggers or explicit in service)
await db('orders').update({ status: "dispatched" });
await db('order_status_history').insert({
  order_id: order.id,
  previous_status: "confirmed",
  new_status: "dispatched",
  triggered_by_user_id: req.user.id,
  trigger_reason: JSON.stringify({ reason: "all_items_packed" })
});
```

### 2. Inventory Transactions (Service Layer)

**Old Flow** (UNSAFE):
```typescript
// Direct update — prone to race conditions
await db('tenant_product_stock_snapshots').update({
  stock_qty: stock_qty - 5
});
```

**New Flow** (SAFE):
```typescript
// Immutable append — no race conditions
await db('inventory_movements').insert({
  tenant_product_id: product.id,
  movement_type_id: 'order_fulfillment',
  quantity_change: -5,
  reference_id: order_id,
  source_document: JSON.stringify({ 
    order_line_item_id: lineItem.id,
    reason: "order_packaging"
  }),
  created_by_user_id: req.user.id
});
```

### 3. Payment Reconciliation (Reporting Layer)

```typescript
// Query: "Payments reconciled this month"
const reconciled = await db('payment_transaction_events')
  .where({
    event_type: 'reconciled',
    tenant_id: req.tenant.id
  })
  .whereBetween('created_at', [startOfMonth, endOfMonth]);
```

---

## Troubleshooting & Common Issues

### Issue 1: "Stock doesn't match the old snapshots"

**Cause**: Race conditions during movement insertion

**Resolution**:
```sql
-- Audit movement consistency
SELECT tenant_product_id, COUNT(*) as movement_count, 
       SUM(quantity_change) as net_change
FROM inventory_movements
WHERE tenant_id = $1
GROUP BY tenant_product_id
ORDER BY movement_count DESC;

-- Compare to last snapshot
SELECT tp.id, tp.product_name,
  COALESCE((SELECT SUM(quantity_change) FROM inventory_movements im 
    WHERE im.tenant_product_id = tp.id), 0) as computed_stock,
  (SELECT stock_qty FROM tenant_product_stock_snapshots tps 
    WHERE tps.tenant_product_id = tp.id 
    ORDER BY captured_at DESC LIMIT 1) as last_snapshot
FROM tenant_products tp
WHERE tp.tenant_id = $1
  AND computed_stock != last_snapshot;
```

### Issue 2: "Dispatch pod shows partial delivery but order says complete"

**Cause**: Race condition between POD recording and order status update

**Resolution**: Read from `dispatch_pod_items` for truth; derive order status from LINE-level events.

### Issue 3: "Payment reconciliation shows duplicate entries"

**Cause**: Application wrote to both old `order_payments` and new `payment_transaction_log`

**Resolution**: During dual-write phase, ensure idempotency keys prevent duplicates.

---

## Rollback Procedures

### Rollback After Phase 5 (Before Event Sourcing)

```bash
# Stop application
pm2 stop supplysetu-app

# Rollback last 5 migrations
npm run migrate:rollback --steps 5

# Re-deploy old code
git checkout main && npm install && npm run build

# Start application
pm2 start supplysetu-app
```

**Expected downtime**: 15–30 minutes (depending on data volume)

### Rollback After Phase 7 (Full Event Sourcing)

**Not recommended** — Use recovery procedures instead:

1. **Pause event ingestion** (feature flag: `STOP_EVENT_RECORDING = true`)
2. **Fix data directly** in tables using stored procedures
3. **Resume after 1 hour** (system checks consistency)

---

## Future Enhancements

### 1. Time-Series Partitioning
Once production data exceeds 500M rows, partition by month:
```sql
ALTER TABLE inventory_movements PARTITION BY RANGE (created_at);
```

### 2. Event Store (CQRS Pattern)
Introduce dedicated `event_store` table for CQRS read models:
```
event_store: immutable append-only log
  ├─ aggregate_id (order_id, tenant_id combo)
  ├─ event_type
  ├─ event_data (JSON)
  ├─ version
  ├─ created_at
```

### 3. Temporal Versioning (Point-in-Time Query)
Implement "as of" queries using PostgreSQL's GENERATED columns.

### 4. Soft Deletes with Event Recording
Instead of `DELETE order_line_items`, emit `item_cancelled` event.

---

## Document Changes Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-25 | Initial domain-driven migration strategy document |

---

## Appendix: Migration File Naming Convention

**Format**: `NNN_domain_description.ts`

- `NNN` = Sequential number (001, 002, 003, ..., 999)
- `domain` = Single domain word (core, catalogue, order, inventory, payment, dispatch, event)
- `description` = Descriptive title in snake_case

**Examples**:
- ✅ `001_core_entities.ts`
- ✅ `002_catalogue_structure.ts`
- ❌ `202603130001_initial.ts` (timestamp-based, hard to order)
- ❌ `01_db_setup.ts` (ambiguous numbering)

---

## References

- **Database Design**: PostgreSQL 12+ documentation
- **Event Sourcing**: Event Sourcing Pattern, Martin Fowler
- **CQRS**: Command Query Responsibility Segregation
- **Temporal Databases**: PostgreSQL Temporal Data Support
- **Knex Documentation**: https://knexjs.org/guide/migrations.html

