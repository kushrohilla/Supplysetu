# Pricing Module - Summary

## Purpose
(PLACEHOLDER - NOT IMPLEMENTED)

Manages product pricing rules, payment-mode-aware pricing (cash vs. credit), scheme eligibility, and override-safe pricing evaluation.

## Main Entities
- **Price Tier** — Base pricing vs. advance pricing (cash discount)
- **Pricing Scheme** — Payment-mode-specific pricing rules
- **Eligibility Rule** — Conditions for tier eligibility (volume, customer segment)
- **Price Override** — Exception handling with audit trail

## Active API Routes
None currently. No controller/service implementations.

## Implementation Completion Status

| Component | Status | Notes |
|-----------|--------|-------|
| Tier Management | ❌ 0% | Not started |
| Scheme Logic | ❌ 0% | Not started |
| Eligibility Rules | ❌ 0% | Not started |
| Override Handling | ❌ 0% | Not started |
| Pricing API | ❌ 0% | No routes defined |

## Pending Logic Areas
1. Price tier evaluation service
2. Payment-mode pricing lookup (cash discount calculation)
3. Scheme eligibility checker
4. Override validation and audit logging
5. Admin pricing management API
6. Bulk pricing updates

## Current Integration Points
- Orders module currently hardcodes `advance_price` vs `base_price` lookup
- Min order value (₹1500) hardcoded in orders module; should be pricing rule
- Routing module should validate pricing rules

## Notes
- Module structure created but empty
- Currently, orders module queries product.base_price directly
- No pricing schemes or tiers implemented; future scope
- Placeholder for payment-mode flexibility (cash vs. credit terms)

---

**Status**: BLOCKED - No implementation started. Priority: Medium (can use simple price tables initially).
