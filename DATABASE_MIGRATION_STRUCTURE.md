# Database Migration Structure & Schema Overview

## 1. Migration Configuration

### Knexfile Location
- **Development Config**: `./src/database/migrations`
- **Production Config**: `./dist/database/migrations` (compiled .js files)
- **Extension**: `.ts` files (TypeScript for development)

### Database Configuration Files
- **Primary Config**: [src/infrastructure/database/database.config.ts](src/infrastructure/database/database.config.ts)
- **CLI Config**: [knexfile.ts](knexfile.ts) (backward compatibility)

**Connection Strategy**:
- Development/Test: Direct connections (no pooling)
- Production: Connection pool (min: 2, max: 10)
- Database: PostgreSQL (pg)
- SSL: Configurable via `DB_SSL` environment variable

---

## 2. Migration Naming Convention & Execution Order

The project uses **mixed naming conventions**:
- Older migrations: Simple numeric prefix (`001_`)
- Newer migrations: ISO date prefix (`202603130001_`, `20260323_`)

### All Migrations in Execution Order

| Order | File Name | Type | Purpose |
|-------|-----------|------|---------|
| 1 | `001_create_inventory_tables.ts` | Foundation | Legacy inventory module (6 tables) |
| 2 | `202603130001_initial_foundation.ts` | Foundation | Core multi-tenant setup |
| 3 | `202603130002_order_workflow_foundation.ts` | Foundation | Basic orders table |
| 4 | `202603210001_product_catalogue_foundation.ts` | Foundation | Product catalog & schemas |
| 5 | `20260323_create_retailers_and_distributor_links.ts` | Enhancement | Retailers & order items |
| 6 | `20260323_enhance_orders_table.ts` | Alteration | Orders table enhancements |

**⚠️ NAMING INCONSISTENCY**: Consider standardizing to a single convention (e.g., `YYYYMMDDHHII_description_format`)

---

## 3. Current Database Schema

### Table Summary (18 Tables Total)

#### Core Multi-Tenant Foundation (Migration 202603130001)
**3 tables** - Tenant isolation & user management

| Table | Columns | Key Details |
|-------|---------|------------|
| `tenants` | id (UUID), code (unique), name, is_active, timestamps | Root tenant entity; CASCADE delete for users |
| `users` | id (UUID), tenant_id (FK), email, password_hash, role, is_active, timestamps | Unique constraint: (tenant_id, email); Indexed by role |
| `audit_logs` | id (UUID), tenant_id (FK), actor_user_id (FK), entity_type, entity_id, action, metadata (jsonb), created_at | Tracks all system actions per tenant |

---

#### Order Management (Migrations 202603130002, 20260323)
**5 tables** - Order processing & payments

| Table | Columns | Key Details |
|-------|---------|------------|
| `orders` | id (UUID), tenant_id (FK), retailer_id (FK→retailers), created_by_user_id (FK), status (default: pending_approval), invoice_confirmed_at, dispatched_at, delivered_at, closed_at, timestamps | Recent additions: retailer_id, idempotency_key, metadata (json); Indexed by (tenant_id, status) |
| `order_line_items` | id (int), order_id (FK), product_id (FK), quantity, unit_price, line_total, scheme_code, scheme_discount, timestamps | Junction table for order items; locked pricing at order time |
| `order_payments` | id (int), order_id (FK), payment_type (cash/advance/credit_tag), amount, payment_status (default: pending), transaction_id, metadata (json), timestamps | Tracks payment transactions per order |
| `retailers` | id (int), phone (unique), name, locality, city, state, owner_name, credit_line_status (default: none), timestamps | Global retailer identity registry |
| `retailer_distributor_links` | id (int), retailer_id (FK), tenant_id (FK), status (default: active), last_ordered_at, total_orders, total_order_value, referral_code, timestamps | Many-to-many: retailer-distributor relationships; Unique constraint: (retailer_id, tenant_id) |

---

#### Product Catalog (Migration 202603210001)
**6 tables** - Product management & schemes

| Table | Columns | Key Details |
|-------|---------|------------|
| `global_brands` | id (UUID), name (unique), source (default: supplysetu), is_active, timestamps | Global (non-tenant) brand registry; not deleted by cascade |
| `global_products` | id (UUID), brand_id (FK), standard_name, pack_size, uom, image_url, description, classification (jsonb), mrp, suggested_price_min, suggested_price_max, is_active, timestamps | Unique constraint: (brand_id, standard_name, pack_size) |
| `tenant_products` | id (UUID), tenant_id (FK), global_product_id (FK), brand_id (FK), product_name, pack_size, sku_code, base_price, advance_price, status (default: active), performance_band (default: inactive), opening_stock_snapshot, timestamps | Tenant-specific product instances; Unique: (tenant_id, sku_code) |
| `tenant_product_schemes` | id (UUID), tenant_id (FK), tenant_product_id (FK), scheme_text, start_date, end_date, is_active, timestamps | Promotional schemes per product/tenant; Indexed by (tenant_id, tenant_product_id, is_active) |
| `tenant_product_stock_snapshots` | id (UUID), tenant_id (FK), tenant_product_id (FK), stock_qty, source (default: accounting_sync), captured_at, created_at | Stock history; indexed by captured_at for time-series queries |
| `tenant_product_import_jobs` | id (UUID), tenant_id (FK), created_by_user_id (FK), source_type (default: csv), status (default: uploaded), total_rows, success_rows, failed_rows, summary (jsonb), timestamps | Batch import tracking |

---

#### Inventory System (Migration 001 - LEGACY)
**6 tables** - Stock sync & auditing

| Table | Columns | Key Details |
|-------|---------|------------|
| `inventory_snapshots` | id (int), tenant_id, product_id, available_quantity, reserved_quantity, committed_quantity, last_synced_at, sync_source_reference, sync_job_id, timestamps | Canonical stock availability; Unique: (tenant_id, product_id) |
| `inventory_sync_jobs` | id (string), tenant_id, sync_status (enum: pending/in_progress/success/partial/failed), sync_type (batch_import/webhook_delta/manual_reconciliation), source_file_path, records_processed, records_succeeded, records_failed, failure_reason (text), processing_log (text), started_at, completed_at, execution_time_ms, triggered_by, triggered_by_source (default: scheduled), created_at | Comprehensive sync job tracking |
| `inventory_audit_log` | id (int), tenant_id, product_id, sync_job_id, quantity_before, quantity_after, quantity_delta, change_reason (enum), source_invoice_id, source_order_id, recorded_at | Full change history per product |
| `inventory_sync_config` | id (int), tenant_id (unique), auto_sync_enabled, sync_frequency_cron, low_stock_threshold_percent (default: 20), strict_order_validation, import_format (csv/json/xml), accounting_system_type, webhook_url, webhook_secret, max_retry_attempts (default: 3), retry_backoff_ms (default: 5000), timestamps | Per-tenant sync preferences |
| `inventory_sync_queue` | id (int), tenant_id, sync_job_id, payload (json), retry_count, next_retry_at, last_error, status (enum: pending/processing/failed_permanently), timestamps | Retry queue for failed syncs |
| `inventory_low_stock_alerts` | id (int), tenant_id, product_id, current_available_qty, threshold_qty, alert_status (default: active), acknowledged_by_user_id, acknowledged_at, timestamps | Low stock notifications |

---

#### Additional Tables
**1 table** - Inventory sync logs (Migration 20260323)

| Table | Columns | Key Details |
|-------|---------|------------|
| `inventory_sync_logs` | id (int), tenant_id (FK), last_sync_at, total_stock_items, sync_status (default: success), error_details (json), timestamps | Last sync snapshot per tenant; complements inventory_sync_jobs |

---

## 4. Column Type Analysis

### UUID vs Integer Keys
- **UUID Keys**: tenants, users, audit_logs, orders, global_brands, global_products, tenant_products, tenant_product_schemes, tenant_product_stock_snapshots, tenant_product_import_jobs, tenant_product_import_rows
- **Integer Keys**: retailers, retailer_distributor_links, order_line_items, order_payments, inventory_* tables (mostly)
- **String Keys**: inventory_sync_jobs (id is string "UUID or snowflake ID")

**⚠️ INCONSISTENCY**: Mixed key types across domains

### Timestamps
- **Two patterns**:
  - `table.timestamp("field", { useTz: true })` - Modern (UTC-aware)
  - `table.datetime("field")` - Legacy (less recommended)
- **Defaults**: Most use `knex.fn.now()`

### Common Data Types
- **Pricing**: `decimal(12, 2)` or `decimal(10, 2)`
- **Stock Quantities**: `integer` or `decimal(14, 3)`
- **Flexible Storage**: `jsonb` for metadata, classification, error tracking
- **Enums**: PostgreSQL native enums for sync_status, payment_type, etc.

---

## 5. Foreign Key & Indexing Strategy

### Cascading Relationships
```
tenants
  ├─ users (CASCADE)
  ├─ audit_logs (CASCADE)
  ├─ orders (CASCADE)
  ├─ tenant_products (CASCADE)
  ├─ tenant_product_schemes (CASCADE)
  ├─ tenant_product_stock_snapshots (CASCADE)
  ├─ tenant_product_import_jobs (CASCADE)
  └─ retailer_distributor_links (CASCADE)

global_brands
  ├─ global_products (RESTRICT)
  └─ tenant_products (SET NULL)
```

### Key Constraints
- **Restrictive FKs**: 
  - global_brands → global_products (RESTRICT - prevents deleting brands with products)
  - tenant_products → order_line_items (RESTRICT)
- **Set Null FKs**: 
  - global_product_id in tenant_products (SET NULL if product deleted)
  - actor_user_id in audit_logs (SET NULL if user deleted)

### Indexing Patterns
**Multi-column indexes** for common queries:
- `(tenant_id, status)` - Common filtering
- `(tenant_id, product_id)` - Inventory lookups
- `(tenant_id, email)` - User uniqueness
- `(import_job_id, validation_status)` - Import job filtering

**Unique constraints**:
- `(tenant_id, email)` in users
- `(tenant_id, product_id)` in inventory_snapshots
- `(tenant_id, sku_code)` in tenant_products
- `(brand_id, standard_name, pack_size)` in global_products

---

## 6. Critical Schema Observations

### ✅ Strengths
1. **Multi-tenant isolation**: All tenant-scoped tables include `tenant_id` with CASCADE delete
2. **Audit trail**: Comprehensive audit_logs table with jsonb metadata
3. **Flexible schemas**: JSONB columns for evolving data (metadata, classification, error_details)
4. **Stock tracking**: Multi-level inventory system (snapshots, audit log, alerts)
5. **Enumerated types**: Use of PostgreSQL enums for state machines

### ⚠️ Concerns & Inconsistencies
1. **Mixed ID generation**: UUIDs vs integers vs strings across tables
2. **Dual inventory systems**: 
   - Old system: `inventory_snapshots`, `inventory_sync_jobs`, etc.
   - New system: `tenant_product_stock_snapshots`
   - Both exist simultaneously
3. **Foreign key type mismatches**:
   - `order_line_items.product_id` references `tenant_products.id` (UUID) but column is `integer`
   - `retailer_distributor_links.tenant_id` is `integer` but should reference `tenants.id` (UUID)
4. **Missing relationships**:
   - `orders.retailer_id` has no NOT NULL constraint yet multiple migrations reference it
   - Inconsistent tenant_id references (string vs integer across tables)
5. **Timestamp inconsistency**: Mix of `timestamp with useTz: true` and `datetime`

---

## 7. Migration Next Steps

### Recommended Actions
1. **Standardize naming convention**: All future migrations should use `YYYYMMDDHHII_description` format
2. **Fix foreign key types**: Audit all integer tenant_id references vs UUID in tenants table
3. **Consolidate inventory systems**: Decide which inventory model is canonical (old vs new)
4. **Add NOT NULL constraints**: Clarify required relationships (e.g., order.retailer_id)
5. **Review CASCADE vs RESTRICT**: Verify deletion policies align with business rules

### New migrations should ensure:
- Consistent ID generation (recommend: UUID for business entities, integer for audit/logs)
- Explicit NOT NULL and foreign key constraints
- Index coverage for JOIN operations
- Test both `up()` and `down()` rollback paths

---

## 8. Environment Configuration

Required environment variables:
```
DB_HOST       # Database hostname
DB_PORT       # Database port
DB_NAME       # Database name
DB_USER       # Database user
DB_PASSWORD   # Database password
DB_SSL        # Boolean: enable SSL (optional)
NODE_ENV      # development|test|production
```

Run migrations:
```bash
npm run migrate:make <name>      # Create new migration
npm run migrate:latest           # Apply all pending migrations
npm run migrate:rollback         # Rollback last migration
```
