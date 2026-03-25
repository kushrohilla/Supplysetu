# Future Architecture & Speculative Features Index

**Purpose**: This directory contains documents for planned, speculative, and out-of-scope features. These are NOT part of current MVP implementation and should not influence near-term architectural decisions.

**Last Updated**: March 25, 2026  
**Status**: Archive of design documents; NOT ACTIVE DEVELOPMENT

---

## Directory Structure

### 1. **Pilot Program Documents** (8 files)
Detailed planning for pilot/beta program with early retailers

- `pilot-adoption-monitoring-dashboard.md` — Dashboards for adoption metrics
- `pilot-adoption-monitoring-operations-runbook.md` — Operational procedures during pilot
- `pilot-adoption-monitoring-technical.md` — Technical instrumentation for pilot
- `pilot-onboarding-operational-reference.md` — Onboarding procedures for pilot retailers
- `pilot-operational-validation-checklist.md` — Validation checklist for go-live
- `pilot-retailer-onboarding-strategy.md` — Strategy document for pilot retailer selection
- `pilot-salesman-behavioral-reinforcement.md` — Salesman incentive/reinforcement during pilot
- `pilot-scaling-decision-framework.md` — Framework for deciding when to scale beyond pilot

**Status**: Pre-MVP, applies to Phase 2 (post-MVP pilot)

### 2. **SaaS Multi-Tenancy & Enterprise** (8 files)
Long-term SaaS architecture for multi-distributor hosting and enterprise features

- `saas-analytics-aggregation.md` — Cross-tenant analytics platform
- `saas-cloud-deployment-architecture.md` — Kubernetes/cloud deployment patterns
- `saas-distributor-onboarding-flow.md` — Distributor signup and provisioning
- `saas-multi-tenant-foundation.md` — Theoretical multi-tenant database design
- `saas-observability-framework.md` — Monitoring, logging, tracing at scale
- `saas-security-architecture.md` — Enterprise security, compliance, data isolation
- `saas-subscription-management.md` — Billing, subscription tiers, usage tracking

**Status**: Post-MVP, applies to Phase 3+ (SaaS transition)  
**Note**: Current architecture is single-tenant single-distributor

### 3. **Retailer Onboarding Flow** (4 files)
Long-form retailer acquisition and engagement strategy

- `retailer-onboarding-objection-handling.md` — How to handle retailer concerns/objections
- `retailer-onboarding-ux-flows.md` — UX mockups for retailer signup flows
- `retailer-onboarding-workflow.md` — End-to-end onboarding workflow
- `retailer-scoring-segmentation-worksheet.md` — Retailer scoring and segmentation criteria

**Status**: Pre-MVP, applies to go-to-market strategy  
**Note**: Consider for product roadmap, not architecture

### 4. **Admin & Distributor Portal** (5 files)
Frontend and backend for distributor/admin management features

- `admin-onboarding-react-components.md` — React component library for admin
- `admin-onboarding-system-index.md` — Admin system architecture index
- `admin-onboarding-ux-design.md` — UX design patterns for admin portal
- `admin-product-management-api-contract.md` — API specification for product management
- `admin-product-management-architecture.md` — Backend architecture for admin features

**Status**: Post-MVP, applies to Phase 2 (admin portal)  
**Note**: Admin endpoints currently exist but use mock/in-memory data

---

## How to Use This Directory

### For Product Managers / Leadership
- Review pilot documents before planning Phase 2
- Use go-to-market documents for retailer acquisition strategy
- Reference SaaS documents when planning enterprise expansion

### For Developers
- ⚠️ **DO NOT** implement features from these documents without explicit requirement
- ⚠️ **DO NOT** change current architecture to align with future-state documents
- ✅ **DO** refer to these as context when designing APIs that should be extensible
- ✅ **DO** ask about timeline before implementing ideas from these docs

### For Architects
- Review SaaS documents for long-term extensibility needs
- Use as reference for API design decisions (e.g., tenant_id everywhere)
- Plan stepping stones toward SaaS architecture without over-engineering MVP

---

## What's NOT Here

These documents are intentionally NOT speculative:
- ✅ `../architecture.md` — Current architecture (active, use it)
- ✅ `../api-contract.md` — Retailer API contract (active, use it)
- ✅ `../order-state-machine.md` — Order workflow (implemented, use it)
- ✅ `../inventory-integration-guide.md` — Inventory system (active, use it)
- ✅ `../implementation-status.md` — Mobile implementation tracking (active, update it)

---

## Migration Path: When to Extract from Archive

| Decision | Timeline | Action |
|----------|----------|--------|
| Pilot program approved | Before Phase 2 | Extract pilot-* docs to /docs/pilot/ |
| SaaS transition decided | Before Phase 3 | Extract saas-* docs, create detailed implementation plans |
| Admin portal approved | Before Phase 2 | Extract admin-* docs, create backend implementation tasks |
| Retailer acquisition strategy set | Before go-to-market | Extract retailer-onboarding-* docs, create customer journey maps |

---

## Maintenance Notes

**When adding new speculative documents:**
1. Add to appropriate category above
2. Clearly mark timeline and dependencies
3. Explain why it's not in main /docs/ yet
4. Link to this index

**When activating features:**
1. Move document out of future-architecture/
2. Update this index
3. Reference the _why_ it was speculative (helps maintainers understand context)

**Annual Review** (March each year):
- Remove documents that are no longer relevant
- Consolidate overlapping specifications
- Update timelines based on actual progress

---

## Quick Links

- [MVP Implementation Status](../implementation-status.md) — What's currently shipping
- [Architecture Reference](../architecture.md) — How the system works today
- [Retailer API Contract](../api-contract.md) — What retailers can use
- [Developer Quick Reference](../developer-quick-reference.md) — Quick start for developers
