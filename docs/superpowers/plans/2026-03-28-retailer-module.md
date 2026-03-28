# Retailer Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tenant-scoped retailer management module with authenticated CRUD APIs, PostgreSQL persistence, tenant isolation, and migration support.

**Architecture:** Add a dedicated `retailer` backend module wired into the existing Fastify container and API prefix. The controller will read `tenantId` only from JWT auth, the service will own business rules and not-found behavior, and the repository will enforce tenant-scoped queries on the `retailers` table. A migration will create or safely replace legacy table usage with the new UUID + tenant model.

**Tech Stack:** Fastify, Knex, PostgreSQL, Zod, Vitest, TypeScript

---

### Task 1: Write Retailer Route Tests

**Files:**
- Create: `src/retailer-routes.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AppContainer } from "../apps/backend/src/core/config/container";
import { registerRetailerRoutes } from "../apps/backend/src/modules/retailer/retailer.routes";
import { errorHandler } from "../apps/backend/src/shared/middleware/error-handler";

const createContainer = () =>
  ({
    authService: {
      verifyAccessToken: vi.fn(),
    },
    retailerService: {
      createRetailer: vi.fn(),
      listRetailers: vi.fn(),
      getRetailer: vi.fn(),
      updateRetailer: vi.fn(),
      softDeleteRetailer: vi.fn(),
    },
  }) as unknown as AppContainer;

describe("retailer routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a retailer using tenantId from auth instead of request body", async () => {
    const container = createContainer();
    const authService = container.authService as unknown as { verifyAccessToken: ReturnType<typeof vi.fn> };
    const retailerService = container.retailerService as unknown as { createRetailer: ReturnType<typeof vi.fn> };

    authService.verifyAccessToken.mockReturnValue({
      userId: "user-1",
      tenantId: "tenant-1",
      tokenType: "admin",
      role: "distributor_admin",
    });
    retailerService.createRetailer.mockResolvedValue({ id: "retailer-1", name: "Shop 1", mobile_number: "9999999999" });

    const app = fastify();
    app.decorate("container", container);
    app.setErrorHandler(errorHandler);
    await registerRetailerRoutes(app);

    const response = await app.inject({
      method: "POST",
      url: "/retailers",
      headers: { authorization: "Bearer admin-token" },
      payload: {
        tenant_id: "tenant-2",
        name: "Shop 1",
        mobile_number: "9999999999",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(retailerService.createRetailer).toHaveBeenCalledWith("tenant-1", {
      name: "Shop 1",
      mobile_number: "9999999999",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/retailer-routes.test.ts`

Expected: FAIL because `../apps/backend/src/modules/retailer/retailer.routes` does not exist yet.

- [ ] **Step 3: Write minimal route implementation**

Create `apps/backend/src/modules/retailer/retailer.routes.ts`, `retailer.controller.ts`, and `retailer.schema.ts` with authenticated CRUD routes under `/retailers`, controller methods that read `request.auth?.tenantId`, and Zod body/query validation that excludes `tenant_id` from client input.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/retailer-routes.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/retailer-routes.test.ts apps/backend/src/modules/retailer/retailer.routes.ts apps/backend/src/modules/retailer/retailer.controller.ts apps/backend/src/modules/retailer/retailer.schema.ts
git commit -m "test: add retailer route coverage"
```

### Task 2: Add Retailer Service Tests

**Files:**
- Create: `src/retailer-service.test.ts`
- Create: `apps/backend/src/modules/retailer/retailer.service.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";

import { RetailerService } from "../apps/backend/src/modules/retailer/retailer.service";

describe("RetailerService", () => {
  it("throws when a tenant tries to fetch a retailer from another tenant", async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue(null),
    };

    const service = new RetailerService(repository as never);

    await expect(service.getRetailer("tenant-1", "retailer-2")).rejects.toMatchObject({
      code: "RETAILER_NOT_FOUND",
    });
    expect(repository.findById).toHaveBeenCalledWith("tenant-1", "retailer-2");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/retailer-service.test.ts`

Expected: FAIL because `RetailerService` does not exist yet.

- [ ] **Step 3: Write minimal service implementation**

Implement `RetailerService` methods:
- `createRetailer(tenantId, payload)`
- `listRetailers(tenantId)`
- `getRetailer(tenantId, retailerId)` with `AppError(404, "RETAILER_NOT_FOUND", ...)`
- `updateRetailer(tenantId, retailerId, payload)` with 404 when missing
- `softDeleteRetailer(tenantId, retailerId)` with 404 when missing

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/retailer-service.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/retailer-service.test.ts apps/backend/src/modules/retailer/retailer.service.ts
git commit -m "test: add retailer service tenant isolation"
```

### Task 3: Build the Retailer Repository and Migration

**Files:**
- Create: `apps/backend/src/modules/retailer/retailer.repository.ts`
- Create: `packages/database/migrations/202603280002_create_tenant_scoped_retailers.ts`

- [ ] **Step 1: Write the failing test**

Extend `src/retailer-service.test.ts` or `src/retailer-routes.test.ts` with expectations that service/repository payloads include fields:
- `name`
- `owner_name`
- `mobile_number`
- `gst_number`
- `address_line1`
- `city`
- `state`
- `pincode`
- `is_active`

and that delete becomes a soft delete.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/retailer-service.test.ts src/retailer-routes.test.ts`

Expected: FAIL because repository methods and persistence behavior are missing.

- [ ] **Step 3: Write minimal repository and migration**

Implement repository methods:
- `create(tenantId, payload)`
- `listByTenant(tenantId)`
- `findById(tenantId, id)`
- `update(tenantId, id, payload)`
- `softDelete(tenantId, id)`

Migration requirements:
- create `retailers` table if absent with UUID `id` primary key and UUID `tenant_id`
- indexes for `tenant_id`, `mobile_number`, and `tenant_id + is_active`
- if a legacy `retailers` table exists without `tenant_id`, rename it to `retailers_legacy_backup` before creating the new table

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/retailer-service.test.ts src/retailer-routes.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/retailer/retailer.repository.ts packages/database/migrations/202603280002_create_tenant_scoped_retailers.ts src/retailer-service.test.ts src/retailer-routes.test.ts
git commit -m "feat: add retailer persistence"
```

### Task 4: Wire the Module Into the App

**Files:**
- Modify: `apps/backend/src/core/config/container.ts`
- Modify: `apps/backend/src/core/app.ts`

- [ ] **Step 1: Write the failing test**

Add a route registration assertion in `src/retailer-routes.test.ts` or a new app wiring test that mounts the full app and expects `/api/v1/retailers` to exist once auth passes.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/retailer-routes.test.ts`

Expected: FAIL because the module is not yet in the container or app registration.

- [ ] **Step 3: Write minimal wiring**

Update the app container to construct the retailer repository/service and expose `retailerService`. Register `registerRetailerRoutes` inside the existing `env.API_PREFIX` block in `apps/backend/src/core/app.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/retailer-routes.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/core/config/container.ts apps/backend/src/core/app.ts src/retailer-routes.test.ts
git commit -m "feat: register retailer module"
```

### Task 5: Final Verification

**Files:**
- Verify: `src/retailer-routes.test.ts`
- Verify: `src/retailer-service.test.ts`
- Verify: `apps/backend/src/modules/retailer/*`
- Verify: `packages/database/migrations/202603280002_create_tenant_scoped_retailers.ts`

- [ ] **Step 1: Run focused retailer tests**

Run: `npm test -- src/retailer-routes.test.ts src/retailer-service.test.ts`

Expected: PASS

- [ ] **Step 2: Run full test suite**

Run: `npm test`

Expected: PASS

- [ ] **Step 3: Run type checking**

Run: `npm run lint`

Expected: PASS

- [ ] **Step 4: Review changed files**

Run: `git diff --name-status`

Expected: only retailer module, migration, wiring, and test changes

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/retailer apps/backend/src/core/config/container.ts apps/backend/src/core/app.ts packages/database/migrations/202603280002_create_tenant_scoped_retailers.ts src/retailer-routes.test.ts src/retailer-service.test.ts
git commit -m "feat: add tenant-scoped retailer module"
```
