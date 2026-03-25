# Inventory Module - Summary

## Purpose
Manages product inventory/stock across multiple retail locations. Handles inventory synchronization from external accounting systems (e.g., Tally), stock alerts, and reconciliation.

## Main Entities
- **Inventory Snapshot** — Current stock levels per product per location
- **Sync Job** — Batch import record with status tracking
- **Stock Alert** — Low-stock notifications requiring acknowledgment
- **Product** — Core product with reorder point and lead time

## Active API Routes
- `POST /api/inventory/sync` — Trigger manual batch import from accounting system
- `GET /api/inventory/snapshot/:productId` — Query current stock for product
- `GET /api/inventory/sync-jobs/:syncJobId` — Get status of specific sync batch
- `GET /api/inventory/sync-jobs` — List all sync operations with pagination
- `GET /api/inventory/alerts` — List low-stock alerts for retailers/admins
- `PUT /api/inventory/alerts/:alertId/acknowledge` — Mark alert as reviewed
- `GET /api/inventory/dashboard` — Dashboard aggregations (total stock, alert count)
- `POST /api/inventory/reconciliation` — Trigger manual inventory reconciliation

## Implementation Completion Status

| Component | Status | Notes |
|-----------|--------|-------|
| Batch Import | ✅ 95% | Transactional, idempotent, real |
| Data Source | ⚠️ 40% | Currently mock accounting export |
| Job Tracking | ✅ 100% | Full audit trail, error logging |
| Stock Queries | ✅ 100% | Snapshot table with indexes |
| Alerts | ✅ 100% | Low-stock detection, acknowledgment |
| Reconciliation | ⚠️ 60% | Triggered but uses mock data |
| Scheduled Sync | ⚠️ 40% | Scheduler runs daily, uses mock data |

## Pending Logic Areas

1. **Real Data Source Integration (TODO_IMPLEMENTATION_REQUIRED)** — Accounting system export fetch
   - Location: `scheduler.ts: fetchMockAccountingExport()`, `sync.service.ts`
   - Current: Reads from mock file uploads
   - Blocked on: Tally/accounting system connector implementation
   - Phase: Post-MVP, when real integrations available

2. **Stock Threshold Refinement (TODO_IMPLEMENTATION_REQUIRED)** — Dynamic low-stock levels
   - Location: `sync.service.ts: processBatchImport()` (hardcoded threshold: 100 units)
   - Should move to: Routing module (routing rules + min order thresholds)

3. **Refill Suggestion Logic (TODO_IMPLEMENTATION_REQUIRED)** — Automatic reorder generation
   - Location: `ORDER_REPOSITORY: "Implement refill logic based on stock levels"`
   - Feature: Auto-suggest reorder when stock approaches threshold

## Key Implementation Details
- Batch imports are atomic transactions (all-or-nothing)
- Supports idempotency via batch_id to prevent duplicate processing
- Stock snapshots timestamped for audit
- Alerts require acknowledgment (audit trail)
- Daily scheduler runs at configurable time
- Error handling with full job failure tracking

## Testing Data
- Mock accounting export: `src/modules/inventory/scheduler.ts`
- Low-stock alert threshold: hardcoded to 100 units
- Scheduler currently processes simulated Tally exports

## Notes
- Sync module folder exists but is empty — all sync logic in inventory module
- Consider refactoring to move core sync patterns to dedicated sync module
- Admin dashboard data available via `/api/inventory/dashboard`
