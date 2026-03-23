# SupplySetu Architecture Foundation

## System Positioning

SupplySetu is a private distributor operations platform for FMCG supply chains. It is a closed-network ordering and workflow coordination system, not a marketplace or public commerce product.

## Operating Constraints

- Tally remains the single source of truth for invoice generation, stock deduction, and payment accounting.
- SupplySetu stores order intent, workflow state, indicative stock, and operational metadata.
- The platform must remain tenant-ready even when deployed for a single distributor.
- The backend starts as a modular monolith and should preserve clean seams for future extraction.
- Reliability takes priority over feature breadth.

## Domain Modules

- `auth`: authentication, identity, JWT issuance, and role enforcement.
- `catalogue`: product catalogue, brands, SKU metadata, and lightweight retailer listing payloads.
- `orders`: order intent capture, workflow orchestration, and lifecycle validation.
- `pricing`: payment-mode-aware pricing, scheme eligibility, and manual override boundaries.
- `routing`: route configuration, minimum order value logic, cutoff evaluation, and delivery scheduling.
- `sync`: Tally/accounting sync adapters, export jobs, confirmation ingestion, and retry-safe idempotent flows.
- `notifications`: transactional notifications and behavioural nudges for retailer adoption.
- `reporting`: admin metrics for digital order adoption, manual coordination reduction, and operational throughput.

## Order Lifecycle Contract

Canonical order states:

- `pending_approval`
- `approved_for_export`
- `invoiced`
- `dispatched`
- `delivered`
- `closed`
- `cancelled`

The application must reject invalid transitions and log operational exceptions. Invoice confirmation from accounting is the point at which stock and financial confirmation become authoritative.

## Data and Integration Boundaries

- Every transactional entity must carry `tenant_id`.
- Retailer-facing stock is indicative only until accounting confirms invoicing.
- Mixed-brand orders are supported inside one order intent.
- Payment mode affects pricing and scheme eligibility.
- Route and cutoff configuration influence delivery promise windows.
- Manual overrides must be auditable.

## Deployment Baseline

- Containerised backend service
- Managed PostgreSQL
- Reverse proxy or load balancer
- Structured logs and health checks
- Single-region deployment to start, with config surface for future multi-tenant SaaS operation

## Delivery Discipline

Phasing:

1. Foundation and schema
2. Order capture MVP
3. Accounting sync reliability
4. Behaviour and notification optimisation
5. SaaS scalability enhancements
