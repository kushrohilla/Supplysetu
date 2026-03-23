# Distributor Platform Data Model

## Overview

This document outlines a comprehensive relational and transactional data model for a distributor management SaaS platform. The model supports multi-tenant architecture with isolated distributor workspaces, complex product hierarchies, and robust inventory tracking.

## 1. Brand Entity Structure

### Core Fields

```sql
CREATE TABLE tenant_brands (
    tenant_id UUID NOT NULL,
    brand_id UUID NOT NULL,
    brand_name VARCHAR(255) NOT NULL,
    company_type VARCHAR(32) NOT NULL CHECK (company_type IN ('MNC', 'local', 'startup', 'cooperative')),
    catalog_source_type VARCHAR(32) NOT NULL DEFAULT 'manual' CHECK (catalog_source_type IN ('manual', 'imported', 'api', 'partner')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    PRIMARY KEY (tenant_id, brand_id)
);
```

### Indexing & Uniqueness Rules

**Primary Key**: Composite `(tenant_id, brand_id)` ensures brand uniqueness within tenant scope.

**Unique Constraints**:
```sql
-- Brand name unique per tenant
ALTER TABLE tenant_brands ADD CONSTRAINT uk_tenant_brand_name
    UNIQUE (tenant_id, brand_name);

-- Prevent duplicate active brands
CREATE UNIQUE INDEX idx_tenant_brands_active_name
    ON tenant_brands (tenant_id, brand_name)
    WHERE is_active = true;
```

**Performance Indexes**:
```sql
-- Query brands by tenant and status
CREATE INDEX idx_tenant_brands_tenant_active
    ON tenant_brands (tenant_id, is_active);

-- Filter by company type for analytics
CREATE INDEX idx_tenant_brands_company_type
    ON tenant_brands (tenant_id, company_type);
```

## 2. Product Master Structure

### Core Fields

```sql
CREATE TABLE tenant_products (
    tenant_id UUID NOT NULL,
    product_id UUID NOT NULL,
    brand_id UUID NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    tax_classification VARCHAR(32) NOT NULL DEFAULT 'GST_18',
    default_unit VARCHAR(32) NOT NULL DEFAULT 'pieces',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    PRIMARY KEY (tenant_id, product_id),
    FOREIGN KEY (tenant_id, brand_id) REFERENCES tenant_brands (tenant_id, brand_id)
);
```

### Normalization vs Denormalization Tradeoff

**Normalized Approach (Recommended)**:
- Separate `tenant_product_categories` table for category hierarchy
- Separate `tenant_tax_rates` table for tax classifications
- Benefits: Data consistency, flexible tax rules, hierarchical categories
- Cost: Additional JOINs for common queries

**Denormalized Approach**:
- Store category and tax data directly in products table
- Benefits: Faster reads, simpler queries
- Cost: Data duplication, harder to maintain tax rule changes

**Hybrid Recommendation**:
- Normalize tax rates (frequently changing)
- Denormalize categories (relatively stable)
- Use JSONB for flexible product attributes

```sql
-- Normalized tax rates
CREATE TABLE tenant_tax_rates (
    tenant_id UUID NOT NULL,
    tax_code VARCHAR(32) NOT NULL,
    tax_rate DECIMAL(5,2) NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (tenant_id, tax_code)
);

-- Denormalized categories in products table
ALTER TABLE tenant_products ADD COLUMN category_hierarchy JSONB;
```

## 3. SKU Variant Model

### Variant Depth Structure

```sql
CREATE TABLE tenant_sku_variants (
    tenant_id UUID NOT NULL,
    sku_id UUID NOT NULL,
    product_id UUID NOT NULL,
    variant_attributes JSONB NOT NULL DEFAULT '{}', -- {size: "500ml", pack_type: "bottle"}
    barcode VARCHAR(100) UNIQUE,
    internal_sku_code VARCHAR(100) NOT NULL,
    unit_conversion_factor DECIMAL(10,3) NOT NULL DEFAULT 1.0, -- How many base units in this variant
    base_unit VARCHAR(32) NOT NULL, -- ml, kg, pieces, etc.
    mrp DECIMAL(12,2) NOT NULL,
    distributor_cost DECIMAL(12,2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    PRIMARY KEY (tenant_id, sku_id),
    FOREIGN KEY (tenant_id, product_id) REFERENCES tenant_products (tenant_id, product_id),
    UNIQUE (tenant_id, internal_sku_code)
);
```

### Variant Attributes Structure

**Flexible JSONB Schema**:
```json
{
  "size": "500ml",
  "pack_type": "bottle",
  "flavor": "cola",
  "packaging": "glass",
  "weight": "0.6kg"
}
```

**Indexing for Variant Queries**:
```sql
-- GIN index for JSONB attributes
CREATE INDEX idx_sku_variants_attributes
    ON tenant_sku_variants USING GIN (variant_attributes);

-- Functional index for common attributes
CREATE INDEX idx_sku_variants_size
    ON tenant_sku_variants ((variant_attributes->>'size'));

-- Composite index for product variants
CREATE INDEX idx_sku_variants_product_attributes
    ON tenant_sku_variants (tenant_id, product_id, (variant_attributes->>'size'));
```

### Pricing Slab Modelling Options

**Option 1: Separate Pricing Table (Recommended)**

```sql
CREATE TABLE tenant_sku_pricing_slabs (
    tenant_id UUID NOT NULL,
    sku_id UUID NOT NULL,
    min_quantity INTEGER NOT NULL,
    max_quantity INTEGER,
    retailer_price DECIMAL(12,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    valid_from DATE NOT NULL,
    valid_to DATE,

    PRIMARY KEY (tenant_id, sku_id, min_quantity),
    FOREIGN KEY (tenant_id, sku_id) REFERENCES tenant_sku_variants (tenant_id, sku_id)
);

-- Example pricing slabs for a SKU
-- Qty 1-10: ₹100 each
-- Qty 11-50: ₹95 each
-- Qty 51+: ₹90 each
```

**Option 2: JSONB Pricing in SKU Table**

```sql
ALTER TABLE tenant_sku_variants ADD COLUMN pricing_slabs JSONB;

-- Example structure
{
  "slabs": [
    {"min_qty": 1, "max_qty": 10, "price": 100.00},
    {"min_qty": 11, "max_qty": 50, "price": 95.00},
    {"min_qty": 51, "price": 90.00}
  ],
  "bulk_discount": {"min_qty": 100, "discount_pct": 5.0}
}
```

**Recommendation**: Separate table for complex pricing rules, JSONB for simple cases.

## 4. Inventory Ledger Engine

### Transactional Inventory Model

**Core Tables**:

```sql
-- Current balance snapshot (materialized)
CREATE TABLE tenant_inventory_balance (
    tenant_id UUID NOT NULL,
    sku_id UUID NOT NULL,
    warehouse_id UUID NOT NULL,
    batch_id UUID,
    current_quantity DECIMAL(14,3) NOT NULL DEFAULT 0,
    reserved_quantity DECIMAL(14,3) NOT NULL DEFAULT 0,
    available_quantity DECIMAL(14,3) GENERATED ALWAYS AS (current_quantity - reserved_quantity) STORED,
    last_movement_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    PRIMARY KEY (tenant_id, sku_id, warehouse_id, COALESCE(batch_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

-- Transaction ledger (immutable)
CREATE TABLE tenant_inventory_transactions (
    tenant_id UUID NOT NULL,
    transaction_id UUID NOT NULL,
    sku_id UUID NOT NULL,
    warehouse_id UUID NOT NULL,
    batch_id UUID,
    transaction_type VARCHAR(32) NOT NULL, -- purchase, sale, return, damage, adjustment
    reference_type VARCHAR(32) NOT NULL, -- order, invoice, manual
    reference_id UUID NOT NULL,
    quantity_change DECIMAL(14,3) NOT NULL, -- positive for inward, negative for outward
    unit_cost DECIMAL(12,2),
    total_value DECIMAL(14,2) GENERATED ALWAYS AS (quantity_change * unit_cost) STORED,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_by UUID REFERENCES tenant_users(id),

    PRIMARY KEY (tenant_id, transaction_id)
);

-- Batch tracking (optional advanced)
CREATE TABLE tenant_stock_batches (
    tenant_id UUID NOT NULL,
    batch_id UUID NOT NULL,
    sku_id UUID NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE,
    supplier_id UUID,
    purchase_price DECIMAL(12,2),
    mrp DECIMAL(12,2),
    initial_quantity DECIMAL(14,3) NOT NULL,
    current_quantity DECIMAL(14,3) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (tenant_id, batch_id),
    UNIQUE (tenant_id, sku_id, batch_number)
);
```

### Supported Inventory Flows

**Purchase Inward**:
```sql
-- 1. Create transaction record
INSERT INTO tenant_inventory_transactions (
    tenant_id, transaction_id, sku_id, warehouse_id, batch_id,
    transaction_type, reference_type, reference_id, quantity_change, unit_cost
) VALUES (?, ?, ?, ?, ?, 'purchase', 'purchase_order', ?, 100, 50.00);

-- 2. Update balance (via trigger or application logic)
UPDATE tenant_inventory_balance
SET current_quantity = current_quantity + 100,
    last_movement_at = NOW(),
    updated_at = NOW()
WHERE tenant_id = ? AND sku_id = ? AND warehouse_id = ? AND batch_id IS NOT DISTINCT FROM ?;
```

**Sales Deduction**:
```sql
-- 1. Reserve stock
UPDATE tenant_inventory_balance
SET reserved_quantity = reserved_quantity + 10
WHERE tenant_id = ? AND sku_id = ? AND warehouse_id = ? AND available_quantity >= 10;

-- 2. Create transaction on order fulfillment
INSERT INTO tenant_inventory_transactions (
    tenant_id, transaction_id, sku_id, warehouse_id,
    transaction_type, reference_type, reference_id, quantity_change
) VALUES (?, ?, ?, ?, 'sale', 'order', ?, -10);

-- 3. Deduct from balance
UPDATE tenant_inventory_balance
SET current_quantity = current_quantity - 10,
    reserved_quantity = reserved_quantity - 10,
    last_movement_at = NOW()
WHERE tenant_id = ? AND sku_id = ? AND warehouse_id = ?;
```

**Returns & Adjustments**: Similar pattern with appropriate transaction types.

### Why Ledger Model Better Than Direct Quantity Update

**Advantages**:

1. **Audit Trail**: Complete history of all inventory movements
2. **Reconciliation**: Can recalculate balances from transaction history
3. **Analytics**: Rich reporting on inventory turnover, trends
4. **Debugging**: Easy to trace why balances are incorrect
5. **Compliance**: Required for financial and regulatory reporting

**Concurrency Safety**:

```sql
-- Optimistic locking with version
UPDATE tenant_inventory_balance
SET current_quantity = current_quantity + ?,
    version = version + 1
WHERE tenant_id = ? AND sku_id = ? AND warehouse_id = ?
  AND version = ?; -- Current version check
```

**Balance Recalculation** (if needed):
```sql
-- Recalculate balance from ledger
UPDATE tenant_inventory_balance b
SET current_quantity = COALESCE((
    SELECT SUM(quantity_change)
    FROM tenant_inventory_transactions t
    WHERE t.tenant_id = b.tenant_id
      AND t.sku_id = b.sku_id
      AND t.warehouse_id = b.warehouse_id
      AND t.batch_id IS NOT DISTINCT FROM b.batch_id
), 0);
```

## 5. Order Impact Flow

### Step Sequence

**Order Placed → Stock Reserved → Invoice Generated → Stock Deducted**

1. **Order Creation**:
   - Validate available stock
   - Reserve quantities in `inventory_balance.reserved_quantity`
   - Create order record with status 'confirmed'

2. **Stock Reservation**:
   ```sql
   -- Reserve stock atomically
   UPDATE tenant_inventory_balance
   SET reserved_quantity = reserved_quantity + order_quantity
   WHERE tenant_id = ? AND sku_id = ? AND warehouse_id = ?
     AND available_quantity >= order_quantity;
   ```

3. **Invoice Generation**:
   - Calculate final pricing with slabs
   - Generate invoice document
   - Update order status to 'invoiced'

4. **Stock Deduction** (on delivery/fulfillment):
   ```sql
   -- Deduct reserved stock
   UPDATE tenant_inventory_balance
   SET current_quantity = current_quantity - order_quantity,
       reserved_quantity = reserved_quantity - order_quantity
   WHERE tenant_id = ? AND sku_id = ? AND warehouse_id = ?;

   -- Record transaction
   INSERT INTO tenant_inventory_transactions (
       tenant_id, sku_id, warehouse_id, transaction_type,
       reference_type, reference_id, quantity_change
   ) VALUES (?, ?, ?, 'sale', 'order', ?, -order_quantity);
   ```

**Error Handling**:
- If invoice fails: Release reservation
- If delivery fails: Move back to available stock
- Deadlock prevention: Order by SKU ID in updates

## 6. Reporting Read Model

### Materialized Views

**Daily Stock Summary**:
```sql
CREATE MATERIALIZED VIEW tenant_daily_stock_summary AS
SELECT
    ib.tenant_id,
    ib.sku_id,
    ib.warehouse_id,
    DATE(ib.last_movement_at) as report_date,
    ib.current_quantity,
    ib.reserved_quantity,
    ib.available_quantity,
    p.product_name,
    b.brand_name,
    SUM(CASE WHEN it.transaction_type = 'sale' THEN -it.quantity_change ELSE 0 END) as sales_today,
    SUM(CASE WHEN it.transaction_type = 'purchase' THEN it.quantity_change ELSE 0 END) as purchases_today
FROM tenant_inventory_balance ib
JOIN tenant_sku_variants sv ON ib.tenant_id = sv.tenant_id AND ib.sku_id = sv.sku_id
JOIN tenant_products p ON sv.tenant_id = p.tenant_id AND sv.product_id = p.product_id
JOIN tenant_brands b ON p.tenant_id = b.tenant_id AND p.brand_id = b.brand_id
LEFT JOIN tenant_inventory_transactions it ON ib.tenant_id = it.tenant_id
    AND ib.sku_id = it.sku_id AND ib.warehouse_id = it.warehouse_id
    AND DATE(it.transaction_date) = DATE(ib.last_movement_at)
GROUP BY ib.tenant_id, ib.sku_id, ib.warehouse_id, DATE(ib.last_movement_at),
         ib.current_quantity, ib.reserved_quantity, ib.available_quantity,
         p.product_name, b.brand_name;

-- Refresh daily
REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_daily_stock_summary;
```

**Product Performance**:
```sql
CREATE MATERIALIZED VIEW tenant_product_performance AS
SELECT
    p.tenant_id,
    p.product_id,
    p.product_name,
    b.brand_name,
    SUM(CASE WHEN it.transaction_type = 'sale' THEN -it.quantity_change ELSE 0 END) as total_sold,
    SUM(CASE WHEN it.transaction_type = 'sale' THEN -it.total_value ELSE 0 END) as total_revenue,
    AVG(CASE WHEN it.transaction_type = 'sale' THEN -it.total_value / -it.quantity_change END) as avg_selling_price,
    ib.current_quantity as current_stock,
    ib.available_quantity as available_stock
FROM tenant_products p
JOIN tenant_brands b ON p.tenant_id = b.tenant_id AND p.brand_id = b.brand_id
LEFT JOIN tenant_sku_variants sv ON p.tenant_id = sv.tenant_id AND p.product_id = sv.product_id
LEFT JOIN tenant_inventory_balance ib ON sv.tenant_id = ib.tenant_id AND sv.sku_id = ib.sku_id
LEFT JOIN tenant_inventory_transactions it ON sv.tenant_id = it.tenant_id AND sv.sku_id = it.sku_id
GROUP BY p.tenant_id, p.product_id, p.product_name, b.brand_name, ib.current_quantity, ib.available_quantity;
```

### Aggregated Stock Snapshots

**Hourly Snapshots for Real-time Dashboards**:
```sql
CREATE TABLE tenant_inventory_snapshots (
    tenant_id UUID NOT NULL,
    snapshot_id UUID NOT NULL,
    snapshot_time TIMESTAMP WITH TIME ZONE NOT NULL,
    total_skus INTEGER NOT NULL,
    total_value DECIMAL(16,2) NOT NULL,
    low_stock_alerts INTEGER NOT NULL,
    snapshot_data JSONB NOT NULL, -- Aggregated data

    PRIMARY KEY (tenant_id, snapshot_id)
);

-- Partition by month
CREATE TABLE tenant_inventory_snapshots_y2024m03 PARTITION OF tenant_inventory_snapshots
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
```

### Fast Dashboard Queries

**Dashboard Query Optimization**:
```sql
-- Pre-aggregated dashboard data
CREATE MATERIALIZED VIEW tenant_dashboard_metrics AS
SELECT
    tenant_id,
    COUNT(DISTINCT sku_id) as total_skus,
    SUM(current_quantity * distributor_cost) as total_inventory_value,
    COUNT(CASE WHEN available_quantity < reorder_point THEN 1 END) as low_stock_items,
    SUM(CASE WHEN transaction_type = 'sale' AND transaction_date >= CURRENT_DATE - INTERVAL '30 days'
             THEN -total_value ELSE 0 END) as monthly_sales,
    AVG(CASE WHEN transaction_type = 'sale' AND transaction_date >= CURRENT_DATE - INTERVAL '30 days'
             THEN -total_value / -quantity_change END) as avg_order_value
FROM tenant_inventory_balance ib
LEFT JOIN tenant_inventory_transactions it ON ib.tenant_id = it.tenant_id
    AND ib.sku_id = it.sku_id AND ib.warehouse_id = it.warehouse_id
GROUP BY tenant_id;
```

## ER Relationship Explanation

### Core Entity Relationships

```
tenant_brands (1) ──── (M) tenant_products
    │                           │
    │                           │
    └── tenant_sku_variants ────┘
                │
                ├── (M) tenant_inventory_balance
                │           │
                │           └── (1) tenant_warehouses
                │
                └── (M) tenant_inventory_transactions
                            │
                            ├── (1) tenant_orders (via reference_id)
                            ├── (1) tenant_purchase_orders
                            └── (1) tenant_stock_adjustments
```

### Key Relationships

- **Brands → Products**: One-to-many, brand owns products
- **Products → SKU Variants**: One-to-many, product has multiple variants
- **SKU Variants → Inventory**: One-to-many, each variant tracked separately
- **Inventory → Transactions**: One-to-many, complete audit trail
- **Transactions → Orders/Purchases**: Many-to-one, transactions reference business documents

## Sample Table Structure

### Complete Schema Example

```sql
-- Multi-tenant schema structure
CREATE SCHEMA tenant_{tenant_id};

-- Set search path for tenant operations
SET search_path TO tenant_{tenant_id}, public;

-- Brands table
CREATE TABLE brands (
    brand_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_name VARCHAR(255) NOT NULL UNIQUE,
    company_type VARCHAR(32) NOT NULL,
    catalog_source_type VARCHAR(32) NOT NULL DEFAULT 'manual',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
    product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(brand_id),
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    tax_classification VARCHAR(32) NOT NULL DEFAULT 'GST_18',
    default_unit VARCHAR(32) NOT NULL DEFAULT 'pieces',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- SKU Variants table
CREATE TABLE sku_variants (
    sku_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(product_id),
    variant_attributes JSONB NOT NULL DEFAULT '{}',
    barcode VARCHAR(100) UNIQUE,
    internal_sku_code VARCHAR(100) NOT NULL UNIQUE,
    unit_conversion_factor DECIMAL(10,3) NOT NULL DEFAULT 1.0,
    base_unit VARCHAR(32) NOT NULL,
    mrp DECIMAL(12,2) NOT NULL,
    distributor_cost DECIMAL(12,2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Inventory tables
CREATE TABLE inventory_balance (
    sku_id UUID NOT NULL REFERENCES sku_variants(sku_id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(warehouse_id),
    batch_id UUID,
    current_quantity DECIMAL(14,3) NOT NULL DEFAULT 0,
    reserved_quantity DECIMAL(14,3) NOT NULL DEFAULT 0,
    available_quantity DECIMAL(14,3) GENERATED ALWAYS AS (current_quantity - reserved_quantity) STORED,
    last_movement_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    PRIMARY KEY (sku_id, warehouse_id, COALESCE(batch_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

CREATE TABLE inventory_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku_id UUID NOT NULL REFERENCES sku_variants(sku_id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(warehouse_id),
    batch_id UUID,
    transaction_type VARCHAR(32) NOT NULL,
    reference_type VARCHAR(32) NOT NULL,
    reference_id UUID NOT NULL,
    quantity_change DECIMAL(14,3) NOT NULL,
    unit_cost DECIMAL(12,2),
    total_value DECIMAL(14,2) GENERATED ALWAYS AS (quantity_change * unit_cost) STORED,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_by UUID REFERENCES users(id)
);
```

## Scaling Considerations

### Database Partitioning

**By Tenant**:
```sql
-- Partition inventory tables by tenant (in shared schema)
CREATE TABLE inventory_transactions_y2024 PARTITION OF inventory_transactions
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

**By Warehouse/Product**:
```sql
-- Sub-partition by warehouse for large distributors
CREATE TABLE inventory_transactions_wh1 PARTITION OF inventory_transactions_wh1
    FOR VALUES IN ('warehouse-1');
```

### Index Optimization

**Partial Indexes for Active Records**:
```sql
CREATE INDEX idx_products_active ON products (brand_id, category)
    WHERE is_active = true;

CREATE INDEX idx_inventory_available ON inventory_balance (sku_id, warehouse_id)
    WHERE available_quantity > 0;
```

### Read Replicas Strategy

- **Inventory Balance**: Read from replica for dashboard queries
- **Transaction History**: Archive old transactions to separate table
- **Real-time Updates**: Write to primary, read critical data from primary

### Caching Strategy

**Redis Cache Keys**:
- `inventory:{tenant_id}:{sku_id}:{warehouse_id}` - Current balance
- `product:{tenant_id}:{product_id}` - Product details with variants
- `pricing:{tenant_id}:{sku_id}` - Pricing slabs

**Cache Invalidation**:
- Update cache on inventory transactions
- Use pub/sub for cross-instance invalidation
- TTL-based expiration for stale data

### Performance Benchmarks

**Expected Throughput**:
- 1,000+ inventory transactions/second per tenant
- Sub-100ms query response for stock checks
- Sub-1s for complex analytics queries

**Monitoring Metrics**:
- Query execution time by table
- Lock wait times for inventory updates
- Cache hit rates
- Deadlock frequency