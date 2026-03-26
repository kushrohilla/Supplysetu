# SupplySetu

## Structure

```text
root/
  apps/
    backend/
    mobile/
  packages/
    database/
    types/
    utils/
  infra/
    docker/
  scripts/
```

## Backend

The backend is a Fastify modular monolith in `apps/backend/src`:

```text
core/
  server.ts
  app.ts
  config/
  plugins/
modules/
  auth/
  distributor/
  catalog/
  order/
  inventory/
  pricing/
shared/
  middleware/
  errors/
  constants/
  base-repository.ts
  event-bus.ts
```

Each module follows:

```text
module-name/
  module.controller.ts
  module.service.ts
  module.repository.ts
  module.routes.ts
  module.schema.ts
```

## Local Run

1. Copy `.env.example` to `.env`.
2. Ensure PostgreSQL is running and matches the database values in `.env`.
3. Run `npm install`.
4. Run `npm run migrate:latest`.
5. Run `npm run dev` to start the backend on `http://localhost:3000`.
6. In another terminal run `cd apps/mobile && npm install && npm run start`.
7. Launch the Expo app. Android emulator uses `http://10.0.2.2:3000/api/v1` automatically.

## Notes

- Mobile feature APIs now call backend endpoints instead of local mocks.
- Database runtime config and migrations are centralized in `packages/database`.
- Order placement is transactional in `apps/backend/src/modules/order/module.service.ts`.
