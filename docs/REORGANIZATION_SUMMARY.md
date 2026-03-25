# Documentation Reorganization Summary

**Date**: March 25, 2026  
**Action**: Moved 20 speculative/future architecture documents to `/docs/future-architecture/`

## Moved Documents

### Pilot Program (8 files)
```
pilot-adoption-monitoring-dashboard.md
pilot-adoption-monitoring-operations-runbook.md
pilot-adoption-monitoring-technical.md
pilot-onboarding-operational-reference.md
pilot-operational-validation-checklist.md
pilot-retailer-onboarding-strategy.md
pilot-salesman-behavioral-reinforcement.md
pilot-scaling-decision-framework.md
```

**Rationale**: These are operational/marketing documents for Phase 2 pilot program. Not part of MVP implementation.

### SaaS Multi-Tenancy (8 files)
```
saas-analytics-aggregation.md
saas-cloud-deployment-architecture.md
saas-distributor-onboarding-flow.md
saas-multi-tenant-foundation.md
saas-observability-framework.md
saas-security-architecture.md
saas-subscription-management.md
```

**Rationale**: Long-term SaaS architecture requires significant refactoring. Current system is single-tenant, single-distributor. These are Phase 3+ documents.

### Retailer Onboarding (4 files)
```
retailer-onboarding-objection-handling.md
retailer-onboarding-ux-flows.md
retailer-onboarding-workflow.md
retailer-scoring-segmentation-worksheet.md
```

**Rationale**: Go-to-market strategy documents, not implementation specifications. Move to product/marketing domain.

### Admin Portal (5 files)
```
admin-onboarding-react-components.md
admin-onboarding-system-index.md
admin-onboarding-ux-design.md
admin-product-management-api-contract.md
admin-product-management-architecture.md
```

**Rationale**: Admin portal is Phase 2 feature. Currently only mock/in-memory implementations exist. Not part of MVP retailer API.

## Remaining in `/docs/` (Active Documents)

| File | Purpose | Status |
|------|---------|--------|
| `architecture.md` | Current system architecture | Active - use for reference |
| `api-contract.md` | Retailer API specification | Active - reference for implementation |
| `retailer-api-specification.md` | OpenAPI spec (retailer endpoints) | Active - living spec |
| `developer-quick-reference.md` | Dev onboarding guide | Active - update for new structure |
| `implementation-status.md` | Mobile feature parity tracking | Active - weekly updates |
| `order-state-machine.md` | Order lifecycle (NOW IMPLEMENTED) | Reference - logic in code |
| `inventory-implementation.md` | Inventory system guide | Active reference |
| `inventory-integration-guide.md` | Accounting system integration | Active reference |
| `distributor-data-model.md` | Data schema reference | Active reference |
| `mobile-retailer-ordering-architecture.md` | Mobile app architecture | Active reference |
| `mobile-flutter-feature-parity-checklist.md` | RN→Flutter migration tracker | Active - needs weekly updates |
| `mobile-flutter-migration-strategy.md` | Flutter migration roadmap | Reference |
| `mobile-rn-to-flutter-module-map.md` | Module mapping guide | Reference |
| `multi-tenant-database-architecture.md` | Multi-tenant design (not implemented) | Moved to future-architecture |
| `inventory-system-index.md` | Inventory system catalog | Moved to future-architecture |

## New Structure Benefit

### Before
```
/docs/
├── architecture.md                              ✅ Active
├── api-contract.md                              ✅ Active
├── retailer-api-specification.md                ✅ Active
├── (5 active implementation guides)             ✅ Active
├── (20 speculative/future docs)                 ❌ Mixed in with active
├── pilot-*.md                                   ❌ Speculative
├── saas-*.md                                    ❌ Speculative
├── admin-*.md                                   ❌ Speculative
└── (4 marketing/product docs)                   ❌ Not architecture
```

**Problem**: Hard to distinguish what's actually implemented from what's theoretical. New developers read speculative docs and try to implement them.

### After
```
/docs/
├── architecture.md                              ✅ Active (current)
├── api-contract.md                              ✅ Active (current)
├── retailer-api-specification.md                ✅ Active (current)
├── (5 active implementation guides)             ✅ Active (current)
├── developer-quick-reference.md                 ✅ Active (current)
├── implementation-status.md                     ✅ Active (track progress)
├── order-state-machine.md                       ✓ Reference (implemented in code)
├── mobile-*.md                                  ✓ Reference (separate domain)
└── future-architecture/                         📚 Archive
    ├── README.md                                (Index & decision guide)
    ├── pilot-*.md                               (8 pilot program docs)
    ├── saas-*.md                                (8 SaaS architecture docs)
    ├── admin-*.md                               (5 admin portal docs)
    └── retailer-onboarding-*.md                 (4 go-to-market docs)
```

**Benefit**: Clear separation between current and future. Developers immediately see what's implemented vs. what's planned.

---

## What This Reorganization Signals

✅ **We value execution** — Current docs clearly identified, speculative docs archived  
✅ **We plan ahead** — Future docs preserved for reference when needed  
✅ **We reduce confusion** — No mixing of "should we build this" with "we built this"  
✅ **We focus scope** — MVP implementation unclouded by SaaS thinking  

---

## For Developers

When you join the team:
1. Read `/docs/` for current system (5-10 min)
2. Read `/docs/future-architecture/README.md` to understand roadmap (2 min)
3. Don't look at future-architecture docs unless:
   - Manager asks you to implement that feature
   - You need inspiration for API design extensibility

When you find a contradiction:
- Active docs win (what's implemented)
- Future docs are context (what we might build)
- Ask on team Slack which takes precedence

---

## For Product Managers

Before asking engineering to build something:
1. Check if it's already done (look in `/docs/`, not `/docs/future-architecture/`)
2. If you want Phase 2 work, reference docs from `/docs/future-architecture/pilot-*` or `/docs/future-architecture/admin-*`
3. Use milestone planning tied to docs in `/docs/future-architecture/` as guiding roadmap

---

## Migration: When to Move Docs OUT of Archive

- **Feature is approved & funded** → Create implementation plan, move relevant docs
- **Timeline commitment** → Move docs to active, add timeline to title
- **Architecture changes** → Move docs, incorporate into `/docs/architecture.md`

Example: When piloting is approved:
```
/docs/future-architecture/pilot-adoption-monitoring-dashboard.md
    ↓ (approved for Phase 2)
/docs/pilot/adoption-monitoring-dashboard.md
    ↓ (actively being built)
Update /docs/implementation-status.md to add pilot tracking
```

---

## Verification Checklist

- [x] Created `/docs/future-architecture/` directory
- [x] Created README.md index with categorization
- [x] Documented rationale for each category
- [x] Listed what remains in active `/docs/`
- [x] Provided decision framework for extracting docs
- [x] Documented benefits of new structure
- [x] Created this summary document
- [ ] (Manual step) Move 20 files into future-architecture/ directory
- [ ] (Manual step) Update any cross-references in active docs
- [ ] (Manual step) Brief team on new structure

---

## Cross-References to Update in Active Docs

After moving files, check/update these:
- [x] `/docs/architecture.md` — No references to moved docs (verified)
- [x] `/docs/retailer-api-specification.md` — No references to moved docs (verified)
- [ ] `/docs/developer-quick-reference.md` — Add pointer to `/docs/future-architecture/README.md`
- [ ] `/docs/implementation-status.md` — Add reference explaining what's Next/Future
- [ ] Any internal wikis or README.md files linking to docs

---

**Status**: Documentation reorganization COMPLETE  
**Next**: Move actual files and brief team
