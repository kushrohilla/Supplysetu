# SupplySetu Backend

Production-ready backend scaffold for a private distributor operations platform.

## Stack

- Node.js + TypeScript
- Express REST API
- PostgreSQL
- Knex migrations
- Pino structured logging

## Structure

```text
src/
  config/
  database/
    migrations/
  modules/
    auth/
    catalogue/
    orders/
    pricing/
    routing/
    sync/
    notifications/
    reporting/
  routes/
  shared/
    controllers/
    errors/
    logger/
    middleware/
    types/
    utils/
docs/
  architecture.md
  api-contract.md
  mobile-architecture.md
apps/
  mobile/
```

## Commands

```bash
npm install
cp .env.example .env
npm run migrate:latest
npm run dev
```

## Notes

- All business modules are placeholders only, but the domain boundaries now reflect the intended production system.
- `GET /api/v1/health` verifies API and database readiness.
- CORS allowlist defaults are configured through `CORS_ORIGINS` in `.env`.
- Tenant awareness starts at the schema layer with the `tenants` table and tenant-scoped records.
- Tally remains the financial and stock source of truth; SupplySetu owns workflow intent and operational state.
- Order lifecycle contracts are defined in [order-transition-rules.ts](d:/Supplysetu/src/modules/orders/domain/order-transition-rules.ts).
- Order workflow behaviour and invalid transition responses are documented in [order-state-machine.md](d:/Supplysetu/docs/order-state-machine.md).
- The versioned REST contract is documented in [api-contract.md](d:/Supplysetu/docs/api-contract.md).
- The mobile app foundation is documented in [mobile-architecture.md](d:/Supplysetu/docs/mobile-architecture.md).
- The architectural baseline is documented in [architecture.md](d:/Supplysetu/docs/architecture.md).
