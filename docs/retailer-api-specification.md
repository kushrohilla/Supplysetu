# Retailer Ordering API - OpenAPI Specification

**API Base URL**: `https://api.supplysetu.com/retailer-api`  
**Version**: 1.0.0  
**Authentication**: Bearer Token (JWT)

---

## 1. AUTHENTICATION FLOW

### Endpoint: Login with OTP

```http
POST /auth/login
Content-Type: application/json

{
  "phone": "9876543210"
}
```

**Response (200 OK)**:
```json
{
  "message": "OTP sent successfully",
  "phone": "9876543210",
  "expires_in": 300,
  "otp": "123456"
}
```

**Error (400 Bad Request)**:
```json
{
  "error": "invalid_phone",
  "message": "Phone must be 10 digits"
}
```

**Error (429 Too Many Requests)**:
```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many OTP requests. Try again in 60 seconds."
}
```

---

### Endpoint: Verify OTP

```http
POST /auth/verify
Content-Type: application/json

{
  "phone": "9876543210",
  "otp": "123456"
}
```

**Response (200 OK)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "retailer": {
    "id": 123,
    "phone": "9876543210",
    "name": "Manoj Sharma",
    "city": "Delhi",
    "state": "Delhi",
    "locality": "Sector 12",
    "credit_line_status": "active",
    "credit_limit": 50000,
    "created_at": "2026-03-23T10:00:00Z",
    "updated_at": "2026-03-23T10:00:00Z"
  }
}
```

**Error (400 Bad Request)**:
```json
{
  "error": "invalid_otp",
  "message": "OTP is incorrect or expired"
}
```

---

### Endpoint: Refresh Token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 86400,
  "token_type": "Bearer"
}
```

---

## 2. DISTRIBUTOR SELECTION

### Endpoint: Get Connected Distributors

```http
GET /auth/distributors
Authorization: Bearer <access_token>
```

**Response (200 OK)**:
```json
[
  {
    "tenant_id": 1,
    "name": "ABC Traders",
    "city": "Delhi",
    "region": "North",
    "logo_url": "https://cdn.supplysetu.com/logos/abc-traders.png",
    "last_ordered_at": "2026-03-22T14:30:00Z",
    "total_orders": 24,
    "total_order_value": 45000,
    "delivery_days": [1, 2, 3, 4, 5],
    "is_active": true
  },
  {
    "tenant_id": 2,
    "name": "XYZ Supply",
    "city": "Noida",
    "region": "North",
    "logo_url": "https://cdn.supplysetu.com/logos/xyz-supply.png",
    "last_ordered_at": "2026-03-15T09:00:00Z",
    "total_orders": 12,
    "total_order_value": 22000,
    "delivery_days": [1, 2, 4, 5],
    "is_active": true
  }
]
```

---

## 3. CATALOGUE ENDPOINTS

### Endpoint: Get Brands

```http
GET /catalogue/brands?tenant_id=1
Authorization: Bearer <access_token>
```

**Cache Headers**:
```
Cache-Control: public, max-age=3600
ETag: "v1-brands-2026-03-23"
```

**Response (200 OK)**:
```json
[
  {
    "id": 1,
    "name": "Amul",
    "code": "AMUL",
    "logo_url": "https://cdn.supplysetu.com/brands/amul.png",
    "description": "Amul - The Taste of India",
    "product_count": 24,
    "category": "Dairy"
  },
  {
    "id": 2,
    "name": "Britannia",
    "code": "BRIT",
    "logo_url": "https://cdn.supplysetu.com/brands/britannia.png",
    "description": "Britannia - Quality & Trust",
    "product_count": 18,
    "category": "FMCG"
  }
]
```

---

### Endpoint: Get Products by Brand (Paginated)

```http
GET /catalogue/brands/1/products?tenant_id=1&page=1&page_size=30
Authorization: Bearer <access_token>
```

**Query Parameters**:
- `page` (integer, default=1): Page number
- `page_size` (integer, default=30, max=30): Items per page
- `sort` (string, default="name"): Sort by `name`, `price_asc`, `price_desc`

**Cache Headers**:
```
Cache-Control: public, max-age=1800
ETag: "v1-products-brand-1-page-1"
```

**Response (200 OK)**:
```json
{
  "products": [
    {
      "id": 101,
      "sku": "AMUL-MILK-500M",
      "name": "Amul Milk 500ml",
      "brand_id": 1,
      "brand_name": "Amul",
      "category": "Dairy",
      "pack_size": "500 ml",
      "unit": "Tetra Pack",
      "base_price": 45.00,
      "advance_price": 42.00,
      "credit_price": 47.00,
      "mrp": 50.00,
      "image_url": "https://cdn.supplysetu.com/products/amul-milk-500ml.webp",
      "thumbnail_url": "https://cdn.supplysetu.com/products/amul-milk-500ml-thumb.webp",
      "in_stock": true,
      "available_quantity": 1000,
      "scheme": {
        "code": "BUY2GET1",
        "description": "Buy 2, Get 1 Free",
        "min_quantity": 2,
        "discount_percent": 33.33
      }
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 30,
    "total_count": 120,
    "has_more": true
  }
}
```

---

### Endpoint: Search Products

```http
GET /catalogue/search?tenant_id=1&q=milk&limit=30
Authorization: Bearer <access_token>
```

**Query Parameters**:
- `q` (string, min=2, max=100): Search query
- `limit` (integer, default=30, max=30): Results limit
- `brand_id` (optional): Filter by brand

**Response (200 OK)**:
```json
[
  {
    "id": 101,
    "sku": "AMUL-MILK-500M",
    "name": "Amul Milk 500ml",
    "brand_name": "Amul",
    "pack_size": "500 ml",
    "base_price": 45.00,
    "advance_price": 42.00,
    "image_url": "https://cdn.supplysetu.com/products/amul-milk-500ml.webp",
    "in_stock": true
  },
  {
    "id": 102,
    "sku": "AMUL-MILK-1L",
    "name": "Amul Milk 1L",
    "brand_name": "Amul",
    "pack_size": "1000 ml",
    "base_price": 85.00,
    "advance_price": 80.00,
    "image_url": "https://cdn.supplysetu.com/products/amul-milk-1l.webp",
    "in_stock": true
  }
]
```

---

### Endpoint: Get Product Details

```http
GET /catalogue/products/101?tenant_id=1
Authorization: Bearer <access_token>
```

**Response (200 OK)**:
```json
{
  "id": 101,
  "sku": "AMUL-MILK-500M",
  "name": "Amul Milk 500ml",
  "brand_id": 1,
  "brand_name": "Amul",
  "description": "Pure, Fresh Amul Milk - 500ml Tetra Pack",
  "category": "Dairy",
  "pack_size": "500 ml",
  "unit": "Tetra Pack",
  "hsn_code": "0401",
  "gst_percent": 5,
  "base_price": 45.00,
  "advance_price": 42.00,
  "credit_price": 47.00,
  "mrp": 50.00,
  "image_url": "https://cdn.supplysetu.com/products/amul-milk-500ml.webp",
  "images": [
    "https://cdn.supplysetu.com/products/amul-milk-500ml-1.webp",
    "https://cdn.supplysetu.com/products/amul-milk-500ml-2.webp"
  ],
  "in_stock": true,
  "available_quantity": 1000,
  "scheme": {
    "code": "BUY2GET1",
    "description": "Buy 2, Get 1 Free",
    "max_quantity": 100,
    "discount_amount": 0,
    "discount_percent": 33.33,
    "applies_on_scheme_price": false
  },
  "stock_snapshot": {
    "last_updated_at": "2026-03-23T09:30:00Z",
    "warehouse_quantity": 5000,
    "retail_quantity": 1000
  }
}
```

---

### Endpoint: Batch Stock Check

```http
POST /catalogue/stock/batch?tenant_id=1
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "product_ids": [101, 102, 103, 104, 105]
}
```

**Response (200 OK)**:
```json
{
  "101": {
    "in_stock": true,
    "available_quantity": 1000,
    "updated_at": "2026-03-23T09:30:00Z"
  },
  "102": {
    "in_stock": true,
    "available_quantity": 500,
    "updated_at": "2026-03-23T09:30:00Z"
  },
  "103": {
    "in_stock": false,
    "available_quantity": 0,
    "updated_at": "2026-03-23T08:00:00Z"
  }
}
```

---

## 4. QUICK REORDER

### Endpoint: Get Quick Reorder Data

```http
GET /orders/quick-reorder?tenant_id=1
Authorization: Bearer <access_token>
```

**Response (200 OK)**:
```json
{
  "recent_items": [
    {
      "product_id": 101,
      "sku": "AMUL-MILK-500M",
      "name": "Amul Milk 500ml",
      "pack_size": "500 ml",
      "base_price": 45.00,
      "quantity_last_ordered": 24,
      "last_order_date": "2026-03-22T14:30:00Z",
      "frequency": "daily",
      "image_url": "https://cdn.supplysetu.com/products/amul-milk-500ml.webp"
    }
  ],
  "frequently_ordered": [
    {
      "product_id": 102,
      "sku": "AMUL-MILK-1L",
      "name": "Amul Milk 1L",
      "pack_size": "1000 ml",
      "base_price": 85.00,
      "quantity_avg": 12,
      "order_count": 15,
      "image_url": "https://cdn.supplysetu.com/products/amul-milk-1l.webp"
    }
  ],
  "suggested_refills": []
}
```

---

## 5. ORDER PLACEMENT

### Endpoint: Create Order

```http
POST /orders/create
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "tenant_id": 1,
  "retailer_id": 123,
  "line_items": [
    {
      "product_id": 101,
      "quantity": 24,
      "scheme_code": "BUY2GET1"
    },
    {
      "product_id": 102,
      "quantity": 12
    }
  ],
  "payment_type": "cash",
  "idempotency_key": "550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "delivery_route": "Route-3",
    "delivery_date_preference": "2026-03-24",
    "special_instructions": "Gate password is 1234"
  }
}
```

**Request Validation**:
- `tenant_id`: Required, positive integer
- `retailer_id`: Required, must match authenticated user
- `line_items`: Required, 1-100 items
- `line_items[].quantity`: 1-1000
- `payment_type`: One of `cash`, `advance`, `credit_tag`
- `idempotency_key`: UUID format (prevents duplicate orders on retry)

**Response (201 Created)**:
```json
{
  "order_id": 5001,
  "order_number": "ORD-20260323-001",
  "status": "pending_approval",
  "total_amount": 1620.00,
  "subtotal": 1500.00,
  "tax": 75.00,
  "discount": 0,
  "gst_percent": 5,
  "line_item_count": 2,
  "payment_type": "cash",
  "created_at": "2026-03-23T10:15:00Z",
  "confirmation_token": "CONFIRM-5001-20260323-001",
  "line_items": [
    {
      "product_id": 101,
      "sku": "AMUL-MILK-500M",
      "name": "Amul Milk 500ml",
      "quantity": 24,
      "unit_price": 45.00,
      "line_total": 1080.00,
      "scheme_code": "BUY2GET1",
      "scheme_discount": 0
    }
  ]
}
```

**Error (400 Bad Request - Below Min Order)**:
```json
{
  "error": "min_order_value_not_met",
  "message": "Order total ₹1200 is below minimum ₹1500",
  "min_order_value": 1500,
  "current_total": 1200
}
```

**Error (409 Conflict - Duplicate Order)**:
```json
{
  "error": "duplicate_submission",
  "message": "Order already submitted with this idempotency key",
  "order_id": 5001,
  "order_number": "ORD-20260323-001"
}
```

---

### Endpoint: Get Order Status

```http
GET /orders/5001?tenant_id=1
Authorization: Bearer <access_token>
```

**Response (200 OK)**:
```json
{
  "order_id": 5001,
  "order_number": "ORD-20260323-001",
  "status": "pending_approval",
  "status_history": [
    {
      "status": "pending_approval",
      "timestamp": "2026-03-23T10:15:00Z",
      "message": "Order received, awaiting approval"
    }
  ],
  "total_amount": 1620.00,
  "line_items": [
    {
      "product_id": 101,
      "sku": "AMUL-MILK-500M",
      "name": "Amul Milk 500ml",
      "quantity": 24,
      "unit_price": 45.00,
      "line_total": 1080.00
    }
  ],
  "payment": {
    "payment_type": "cash",
    "payment_status": "pending",
    "amount": 1620.00
  },
  "shipping": {
    "expected_delivery": "2026-03-24",
    "delivery_route": "Route-3",
    "tracking_id": null
  },
  "created_at": "2026-03-23T10:15:00Z",
  "confirmation_token": "CONFIRM-5001-20260323-001"
}
```

---

### Endpoint: Get Order History

```http
GET /orders/list?tenant_id=1&limit=20&offset=0
Authorization: Bearer <access_token>
```

**Query Parameters**:
- `limit` (integer, default=20, max=50): Orders to fetch
- `offset` (integer, default=0): Pagination offset
- `status` (optional): Filter by status (e.g., `pending_approval`, `approved`, `delivered`)
- `from_date` (optional): ISO date string

**Response (200 OK)**:
```json
{
  "orders": [
    {
      "order_id": 5001,
      "order_number": "ORD-20260323-001",
      "status": "pending_approval",
      "total_amount": 1620.00,
      "item_count": 2,
      "created_at": "2026-03-23T10:15:00Z",
      "expected_delivery": "2026-03-24"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total_count": 45,
    "has_more": true
  }
}
```

---

## 6. ERROR CODES

| Code | HTTP | Description |
|------|------|-------------|
| `invalid_phone` | 400 | Phone format invalid (must be 10 digits) |
| `invalid_otp` | 400 | OTP incorrect or expired |
| `rate_limit_exceeded` | 429 | Too many requests, retry after delay |
| `unauthorized` | 401 | Missing or invalid Authorization header |
| `forbidden` | 403 | Access denied (e.g., order not owned by retailer) |
| `not_found` | 404 | Resource not found |
| `min_order_value_not_met` | 400 | Order total below ₹1500 |
| `duplicate_submission` | 409 | Idempotency key already used |
| `product_unavailable` | 400 | Product out of stock or unavailable |
| `internal_server_error` | 500 | Unexpected server error |

---

## 7. TESTING

### Example cURL Requests

**Login with OTP**:
```bash
curl -X POST https://api.supplysetu.com/retailer-api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210"}'
```

**Verify OTP**:
```bash
curl -X POST https://api.supplysetu.com/retailer-api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210", "otp": "123456"}'
```

**Create Order**:
```bash
curl -X POST https://api.supplysetu.com/retailer-api/orders/create \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": 1,
    "retailer_id": 123,
    "line_items": [{"product_id": 101, "quantity": 24}],
    "payment_type": "cash",
    "idempotency_key": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

**API Version**: 1.0.0  
**Last Updated**: March 23, 2026  
**Maintained By**: SupplySetu Engineering
