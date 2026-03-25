# Bootstrap Architecture: Quick Reference

## Project Structure

```
src/
├── bootstrap/                 ← NEW: Application initialization
│   ├── app.bootstrap.ts       ← Express setup (middleware, routes)
│   ├── server.bootstrap.ts    ← HTTP server lifecycle
│   └── index.ts               ← Public API
│
├── config/                    ← Centralized configuration
│   ├── env.ts                 ← Environment validation (Zod)
│   ├── logger.config.ts       ← NEW: Logger initialization
│   └── index.ts
│
├── infrastructure/            ← NEW: External service lifecycle
│   ├── database/
│   │   └── database.config.ts ← NEW: Knex pool setup
│   ├── messaging/             ← Placeholder: Bull queue
│   ├── storage/               ← Placeholder: S3/Blob storage
│   └── index.ts               ← Public API
│
├── modules/                   ← Domain modules (unchanged)
├── shared/                    ← Cross-cutting concerns (unchanged)
├── routes/                    ← Route registration (unchanged)
└── database/
    ├── migrations/            ← Schema definitions (unchanged)
    └── knex.ts                ← Legacy singleton (use infrastructure instead)
```

## Initialization Sequence

```
src/server.ts (entry point)
    ↓ (imports & calls)
config/env.ts          ← Env vars validated & loaded once
    ↓
config/logger.config.ts    ← Logger created
    ↓
bootstrap/app.bootstrap.ts ← Express app with middleware setup
    ↓
infrastructure/database/database.config.ts ← Knex pool initialized
    ↓
bootstrap/server.bootstrap.ts ← HTTP server starts, shutdown handlers registered
    ↓
Ready!
```

## Common Tasks

### Starting the Server
```bash
npm run dev     # Hot reload dev server
npm start       # Production (compiled dist/)
```

### Type Checking
```bash
npm run lint    # TypeScript validation
npm run build   # Full compilation
```

### Database
```bash
npm run migrate:make name_of_migration  # Create migration
npm run migrate:latest                  # Apply migrations
npm run migrate:rollback                # Revert last batch
```

## Working with Configuration

### Add a New Environment Variable

1. **Define in `.env` file** (or `.env.example`):
   ```
   MY_NEW_VAR=some_value
   ```

2. **Add to schema** in `src/config/env.ts`:
   ```typescript
   const envSchema = z.object({
     // ... existing vars
     MY_NEW_VAR: z.string().min(1),  // Or z.coerce.number(), etc.
   });
   ```

3. **Use in code**:
   ```typescript
   import { env } from "./config/env";
   
   console.log(env.MY_NEW_VAR);  // TypeScript: autocomplete works!
   ```

### Add a New Infrastructure Service

Example: Redis Cache

1. **Create config** at `src/config/cache.config.ts`:
   ```typescript
   import { createClient } from "redis";
   import { env } from "./env";
   import { logger } from "./logger.config";
   
   export const createCache = () => {
     logger.info("Initializing cache");
     const client = createClient({ host: env.REDIS_HOST });
     return client;
   };
   
   export const closeCache = async (client) => {
     await client.quit();
   };
   ```

2. **Export from infrastructure** in `src/infrastructure/index.ts`:
   ```typescript
   export { createCache, closeCache } from "../config/cache.config";
   ```

3. **Add env vars** to `src/config/env.ts`:
   ```typescript
   REDIS_HOST: z.string().default("localhost"),
   REDIS_PORT: z.coerce.number().default(6379),
   ```

4. **Initialize in bootstrap** at `src/bootstrap/server.bootstrap.ts`:
   ```typescript
   import { createCache } from "../infrastructure";
   
   export const startServer = (options) => {
     // ...
     const cache = createCache();
     return { httpServer, db, cache };
   };
   ```

5. **Use in routes**:
   ```typescript
   // Option A: Pass via app.locals
   app.locals.cache = cache;
   
   // Then in route:
   const cache = req.app.locals.cache;
   ```

## Import Paths

### Getting Configuration

```typescript
// ✅ Do this
import { env } from "../config/env";
import { logger } from "../config/logger.config";

// ❌ Don't do this (outdated)
import { logger } from "../shared/logger";  // Still works, but migrate
```

### Using Bootstrap Functions

```typescript
// ✅ Do this (in new code)
import { bootstrapApp } from "../bootstrap";

// ❌ Don't do this (legacy)
import { createApp } from "../app";  // Still works, but migrate
```

### Database Access

```typescript
// ❌ Don't use global singleton
import { db } from "../database/knex";

// ✅ Do this instead (will refactor to dependency injection)
// For now, db is available at:
app.locals.db  // In route handlers via req.app.locals.db
```

## Error Handling

### Graceful Shutdown
The application automatically catches `SIGINT` (Ctrl+C) and `SIGTERM` (docker stop) signals.

Process:
1. Stop accepting new HTTP connections
2. Close database connection pool
3. Exit with code 0

If shutdown takes >10s (see `SHUTDOWN_TIMEOUT_MS` env var), process force-exits.

### Startup Failures
If ANY required config is missing or initialization fails:
1. Error is logged with full details
2. Process exits with code 1
3. Docker/systemd will restart the container

## Logging

All logs go through Pino (structured JSON logging).

```typescript
import { logger } from "../config/logger.config";

logger.debug({ foo: "bar" }, "This is debug");
logger.info({ userId: 123 }, "User action");
logger.warn({ code: "DEPRECATED" }, "Warning message");
logger.error({ error }, "Error occurred");
```

Log level controlled by `LOG_LEVEL` env var:
- `debug` — Verbose development logging
- `info` — Standard (recommended)
- `warn` — Warnings only
- `error` — Errors only
- `silent` — No logging

## Testing Module Functions

With the new bootstrap structure, testing becomes cleaner:

```typescript
// ✅ Good: Pass dependencies as arguments
async function processOrder(order, db, logger) {
  logger.info({ orderId: order.id }, "Processing");
  await db("orders").update({ status: "done" });
}

// In test:
const mockDb = { /* ... */ };
const mockLogger = { info: () => {} };
await processOrder({ id: 1 }, mockDb, mockLogger);
```

## Deployment Checklist

- [ ] All required env vars set (check `.env` against `src/config/env.ts` schema)
- [ ] Database migrations applied: `npm run migrate:latest`
- [ ] Build succeeds: `npm run build`
- [ ] Application starts: `npm start`
- [ ] Health check responds: `GET /api/v1/health` → 200 OK
- [ ] Graceful shutdown works: Send SIGTERM, verify logs show clean shutdown

## Documentation Files

- `REFACTORING_BOOTSTRAP_MONOLITH.md` — Full architecture & decision record
- `SETUP_GUIDE.md` — Development environment setup
- `README.md` — Project overview
