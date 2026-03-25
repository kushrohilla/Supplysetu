# Catalogue Module - Summary

## Purpose
Provides product browsing, search, and discovery functionality for retailers. Manages tenant-scoped product catalogues, brand hierarchy, and stock availability lookups.

## Main Entities
- **Brand** - Product brand/category grouping
- **Product** - Catalog item with SKU, name, pricing  
- **Stock** - Current inventory levels per product
- **Product Pricing** - Multi-tier pricing rules (base vs. advance pricing)

## Active API Routes
- `GET /catalogue/brands` — List all brands with product counts
- `GET /catalogue/brands/:brandId/products` — Browse products by brand (paginated, max 30 per page)
- `GET /catalogue/search` — Full-text search products by name/SKU/brand
- `GET /catalogue/products/:productId` — Get product details and stock availability
- `POST /catalogue/stock/batch` — Batch lookup stock levels for multiple products

## Implementation Completion Status

| Component | Status | Notes |
|-----------|--------|-------|
| Brand Listing | ✅ 100% | With product count aggregation |
| Product Browsing | ✅ 100% | Paginated with cache headers |
| Search | ✅ 100% | Full-text search with debounce |
| Stock Lookup | ✅ 100% | Individual and batch APIs |
| Pricing Lookup | ✅ 100% | Base vs. advance pricing |
| Response Caching | ✅ 100% | 1hr brands, 30min products |

## Pending Logic Areas
None — module is production-ready.

## Key Implementation Details
- Page size capped at 30 items (bandwidth optimization)
- Search minimum 2 characters for debounce client-side
- Cache-Control headers: brands (1hr), products (30min)
- Queries optimized with database indexes on brand_id, product_name, sku
- Supports multi-tenant product isolation at database level

## Performance Notes
- Large product catalogues handled via pagination
- Search with ILIKE (case-insensitive) on name and SKU
- Batch stock lookup reduces N+1 queries
