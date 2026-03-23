# Multi-Tenant Database Architecture for Distributor Management SaaS

## Overview

This document outlines a scalable multi-tenant database architecture for a distributor management SaaS platform. The system supports thousands of distributors, each operating isolated business workspaces with brands, SKUs, retailers, orders, and inventory data.

## 1. Tenant Isolation Strategy

### Comparison of Approaches

#### Shared Database + Tenant ID
- **Description**: Single database with tenant_id column in all tenant-scoped tables
- **Pros**:
  - Lowest cost (single DB instance)
  - Simplest scaling (add more connections/read replicas)
  - Easiest cross-tenant queries for analytics
  - Single backup/restore process
- **Cons**:
  - No true data isolation (accidental cross-tenant data access possible)
  - Performance degradation with noisy neighbors
  - Complex tenant deletion (cascading deletes)
  - Security concerns for regulated industries

#### Schema per Tenant
- **Description**: Separate PostgreSQL schema for each tenant within shared database
- **Pros**:
  - Strong data isolation (schema-level security)
  - Tenant-specific optimizations possible
  - Easier tenant deletion (drop schema)
  - Better performance isolation
- **Cons**:
  - Higher complexity for cross-tenant operations
  - Schema management overhead
  - Connection pooling challenges
  - Analytics queries require dynamic schema switching

#### Database per Tenant
- **Description**: Separate database instance per tenant
- **Pros**:
  - Maximum isolation and security
  - Tenant-specific optimizations
  - Regulatory compliance easier
  - Performance isolation
- **Cons**:
  - Highest cost (multiple DB instances)
  - Complex scaling and management
  - Cross-tenant analytics very difficult
  - Backup/restore complexity

### Recommended Hybrid Approach

**Primary Strategy: Shared Database + Schema per Tenant**

**Rationale:**
- **Cost**: Single database cluster reduces infrastructure costs vs database-per-tenant
- **Scale**: PostgreSQL schemas scale to 10,000+ tenants within single database
- **Performance**: Schema isolation prevents noisy neighbor issues while allowing connection pooling
- **Data Security**: Schema-level isolation provides strong tenant separation

**Migration Path:**
- Start with Shared DB + Tenant ID for initial tenants (<100)
- Migrate to Schema per Tenant as tenant count grows
- High-value/regulatory tenants can get dedicated databases

**Implementation:**
```sql
-- Create tenant schema
CREATE SCHEMA tenant_{tenant_id};

-- Set search path for tenant context
SET search_path TO tenant_{tenant_id}, public;
```

## 2. Core Tables Tenant Scope

### Global Tables (Shared Across All Tenants)
- `tenants` - Tenant metadata
- `subscription_plans` - Platform subscription tiers
- `platform_users` - Super admin/platform staff
- `global_brand_catalog` - Master brand registry (future use)

### Tenant Scoped Tables (Per Distributor)
- `distributors` - Distributor profile and settings
- `brands` - Distributor's product brands
- `products` - Product catalog
- `sku_variants` - SKU-specific variations
- `retailers` - Retailer/customer management
- `orders` - Order transactions
- `inventory_ledger` - Stock movement tracking
- `routes` - Delivery/sales routes
- `salesmen` - Sales team management

### Tenant ID Indexing Strategy

**Composite Primary Keys:**
```sql
-- Use tenant_id as first column in composite PK
CREATE TABLE tenant_products (
    tenant_id UUID NOT NULL,
    id UUID NOT NULL,
    -- other columns
    PRIMARY KEY (tenant_id, id)
);
```

**Indexing Strategy:**
```sql
-- Tenant-scoped queries
CREATE INDEX idx_tenant_products_tenant_status ON tenant_products(tenant_id, status);

-- Foreign key relationships
CREATE INDEX idx_tenant_products_tenant_brand ON tenant_products(tenant_id, brand_id);

-- Composite indexes for common query patterns
CREATE INDEX idx_orders_tenant_retailer_date ON orders(tenant_id, retailer_id, created_at DESC);
```

### Partitioning Approach

**Table Partitioning by Tenant:**
```sql
-- Partition by tenant_id hash
CREATE TABLE orders PARTITION BY HASH (tenant_id);

-- Create partitions (PostgreSQL 11+)
CREATE TABLE orders_p0 PARTITION OF orders FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE orders_p1 PARTITION OF orders FOR VALUES WITH (MODULUS 4, REMAINDER 1);
-- etc.
```

**Benefits:**
- Improved query performance for tenant-scoped data
- Easier maintenance (partition pruning)
- Parallel query execution
- Simplified tenant deletion (drop partition)

## 3. High Performance Considerations

### Order Write Load Handling

**Architecture:**
- **Write-Ahead Partitioning**: Partition orders table by tenant_id and date range
- **Asynchronous Processing**: Use queue (Redis/RabbitMQ) for order processing
- **Batch Inserts**: Group multiple order items into single transaction
- **Connection Pooling**: PgBouncer for efficient connection management

**Implementation:**
```sql
-- Date-range partitioning for orders
CREATE TABLE orders_y2024m03 PARTITION OF orders
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
```

### Inventory Read Optimization

**Read Patterns:**
- Real-time stock levels for order validation
- Historical inventory tracking for analytics
- Stock alerts and low-stock notifications

**Optimization Strategies:**
- **Materialized Views**: Pre-computed stock levels
- **Read Replicas**: Separate read instances for inventory queries
- **Caching Layer**: Redis for frequently accessed stock data

**Implementation:**
```sql
-- Materialized view for current stock levels
CREATE MATERIALIZED VIEW tenant_inventory_current AS
SELECT tenant_id, product_id, SUM(quantity_change) as current_stock
FROM inventory_ledger
WHERE tenant_id = ?
GROUP BY tenant_id, product_id;
```

### Caching Layer Suggestion

**Redis Caching Strategy:**
- **Stock Levels**: Cache current inventory with 5-minute TTL
- **Product Catalog**: Cache product details with 1-hour TTL
- **User Sessions**: Cache tenant context and permissions

**Cache Invalidation:**
- Event-driven invalidation via Redis pub/sub
- Time-based expiration for stale data
- Write-through caching for critical inventory updates

### Search Indexing for SKU Discovery

**Full-Text Search:**
```sql
-- GIN index for product search
CREATE INDEX idx_products_search ON products
USING GIN (to_tsvector('english', product_name || ' ' || description));

-- Search function
SELECT * FROM products
WHERE tenant_id = ? AND to_tsvector('english', product_name || ' ' || description) @@ to_tsquery(?);
```

**Trigram Similarity:**
```sql
-- For fuzzy matching
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_products_trgm ON products USING GIN (product_name gin_trgm_ops);
```

## 4. Offline Sync Conflict Model

### Versioning Column Strategy

**Optimistic Concurrency Control:**
```sql
ALTER TABLE orders ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE inventory_ledger ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
```

**Version Update Pattern:**
```sql
UPDATE orders
SET status = ?, version = version + 1, updated_at = NOW()
WHERE id = ? AND tenant_id = ? AND version = ?;
```

### Last Write Wins vs Merge Logic

**Recommended: Merge Logic with Conflict Resolution**

**Strategy:**
- **Client-side versioning**: Each record has client_version and server_version
- **Conflict detection**: Server compares versions on sync
- **Merge rules**:
  - Order status: Server state wins (authoritative)
  - Inventory adjustments: Additive merge (sum quantities)
  - Product updates: Field-level merge with timestamps

**Implementation:**
```sql
-- Conflict resolution table
CREATE TABLE sync_conflicts (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    table_name VARCHAR(64) NOT NULL,
    record_id UUID NOT NULL,
    client_data JSONB NOT NULL,
    server_data JSONB NOT NULL,
    resolution_strategy VARCHAR(32) NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Audit Trail Storage

**Comprehensive Audit Logging:**
```sql
CREATE TABLE audit_trail (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    table_name VARCHAR(64) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(32) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_session_id UUID, -- For offline sync tracking
    client_version INTEGER
);

-- Partition by month for performance
CREATE TABLE audit_trail_y2024m03 PARTITION OF audit_trail
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
```

## 5. Future Scale Considerations

### Supporting 10M SKUs Total

**Architecture:**
- **Global SKU Registry**: Shared catalog with tenant-specific pricing
- **Partitioning**: Hash partitioning across multiple tables
- **Sharding**: Database sharding by SKU category or tenant range
- **Caching**: Multi-level caching (Redis + CDN for images)

**Scaling Strategy:**
```sql
-- Shard products table
CREATE TABLE products_shard_00 PARTITION OF products
    FOR VALUES WITH (MODULUS 100, REMAINDER 0);
-- ... up to shard_99
```

### Supporting 100K Distributors

**Tenant Management:**
- **Tenant Registry**: Distributed registry for tenant metadata
- **Schema Pooling**: Pre-create schemas in batches
- **Automated Provisioning**: API-driven tenant creation/deletion

**Performance Scaling:**
- **Read Replicas**: Multiple read instances per region
- **Connection Pooling**: Advanced pooling with tenant affinity
- **Query Optimization**: Tenant-aware query planning

### Heavy Analytics Queries

**Analytics Architecture:**
- **Separate Analytics DB**: Replicate data to columnar store (ClickHouse/Redshift)
- **Aggregated Tables**: Pre-computed metrics by tenant
- **Materialized Views**: Real-time updating aggregates

**Implementation:**
```sql
-- Analytics schema
CREATE SCHEMA analytics;

-- Tenant performance metrics
CREATE MATERIALIZED VIEW analytics.tenant_metrics AS
SELECT
    tenant_id,
    COUNT(DISTINCT retailer_id) as retailer_count,
    SUM(order_value) as total_revenue,
    AVG(order_value) as avg_order_value
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY tenant_id;
```

## Table Relationships

### Core Entity Relationships

```
tenants (1) ──── (M) users
    │
    ├── (1) distributors
    │
    ├── (M) brands
    │   │
    │   └── (M) products
    │       │
    │       └── (M) sku_variants
    │
    ├── (M) retailers
    │   │
    │   └── (M) orders ─── (M) order_items ─── (1) sku_variants
    │
    ├── (M) routes
    │   │
    │   └── (M) route_stops ─── (1) retailers
    │
    └── (M) salesmen
        │
        └── (M) salesman_routes ─── (1) routes
```

### Inventory Ledger Relationships

```
inventory_ledger (M) ─── (1) sku_variants
    │
    ├── (1) warehouses/locations
    ├── (1) transactions (orders/transfers/adjustments)
    └── (1) audit_trail
```

## Scaling Notes

### Horizontal Scaling
- **Database Sharding**: Shard by tenant_id ranges for large tenants
- **Read Replicas**: Geographic distribution for global tenants
- **Caching Clusters**: Redis clusters for session and inventory data

### Vertical Scaling
- **Instance Sizing**: Start with r5.large, scale to r5.4xlarge based on load
- **Storage**: Use gp3 volumes with 10,000+ IOPS for high-throughput tables

### Monitoring & Alerting
- **Key Metrics**: Query latency, connection count, disk I/O, cache hit rates
- **Tenant Isolation**: Monitor per-tenant resource usage
- **Auto-scaling**: AWS RDS auto-scaling based on CPU/memory metrics

### Migration Strategy
- **Zero-downtime**: Use logical replication for schema changes
- **Gradual Rollout**: Migrate tenants in batches during low-traffic windows
- **Rollback Plan**: Maintain previous schema versions for quick reversion