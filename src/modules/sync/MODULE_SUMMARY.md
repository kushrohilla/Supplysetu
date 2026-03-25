# Sync Module - Summary

## Purpose
(PLACEHOLDER - NOT IMPLEMENTED)

Manages external system integrations including accounting sync adapters (Tally, QuickBooks), export/import workflows, retry orchestration, and error recovery for cross-system data synchronization.

## Main Entities
- **Sync Adapter** — External system connector (Tally, QuickBooks, etc.)
- **Sync Pipeline** — ETL workflow for data transformation
- **Retry Policy** — Error recovery and backoff strategy
- **Sync Log** — Audit trail of all integration events

## Active API Routes
None currently. No controller/service implementations.

## Implementation Completion Status

| Component | Status | Notes |
|-----------|--------|-------|
| Adapter Framework | ❌ 0% | Not started |
| Tally Connector | ❌ 0% | Mock data only (in inventory module) |
| Retry Orchestration | ❌ 0% | Not started |
| Error Recovery | ❌ 0% | Not started |
| Integration Routes | ❌ 0% | No routes defined |

## Pending Logic Areas
1. Accounting system adapter interface (pluggable connectors)
2. Tally export parser and data transformer
3. Error handling and partial failure recovery
4. Exponential backoff retry logic
5. Sync status webhooks
6. Dead-letter queue for failed batches

## Current Issues
- **Sync logic misaligned**: Core sync functionality is in `src/modules/inventory/sync.service.ts` instead of this module
- Mock accounting export: `src/modules/inventory/scheduler.ts` contains `fetchMockAccountingExport()`
- Should be: Sync module provides adapters, inventory module consumes them

## Notes
- Module structure created but empty
- Inventory module handles accounting sync with mock data
- Future: Extract adapter pattern and move to sync module
- Will need to support multiple accounting systems (Tally primary)

---

**Status**: BLOCKED - No implementation started. Priority: Low (mock data sufficient for MVP, real integrations post-launch).
