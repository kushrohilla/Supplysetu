# SupplySetu Admin Product Management API Contract

Base path: `/api/v1/admin/products`

Authentication: `Authorization: Bearer <jwt>` (role: `admin`)

All endpoints are tenant-scoped from JWT claims.

## 1) Product Dashboard Listing

### `GET /api/v1/admin/products`

Purpose: fast paginated listing for product dashboard with search and filters.

Query params:

- `search` optional product name, sku, or brand keyword
- `brand_id` optional
- `status` optional (`active`, `inactive`)
- `page` default `1`
- `page_size` default `20`, max `100`

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "tp_001",
        "sku_code": "AMUL-MILK-500",
        "product_name": "Amul Taaza Milk",
        "brand": {
          "id": "br_amul",
          "name": "Amul"
        },
        "pack_size": "500 ml",
        "base_price": 28,
        "advance_price": 27.5,
        "active_scheme": {
          "id": "sch_001",
          "text": "2% March Booster",
          "start_date": "2026-03-20",
          "end_date": "2026-03-31"
        },
        "stock_snapshot": {
          "qty": 102,
          "captured_at": "2026-03-21T09:12:00Z"
        },
        "status": "active",
        "performance_band": "fast_moving",
        "global_product_id": "gp_901"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_items": 514,
      "total_pages": 26,
      "has_next": true
    }
  }
}
```

## 2) Manual Product Create

### `POST /api/v1/admin/products`

Purpose: fast single-form product entry.

Request:

```json
{
  "brand_id": "br_amul",
  "product_name": "Amul Buttermilk",
  "pack_size": "200 ml",
  "sku_code": "AMUL-BTM-200",
  "base_price": 15,
  "advance_price": 14.5,
  "scheme_text": "Summer Offer",
  "scheme_start_date": "2026-03-21",
  "scheme_end_date": "2026-04-05",
  "opening_stock_snapshot": 60
}
```

Validation rules:

- `product_name` required, normalized and trimmed
- `pack_size` required
- `sku_code` required and unique per tenant
- `base_price` required and `> 0`
- `advance_price` optional and `> 0`, must be `<= base_price`
- if provided, `scheme_start_date <= scheme_end_date`

## 3) Quick Edit Pricing & Scheme

### `PATCH /api/v1/admin/products/{product_id}/pricing`

Purpose: update pricing and scheme fields asynchronously for side panel save.

Request:

```json
{
  "advance_price": 26.8,
  "scheme_text": "Retail Push 1.5%",
  "scheme_start_date": "2026-03-22",
  "scheme_end_date": "2026-03-31"
}
```

Response includes updated product summary for inline UI refresh.

## 4) Product Status Toggle

### `PATCH /api/v1/admin/products/{product_id}/status`

Request:

```json
{
  "status": "inactive"
}
```

Status values: `active`, `inactive`

## 5) Bulk Import Workflow

### `POST /api/v1/admin/products/import-jobs`

Purpose: create import job and upload csv/xlsx file metadata.

Request:

```json
{
  "source_type": "xlsx",
  "file_name": "march-catalogue.xlsx"
}
```

### `POST /api/v1/admin/products/import-jobs/{job_id}/rows`

Purpose: submit parsed rows from uploader/parser service.

Request:

```json
{
  "rows": [
    {
      "row_no": 2,
      "brand_name": "Amul",
      "product_name": "Amul Gold Milk",
      "pack_size": "500 ml",
      "sku_code": "AMUL-GLD-500",
      "base_price": "31",
      "advance_price": "30"
    }
  ]
}
```

### `POST /api/v1/admin/products/import-jobs/{job_id}/validate`

Purpose: run duplicate/missing/format validation and return preview.

Response:

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_rows": 50,
      "valid_rows": 46,
      "invalid_rows": 4
    },
    "errors": [
      {
        "row_no": 7,
        "error_codes": ["DUPLICATE_SKU"],
        "message": "Duplicate sku_code within file"
      },
      {
        "row_no": 12,
        "error_codes": ["MISSING_BASE_PRICE"],
        "message": "base_price is required"
      }
    ]
  }
}
```

### `POST /api/v1/admin/products/import-jobs/{job_id}/confirm`

Purpose: persist valid rows into tenant product master and return structured report.

## 6) Brand Catalogue Auto-Fetch

### `GET /api/v1/admin/catalogue/brands`

Purpose: list available brands from global catalogue.

### `GET /api/v1/admin/catalogue/brands/{brand_id}/products`

Purpose: fetch global catalogue products for selection grid.

Response item:

```json
{
  "global_product_id": "gp_901",
  "standard_name": "Amul Gold Milk",
  "pack_size": "500 ml",
  "description": "Toned milk pack",
  "image_url": "https://cdn.example.com/amul-gold-500.jpg",
  "classification": {
    "category": "Dairy",
    "segment": "Milk"
  },
  "mrp": 33,
  "suggested_price_band": {
    "min": 30,
    "max": 31
  }
}
```

### `POST /api/v1/admin/products/from-catalogue`

Purpose: create tenant products referencing `global_product_id`.

Request:

```json
{
  "items": [
    {
      "global_product_id": "gp_901",
      "sku_code": "AMUL-GLD-500",
      "base_price": 31,
      "advance_price": 30,
      "scheme_text": "Month End Scheme"
    }
  ]
}
```

## 7) Validation Error Codes

- `DUPLICATE_SKU`
- `DUPLICATE_PRODUCT_NAME_PACK_BRAND`
- `MISSING_BRAND`
- `MISSING_PRODUCT_NAME`
- `MISSING_PACK_SIZE`
- `MISSING_BASE_PRICE`
- `INVALID_PRICE_FORMAT`
- `INVALID_ADVANCE_PRICE`
- `INVALID_SCHEME_DATE_RANGE`

## 8) Operational Constraints

- `GET /admin/products` p95 response target under `350ms` for 500 SKU tenant
- indexed search by `tenant_id + status + brand_id + product_name prefix`
- import validation should process 500 rows under 8 seconds
- all write endpoints emit audit logs with actor and before/after fields
