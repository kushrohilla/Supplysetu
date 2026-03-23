# SupplySetu Admin Product Management Architecture

## Objective

Deliver a distributor-first product management system that is fast for daily operations and strict on data consistency.

## Layered Data Model

### 1) Global Catalogue Layer (platform scoped)

Tables:

- `global_brands`
- `global_products`

Responsibilities:

- single standardized taxonomy
- canonical naming and pack-size references
- image and classification metadata for analytics and recommendations

### 2) Product Master Layer (tenant scoped)

Tables:

- `tenant_products`

Responsibilities:

- distributor-owned product records
- optional linkage to `global_product_id`
- tenant-specific sku codes and active/inactive status

### 3) Pricing & Scheme Layer (high churn data)

Tables:

- `tenant_product_schemes`

Responsibilities:

- price and scheme updates without touching core product identity
- side-panel quick edits with async save
- date-bounded campaign control

### 4) Stock Snapshot Layer (sync sourced)

Tables:

- `tenant_product_stock_snapshots`

Responsibilities:

- latest stock indicator from accounting sync
- operational signal for pricing and activation decisions
- trend base for fast/slow/inactive badge generation

### 5) Import Pipeline Layer

Tables:

- `tenant_product_import_jobs`
- `tenant_product_import_rows`

Responsibilities:

- staged validation and preview before commit
- row-level error traceability
- structured import report for operator confidence

## Admin UI Component Hierarchy

- `ProductManagementPage`
- `ProductToolbar`
- `ProductFilters`
- `ProductTable`
- `ProductPagination`
- `AddProductDrawer`
- `BulkImportDrawer`
- `CatalogueFetchDrawer`
- `QuickEditDrawer`
- `ImportValidationReport`

## Catalogue Fetch Service Design

Service name: `CatalogueFetchService`

Input:

- `tenant_id`
- `brand_id`
- optional query filters (category, segment, pack size)

Steps:

1. fetch active global products for brand
2. map suggested pricing band and metadata
3. exclude already linked tenant products when required
4. return lightweight DTO optimized for selection table

Output:

- selectable rows with `global_product_id`
- product media and metadata
- suggested price band

## Validation Rules Engine

Service name: `ProductValidationEngine`

Modules:

- `IdentityRules` duplicate and naming checks
- `PricingRules` numeric and range checks
- `SchemeRules` date consistency checks
- `ImportRules` row-level format checks

Evaluation order:

1. required fields
2. data type and format
3. duplicate detection in file
4. duplicate detection against tenant master
5. business constraints

Output format:

- `row_no`
- `error_codes[]`
- human message
- optional fix suggestion

## Performance Strategy

- cursor or page pagination for product list
- server-side filtering and indexed columns
- avoid table-wide joins in listing path, prefetch latest scheme and stock via subqueries/materialized views
- cache brand list and global catalogue slices
- async import validation worker for large files

## Scalability Considerations

- 500+ SKU per tenant baseline supported by index strategy:
  - `tenant_products(tenant_id, status, brand_id)`
  - `tenant_products(tenant_id, product_name)`
  - `tenant_product_schemes(tenant_id, tenant_product_id, is_active)`
  - `tenant_product_stock_snapshots(tenant_id, tenant_product_id, captured_at desc)`
- partition stock snapshots by month if growth becomes high
- add read-model table for dashboard if p95 degrades with joins
- enforce idempotent import job confirmation to avoid duplicate writes

## Operational Safety

- keep React Native ordering flow and backend order APIs unchanged
- product-management writes are isolated to admin endpoints
- status toggle must never delete products; use soft active/inactive semantics
- every mutation logs audit event in `audit_logs`
