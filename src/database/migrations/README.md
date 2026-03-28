# Database Migrations Directory

**Framework**: Knex.js  
**Database**: PostgreSQL 12+  
**Environment**: Development, Test, Production  

---

## Migration Files (Ordered Domain-Driven Sequence)

### Phase 1: Core Foundation
```
001_core_entities.ts
├── Depends on: (nothing — first migration)
├── Creates:
│   ├── tenants (uuid)
│   ├── users (uuid)
│   └── audit_logs (uuid, immutable)
├── Time: ~100ms
└── Status: ✅ Active
```

### Phase 2: Product Catalog
```
002_catalogue_structure.ts
├── Depends on: 001_core_entities
├── Creates:
│   ├── global_brands (uuid, immutable)
│   ├── global_products (uuid, immutable)
│   ├── tenant_products (uuid)
│   ├── tenant_product_schemes (uuid)
│   ├── tenant_product_stock_snapshots (uuid, immutable)
│   ├── tenant_product_import_jobs (uuid)
│   └── tenant_product_import_rows (uuid)
├── Time: ~150ms
└── Status: ✅ Active
```

### Phase 3: Order Lifecycle
```
003_order_lifecycle_core.ts
├── Depends on: 001_core_entities, 002_catalogue_structure
├── Creates:
│   ├── retailers (uuid)
│   ├── retailer_distributor_links (uuid)
│   ├── orders (uuid)
│   └── order_line_items (uuid)
├── Fixes: Foreign key type mismatches (int → uuid)
├── Time: ~200ms
└── Status: ✅ Active
```

### Phase 4: Inventory Movement Ledger ⭐ NEW
```
004_inventory_movement_ledger.ts
├── Depends on: 003_order_lifecycle_core
├── Creates:
│   ├── inventory_movement_types (uuid, reference data)
│   ├── inventory_adjustment_reasons (uuid, reference data)
│   └── inventory_movements (uuid, immutable, append-only)
├── Concept: Replaces snapshots with immutable ledger
├── Current stock = SUM(quantity_change) for product
├── Time: ~200ms
└── Status: ✅ Active (NEW)
```

### Phase 5: Payment Transactions
```
005_payment_transactions.ts
├── Depends on: 001_core_entities, 003_order_lifecycle_core
├── Creates:
│   ├── order_payments (uuid)
│   ├── payment_transaction_log (uuid, immutable)
│   └── payment_sync_config (uuid)
├── Purpose: Financial transaction tracking & reconciliation
├── Time: ~150ms
└── Status: ✅ Active
```

### Phase 6: Dispatch Support ⭐ NEW
```
006_dispatch_support.ts
├── Depends on: 001_core_entities, 003_order_lifecycle_core
├── Creates:
│   ├── dispatch_routes (uuid)
│   ├── dispatch_route_stops (uuid)
│   ├── dispatch_pod_items (uuid, immutable)
│   └── dispatch_performance_summary (uuid)
├── Purpose: Last-mile fulfillment tracking
├── Time: ~150ms
└── Status: ✅ Active (NEW)
```

### Phase 7: Event Sourcing Ledgers ⭐ NEW
```
007_event_sourcing_ledgers.ts
├── Depends on: All phases 1–6
├── Creates:
│   ├── order_status_history (uuid, immutable)
│   ├── order_line_event_history (uuid, immutable)
│   ├── inventory_movement_events (uuid, immutable)
│   ├── payment_transaction_events (uuid, immutable)
│   └── entity_event_timeline (uuid, helper view)
├── Purpose: Event sourcing & audit trail
├── Entries: Append-only (immutable)
├── Time: ~150ms
└── Status: ✅ Active (NEW)
```

---

## Migration Statistics

| Metric | Count |
|--------|-------|
| **Total migrations** | 7 |
| **Tables created** | 28+ |
| **Immutable tables** | 14 |
| **Reference tables** | 2 |
| **Total execution time** | ~1000ms |
| **Foreign keys** | 45+ |
| **Indexes** | 60+ |

---

## Migration Execution

### Running Migrations

```bash
# Run all pending migrations
npm run migrate:latest --env production

# Run specific number of migrations
npm run migrate:up --steps 3 --env production

# Rollback last N migrations
npm run migrate:rollback --steps 2 --env production

# Create new migration (use new naming: NNN_description.ts)
npm run migrate:make --name "008_module_name" --env production
# Creates: src/database/migrations/008_module_name.ts

# Check migration status
npm run migrate:status --env production
```

### Each Migration Has

```typescript
export async function up(knex: Knex): Promise<void> {
  // Create tables, indexes, constraints
}

export async function down(knex: Knex): Promise<void> {
  // Undo: drop tables (in reverse order)
}
```

---

## Key Design Patterns

### 1. Immutable Tables (Append-Only)

Used for audit compliance and event sourcing:
```sql
-- Write: INSERT (always create new, never UPDATE)
INSERT INTO audit_logs (...) VALUES (...);

-- Read: SELECT with time filter
SELECT * FROM audit_logs 
WHERE entity_id = 'x' AND created_at > '2026-03-01'
ORDER BY created_at DESC;
```

### 2. Reference Data Tables

Used for constants, enums, lookup values:
```sql
-- Created during migration
INSERT INTO inventory_movement_types (code, name, direction) VALUES
('purchase', 'Purchase/Inbound', 'in'),
('sales_order', 'Sales Order', 'out'),
('return', 'Customer Return', 'in'),
('adjustment', 'Manual Adjustment', NULL),
('damage', 'Damage/Obsolescence', 'out');

-- Used in foreign keys
FOREIGN KEY (movement_type_id) REFERENCES inventory_movement_types(id)
```

### 3. Time-Series Data

Tables that grow over time, benefit from partitioning:
```sql
-- Partition after 500M+ rows (future):
ALTER TABLE inventory_movements 
PARTITION BY RANGE (EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at));
```

### 4. Tenant Scoping

Every table tied to tenant for multi-tenancy:
```sql
-- Direct tenant reference
ALTER TABLE orders ADD CONSTRAINT fk_orders_tenant
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Queries always filter by tenant
SELECT * FROM orders WHERE tenant_id = $1;
```

---

## Naming Conventions

### File Naming

**Format**: `NNN_domain_description.ts`

```
✅ CORRECT:
  001_core_entities.ts
  002_catalogue_structure.ts
  003_order_lifecycle_core.ts

❌ INCORRECT:
  create_tables.ts                      (no sequence number)
  202603130001_initial.ts              (timestamp-based)
  db_setup_v1.ts                       (not domain-named)
```

### Table Naming

**Format**: `noun_plural_snake_case`

```sql
✅ CORRECT:
  CREATE TABLE order_payments (...)
  CREATE TABLE inventory_movements (...)
  CREATE TABLE dispatch_route_stops (...)

❌ INCORRECT:
  CREATE TABLE OrderPayment (...)      (camelCase)
  CREATE TABLE overpayment (...)       (singular)
  CREATE TABLE orders_payment (...)    (underscore in middle)
```

### Column Naming

**Format**: `snake_case` (no mixed case)

```sql
✅ CORRECT:
  order_id uuid
  created_at timestamp
  payment_method varchar

❌ INCORRECT:
  orderID uuid                         (mixed case)
  createdAt timestamp                  (mixed case)
  payment_meth varchar                 (abbreviated)
```

---

## Data Type Standards

| Type | Usage | Example |
|------|-------|---------|
| `uuid` | Primary/foreign keys | `table.uuid("id").primary()` |
| `timestamp with TZ` | All dates | `table.timestamp("created_at", { useTz: true })` |
| `uuid[]` | Arrays of IDs | `table.jsonb("order_ids").defaultTo("[]")` |
| `jsonb` | Flexible metadata | `table.jsonb("metadata")` |
| `decimal(12,2)` | Money | `table.decimal("amount", 12, 2)` |
| `text` | Long strings | `table.text("description")` |
| `boolean` | Flags | `table.boolean("is_active")` |
| `integer` | Counts | `table.integer("retry_count")` |

---

## Indexing Strategy

### High-Query Tables (Add Indexes)
```sql
-- Orders table (frequently filtered by status)
CREATE INDEX idx_orders_tenant_status 
ON orders(tenant_id, status) 
WHERE status != 'closed';

-- Inventory movements (frequently summed by product)
CREATE INDEX idx_movements_product 
ON inventory_movements(tenant_id, tenant_product_id);
```

### Write-Heavy Tables (Minimal Indexes)
```sql
-- Event tables (optimized for INSERT speed)
CREATE INDEX idx_event_payment 
ON payment_transaction_events(tenant_id, payment_id);
```

### Query Performance Check
```sql
-- See which indexes are unused
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(relid) DESC;
```

---

## Backward Compatibility Notes

## Old vs. New Migrations

| Aspect | Old | New | Notes |
|--------|-----|-----|-------|
| **File location** | `src/database/migrations/` | `src/database/migrations/` | Same |
| **Naming** | Mixed (001_, 202603*, 20260323_*) | Ordered (001_, 002_, ..., NNN_) | Use new for future |
| **Execution order** | Implicit (Knex sorts by name) | Explicit (NNN_ numbers) | Clear & maintainable |
| **Running together** | Not recommended | ✅ Supported | Old tables unchanged |
| **Data loss risk** | None | ✅ None | Old data preserved |
| **Rollback** | `npm run migrate:rollback` | ✅ Same command | Works for both |

### Old Migrations Still Work
```bash
# Old migrations (if still present) will run in order
001_create_inventory_tables.ts        # Runs first
202603130001_initial_foundation.ts    # Runs second (name starts with 2)
002_catalogue_structure.ts            # Runs third (name starts with 0)
# ^^ This is why new naming is better ^^
```

---

## Common Tasks

### Add New Table to Existing Migration
```typescript
// In 003_order_lifecycle_core.ts, add:
await knex.schema.createTable("customers", (table) => {
  table.uuid("id").primary();
  table.uuid("tenant_id").notNullable().references("id").inTable("tenants");
  // ... more columns
});
```

### Add Column to Existing Table
```bash
# Create new migration
npm run migrate:make --name "008_add_email_to_users"

# In new file:
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("users", (table) => {
    table.string("email", 255).notNullable().unique();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("email");
  });
}
```

### Create Index on Existing Table
```typescript
export async function up(knex: Knex): Promise<void> {
  await knex.schema.table("orders", (table) => {
    table.index(["tenant_id", "created_at"], "idx_orders_timeline");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table("orders", (table) => {
    table.dropIndex(["tenant_id", "created_at"], "idx_orders_timeline");
  });
}
```

---

## Documentation Reference

| Document | Purpose |
|----------|---------|
| This file | Migration sequence, troubleshooting, and operating notes |
| [README.md](../../../README.md) | Backend startup, environment setup, and deployment entry point |

---

## Troubleshooting

### Migration Stuck/Hanging
```bash
# Cancel long-running migration
# Press Ctrl+C to stop, then manually clean up:
psql supplysetu -c "SELECT pid, state, query FROM pg_stat_activity 
WHERE state = 'active' AND query LIKE '%CREATE%';"

# Kill if necessary
psql supplysetu -c "SELECT pg_terminate_backend(123456);"
```

### Foreign Key Constraint Violation
```bash
# Check which tables/rows violate constraint
psql supplysetu -c "
ALTER TABLE orders 
ADD CONSTRAINT fk_test 
FOREIGN KEY (retailer_id) REFERENCES retailers(id);
-- Will fail if orphaned rows exist

-- Find the orphans:
SELECT * FROM orders WHERE retailer_id NOT IN (SELECT id FROM retailers);

-- Fix: either delete or update the orphaned rows
```

### Difference Between Test/Staging/Prod Schemas
```bash
# Compare schemas
pg_dump --schema-only supplysetu-test | sort > test.sql
pg_dump --schema-only supplysetu-prod | sort > prod.sql
diff test.sql prod.sql

# If different, re-run migrations to sync
npm run migrate:latest --env staging
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-25 | Initial 7-migration domain-driven sequence |

---

## Support

- **Questions about migrations?** → Review the migration sequence and troubleshooting sections in this file
- **Need to execute?** → Follow the backend startup and environment guidance in [README.md](../../../README.md)
- **Issues?** → Check troubleshooting section above or contact database admin

