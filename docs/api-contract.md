# SupplySetu REST API Contract

Base path: `/api/v1`

Transport: JSON over HTTPS

Authentication: `Authorization: Bearer <jwt>`

## Cross-Cutting Conventions

### Tenant Context

- Every authenticated request must resolve a tenant context before hitting module handlers.
- Tenant should be derived from JWT claims, not from user-submitted body fields.
- Internal sync endpoints may additionally require a signed integration credential, but tenant resolution still maps to a single `tenant_id`.

### Roles

- `retailer`
- `salesman`
- `admin`
- `system`
- `sync_worker`

### Success Response

```json
{
  "success": true,
  "data": {}
}
```

### Error Response

```json
{
  "success": false,
  "error_code": "INVALID_ORDER_TRANSITION",
  "message": "Cannot transition order from pending_approval to dispatched"
}
```

For validation and workflow failures, include optional `details` for clients and operators:

```json
{
  "success": false,
  "error_code": "MIN_ORDER_VALUE_NOT_MET",
  "message": "Order value is below route minimum",
  "details": {
    "minimumOrderValue": 1500,
    "submittedOrderValue": 1320
  }
}
```

### Standard Headers

- `Authorization: Bearer <jwt>`
- `X-Request-Id: <uuid>` optional but recommended
- `Idempotency-Key: <string>` required for retry-safe order submission and sync mutation calls

## Versioning Strategy

- Use URI versioning: `/api/v1/...`
- Keep additive response evolution within `v1`
- Introduce `/api/v2` only for breaking contract changes
- Emit `Deprecation` and `Sunset` headers before retiring old versions

## Pagination Pattern

List endpoints use page-based pagination for lightweight clients:

Request:

- `page` default `1`
- `page_size` default `20`, max `50`

Response:

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_items": 240,
      "total_pages": 12,
      "has_next": true
    }
  }
}
```

## Endpoint Groups

### AUTH

#### `POST /auth/login`

Purpose: authenticate retailer, salesman, or admin user.

Auth: public

Request:

```json
{
  "username": "user@example.com",
  "password": "secret",
  "device": {
    "platform": "android",
    "app_version": "1.0.0"
  }
}
```

Success:

```json
{
  "success": true,
  "data": {
    "access_token": "jwt",
    "refresh_token": "jwt",
    "expires_in": 3600,
    "user": {
      "id": "usr_123",
      "name": "Retailer User",
      "role": "retailer",
      "tenant_id": "ten_123"
    }
  }
}
```

Errors:

- `INVALID_CREDENTIALS`
- `USER_INACTIVE`
- `TENANT_INACTIVE`

#### `POST /auth/refresh`

Purpose: exchange refresh token for new access token.

Auth: refresh token

Request:

```json
{
  "refresh_token": "jwt"
}
```

### CATALOGUE

#### `GET /brands`

Purpose: list active brands visible to the tenant.

Auth: `retailer`, `salesman`, `admin`

Query params:

- `active=true` optional, default `true`

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "br_001",
        "name": "Brand A",
        "product_count": 34
      }
    ]
  }
}
```

#### `GET /products?brand_id=&search=&page=`

Purpose: lightweight paginated catalogue browsing.

Auth: `retailer`, `salesman`, `admin`

Query params:

- `brand_id` optional
- `search` optional
- `page`
- `page_size`

Response item:

```json
{
  "id": "prd_001",
  "brand_id": "br_001",
  "name": "Product 1",
  "sku_code": "SKU001",
  "pack_size": "500g",
  "mrp": 120,
  "selling_price": 112,
  "active_scheme_tag": "COD5",
  "indicative_stock_status": "available"
}
```

Validation notes:

- only active products are returned to retailer clients
- search must be prefix/keyword optimized for low-latency mobile use

#### `GET /schemes/active`

Purpose: return active pricing or scheme summaries visible to the user context.

Auth: `retailer`, `salesman`, `admin`

Query params:

- `payment_mode` optional
- `brand_id` optional

### RETAILERS

#### `GET /retailers/{id}`

Purpose: fetch retailer profile, route, payment settings, and delivery defaults.

Auth:

- `admin`, `salesman`
- `retailer` only for self

Response:

```json
{
  "success": true,
  "data": {
    "id": "rtl_001",
    "name": "Sharma Stores",
    "route_id": "r_11",
    "route_name": "East Route",
    "minimum_order_value": 1500,
    "default_payment_mode": "cod",
    "expected_delivery_days": 2
  }
}
```

#### `GET /retailers/{id}/orders`

Purpose: fetch retailer order history.

Auth:

- `admin`, `salesman`
- `retailer` only for self

Query params:

- `status` optional
- `page`
- `page_size`

### ORDERS

#### `POST /orders`

Purpose: create order intent.

Auth: `retailer`, `salesman`, `admin`

Headers:

- `Idempotency-Key` required

Request:

```json
{
  "client_order_ref": "mob-rtl001-20260313-001",
  "retailer_id": "rtl_001",
  "payment_mode": "cod",
  "notes": "Night order",
  "items": [
    {
      "product_id": "prd_001",
      "quantity": 10
    }
  ]
}
```

Server-side validations:

- `client_order_ref` must be unique per tenant and retailer for idempotent replay handling
- retailer route minimum order value must be satisfied
- every ordered product must be active and tenant-visible
- payment mode must be allowed for the retailer and pricing context
- expected delivery date must be calculated from route and cutoff logic

Success:

```json
{
  "success": true,
  "data": {
    "id": "ord_001",
    "client_order_ref": "mob-rtl001-20260313-001",
    "status": "pending_approval",
    "expected_delivery_date": "2026-03-16",
    "order_value": 1840,
    "currency": "INR"
  }
}
```

Errors:

- `MIN_ORDER_VALUE_NOT_MET`
- `PRODUCT_INACTIVE`
- `INVALID_PAYMENT_MODE`
- `DUPLICATE_CLIENT_ORDER_REF`
- `IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD`

Idempotency behavior:

- same tenant + same `client_order_ref` + same normalized payload returns the original success response
- same idempotency key with a different payload returns `409`

#### `GET /orders/{id}`

Purpose: fetch order detail.

Auth:

- `admin`, `salesman`
- `retailer` only for own order

Response fields:

- order header
- current status
- item lines
- payment mode
- expected delivery date
- workflow timestamps
- indicative stock disclaimer

#### `GET /orders?status=&route=&page=`

Purpose: operational order list for admin and salesman workflows.

Auth: `admin`, `salesman`

Query params:

- `status` optional
- `route` optional
- `page`
- `page_size`

#### `POST /orders/{id}/approve`

Purpose: transition order from `pending_approval` to `approved_for_export`.

Auth: `admin`, `system`

Request:

```json
{
  "notes": "Approved by admin"
}
```

Errors:

- `INVALID_ORDER_TRANSITION`
- `ORDER_TRANSITION_ROLE_FORBIDDEN`
- `ORDER_NOT_FOUND`

#### `POST /orders/{id}/cancel`

Purpose: cancel order from `pending_approval` or `approved_for_export`.

Auth: `admin`, `system`

Request:

```json
{
  "reason": "Retailer requested cancellation"
}
```

#### `POST /orders/{id}/dispatch`

Purpose: transition order from `invoiced` to `dispatched`.

Auth: `admin`, `system`

Request:

```json
{
  "dispatched_at": "2026-03-13T21:00:00Z",
  "vehicle_ref": "VAN-12"
}
```

Errors:

- `DISPATCH_BEFORE_INVOICE`
- `INVALID_ORDER_TRANSITION`

#### `POST /orders/{id}/deliver`

Purpose: transition order from `dispatched` to `delivered`.

Auth: `admin`, `system`

Request:

```json
{
  "delivered_at": "2026-03-14T10:30:00Z",
  "proof_note": "Received by store owner"
}
```

### SYNC

#### `POST /sync/invoice-confirmation`

Purpose: update order state from accounting confirmation.

Auth: `sync_worker`, `system`

Headers:

- `Idempotency-Key` required

Request:

```json
{
  "external_invoice_no": "INV-20391",
  "order_id": "ord_001",
  "invoice_date": "2026-03-13",
  "invoice_amount": 1840
}
```

Behavior:

- transitions `approved_for_export -> invoiced`
- duplicate confirmation for the same invoice should return the current order state, not create a second transition
- mismatched invoice payload for the same idempotency key should return `409`

Errors:

- `DUPLICATE_INVOICE_CONFIRMATION`
- `ORDER_NOT_FOUND`
- `INVALID_ORDER_TRANSITION`

#### `POST /sync/payment-update`

Purpose: ingest accounting-side payment reconciliation or closure signal.

Auth: `sync_worker`, `system`

Headers:

- `Idempotency-Key` required

Request:

```json
{
  "order_id": "ord_001",
  "payment_status": "reconciled",
  "payment_reference": "RCPT-1933",
  "paid_amount": 1840,
  "paid_at": "2026-03-15T10:15:00Z"
}
```

Behavior:

- may trigger `delivered -> closed` if business preconditions are satisfied
- must not close an order before delivery

### ADMIN

#### `GET /admin/dashboard-summary`

Purpose: operational KPI summary for admin console.

Auth: `admin`

Response:

```json
{
  "success": true,
  "data": {
    "pending_approval_count": 21,
    "approved_for_export_count": 13,
    "today_order_value": 183400,
    "digital_order_share": 0.62,
    "avg_collection_cycle_days": 6.4
  }
}
```

#### `GET /admin/low-stock-alerts`

Purpose: expose low-stock indicators derived from indicative inventory snapshots.

Auth: `admin`

Response note:

- inventory values are advisory only until accounting sync confirms movement

## Endpoint Permission Matrix

| Endpoint Group | Retailer | Salesman | Admin | System | Sync Worker |
| --- | --- | --- | --- | --- | --- |
| Auth | Yes | Yes | Yes | No | No |
| Catalogue | Yes | Yes | Yes | No | No |
| Retailers | Self only | Yes | Yes | No | No |
| Orders create/view own | Yes | Assisted | Yes | No | No |
| Orders list operational | No | Yes | Yes | No | No |
| Orders approve/cancel/dispatch/deliver | No | No | Yes | Yes | No |
| Sync endpoints | No | No | No | Yes | Yes |
| Admin endpoints | No | No | Yes | No | No |

Admin Product Management module contract for distributor catalogue operations is documented in `docs/admin-product-management-api-contract.md`.

## Rate Limiting Suggestion

- `POST /auth/login`: 5 requests per minute per IP and username tuple
- retailer catalogue and order browsing: 60 requests per minute per access token
- mutation endpoints: 30 requests per minute per tenant and actor
- sync endpoints: 120 requests per minute per integration credential, plus idempotency enforcement

Use token-bucket or sliding-window counters at the API gateway or reverse proxy layer, with stricter rules for authentication endpoints.

## Retry-Safe Design Notes

- `POST /orders`, `POST /sync/invoice-confirmation`, and `POST /sync/payment-update` should require `Idempotency-Key`.
- Persist an idempotency record keyed by `tenant_id + endpoint + idempotency_key`.
- Store a request payload hash and final response snapshot.
- On retry with the same payload hash, return the original response.
- On retry with a different payload hash, return `409 IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD`.
- Sync handlers must also deduplicate against external business keys such as `external_invoice_no`.
- Order state mutations should use optimistic concurrency on current status to avoid double transitions.
