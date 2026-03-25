# Routing Module - Summary

## Purpose
(PLACEHOLDER - NOT IMPLEMENTED)

Manages route assignment, delivery scheduling, order cutoff evaluation, and enforcement of route-based minimum order rules and delivery zone constraints.

## Main Entities
- **Route** — Delivery route with associated retailers
- **Route Schedule** — Day/time cutoff and delivery time windows
- **Delivery Zone** — Geographic area grouping  
- **Route Minimum Order** — Min order value by route
- **Delivery Constraint** — Rules for acceptable orders on route

## Active API Routes
None currently. No controller/service implementations.

## Implementation Completion Status

| Component | Status | Notes |
|-----------|--------|-------|
| Route Management | ❌ 0% | Not started |
| Order Cutoff Logic | ❌ 0% | Not started |
| Zone Assignment | ❌ 0% | Not started |
| Delivery Scheduling | ❌ 0% | Not started |
| Route Min Order | ❌ 0% | Not started (min order currently hardcoded in orders module) |

## Pending Logic Areas
1. Route assignment based on retailer location
2. Order cutoff time validation (don't accept orders after route cutoff)
3. Dynamic min order value per route
4. Delivery window calculation
5. Route optimization and truck capacity planning
6. Zone-based delivery constraint validation

## Current Hardcoded Values To Migrate
- Min order value: ₹1500 (hardcoded in `src/modules/orders/repositories/OrderRepository.ts`)
- Low stock threshold: 100 units (hardcoded in `src/modules/inventory/sync.service.ts`)

These should become routing module rules with database configuration.

## Notes
- Module structure created but empty
- Orders module should call routing module to validate before accepting order
- Inventory module low-stock threshold should coordinate with routing
- Future: Integrate with geolocation/mapping services for route optimization

---

**Status**: BLOCKED - No implementation started. Priority: High (MVP needs min order validation, cutoff times).
