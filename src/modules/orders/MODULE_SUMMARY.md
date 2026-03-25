# Orders Module - Summary

## Purpose
Core order management system using Domain-Driven Design. Implements order creation, state machine transitions, payment processing, and operational workflows with comprehensive guardrails against invalid transitions.

## Main Entities
- **Order** — Core order with line items, totals, and customer info
- **Order Status** — State machine: pending_approval → approved_for_export → invoiced → dispatched → delivered → closed/cancelled
- **Order Line Item** — Per-product order details (quantity, price, GST)
- **Payment Record** — Payment method and transaction tracking
- **Order Transition** — Audit-logged state changes with actor tracking

## Active API Routes
- `POST /orders/quick-reorder` — Get suggestions for reorder (recent orders, favorites)
- `POST /orders/create` — Create new order with line items (min order value: ₹1500)
- `GET /orders/list` — Get order history for retailer
- `GET /orders/:orderId` — Fetch single order with full details and ownership check
- `GET /orders/:orderId/status` — Get current order status

## Implementation Completion Status

| Component | Status | Notes |
|-----------|--------|-------|
| Order Creation | ✅ 100% | Transactional, idempotent, with min order validation |
| State Machine | ✅ 100% | 7-state machine with comprehensive transition guards |
| Transitions | ✅ 100% | Authorization checks, audit logging |
| Line Items | ✅ 100% | Product validation, pricing lookup, tax calculation |
| Payment Processing | ✅ 100% | Payment record creation, status tracking |
| Order History | ✅ 100% | Paginated queries, pagination safety |
| Reorder Suggestions | ✅ 100% | Recent order history lookup |

## Pending Logic Areas

1. **WhatsApp Notifications (TODO_IMPLEMENTATION_REQUIRED)** — Order status change events
   - Location: `controllers/OrderController.ts: createOrder()` (commented out event)
   - Required for: Production deployments with customer communication
   - Depends on: WhatsApp Business API integration

2. **Inventory Reservation (TODO_IMPLEMENTATION_REQUIRED)** — Reserve stock on order creation
   - Location: `repositories/OrderRepository.ts: createOrder()`
   - Current: No stock reservation
   - Future: Lock inventory until order approved/cancelled
   - Integration point: Inventory module stock snapshot

3. **Refill Logic (TODO_IMPLEMENTATION_REQUIRED)** — Automatic reorder suggestion
   - Location: `repositories/OrderRepository.ts: "Implement refill logic based on stock levels"`
   - Depends on: Inventory module thresholds, routing module min order rules

## Key Implementation Details

### State Machine Design
```
pending_approval ──→ approved_for_export ──→ invoiced ──→ dispatched ──→ delivered ──→ closed
                                     │                         └──────────────┬─────────┘
                                     └─────────────────────────────────→ cancelled
```

### Validation Rules
- Minimum order value: ₹1500
- All products must exist in catalogue
- Quantity bounds validation per product
- Duplicate order prevention via idempotency key
- Terminal state checks (no re-processing closed/cancelled)

### Actor Roles
- **admin** — Can approve orders, modify pricing overrides
- **system** — Auto-transitions (e.g., invoice generation)
- **sync_worker** — External system updates (e.g., dispatch notification)

### Audit Trail
- Every transition logged with timestamp, actor, and change details
- Supports compliance requirements for order history

## Architecture Notes
- Uses DDD patterns: Domain entities, value objects, repository pattern
- Comprehensive test coverage for state transitions
- Transactional order creation with all-or-nothing semantics
- Confirmation tokens generated for external references

## Notes
- Min order value (₹1500) is currently hardcoded; should be routing module rule
- Orders table: 30+ columns including audit fields
- Line items stored separately for flexibility
