# SaaS Multi-Tenant Foundation Architecture

## 1. Overview

Transform SupplySetu from single-distributor instance to multi-tenant SaaS platform with complete tenant isolation, scoped data access, and tenant lifecycle management.

### Current State
- Single distributor instance (monolithic)
- All data commingled in shared schema
- No tenant segregation
- Single authentication/authorization context

### Target State
- N distributors (tenants) running simultaneously
- Tenant-scoped data in logical/physical boundaries
- Tenant-specific configuration
- Multi-stage tenant lifecycle (signup → trial → active → suspended → inactive)

---

## 2. Tenant Data Model

### Core Tenant Table
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  slug VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(64) UNIQUE NOT NULL,
  
  -- Business Profile
  business_legal_name VARCHAR(255),
  business_type ENUM('distributor', 'super_distributor', 'wholesaler'),
  gst_no VARCHAR(20) UNIQUE,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(20),
  country VARCHAR(2) DEFAULT 'IN',
  
  -- Lifecycle State
  status ENUM('trial', 'active', 'suspended', 'archived') DEFAULT 'trial',
  
  -- Timeline
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  activated_at TIMESTAMP,
  suspended_at TIMESTAMP,
  archived_at TIMESTAMP,
  
  -- Limits (configurable per subscription plan)
  max_retailers_allowed INT DEFAULT 500,
  max_api_calls_per_month INT DEFAULT 100000,
  max_concurrent_users INT DEFAULT 10,
  
  -- On/Off Features
  features_enabled JSONB DEFAULT '{
    "assisted_ordering": true,
    "retailer_insights": true,
    "route_optimization": false,
    "advanced_analytics": false,
    "custom_webhooks": false
  }'::jsonb,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Soft Delete
  deleted_at TIMESTAMP,
  
  -- Index for lookups
  UNIQUE(subdomain, deleted_at),
  UNIQUE(slug, deleted_at)
);

-- Indices
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
```

### Tenant Admin User (Master Account)
```sql
CREATE TABLE tenant_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Auth
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  
  -- Profile
  full_name VARCHAR(255),
  phone VARCHAR(20),
  
  -- State
  is_active BOOLEAN DEFAULT true,
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret_encrypted TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,
  password_changed_at TIMESTAMP,
  
  -- Unique constraint per tenant
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_tenant_admins_tenant ON tenant_admins(tenant_id);
CREATE INDEX idx_tenant_admins_email ON tenant_admins(email);
```

### Tenant Provisioning State Machine
```sql
CREATE TABLE tenant_provisioning_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- State Progression
  current_step ENUM(
    'signup_complete',
    'profile_setup_pending',
    'profile_setup_complete',
    'route_config_pending',
    'route_config_complete',
    'sku_import_pending',
    'sku_import_complete',
    'retailer_upload_pending',
    'retailer_upload_complete',
    'go_live_ready'
  ) DEFAULT 'signup_complete',
  
  -- Progress Tracking
  steps_completed JSONB DEFAULT '{
    "signup": false,
    "profile": false,
    "route_config": false,
    "sku_import": false,
    "retailer_upload": false
  }'::jsonb,
  
  -- Timestamps per step
  step_timestamps JSONB DEFAULT '{}'::jsonb,
  
  -- Validation errors (if blocked)
  validation_errors JSONB DEFAULT '{}'::jsonb,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);
```

---

## 3. Tenant Context Middleware

### Express Middleware: Extract & Validate Tenant Context

```typescript
// src/middleware/tenant-context.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../services/tenant.service';

export interface TenantRequest extends Request {
  tenantId: string;
  tenant: {
    id: string;
    slug: string;
    status: 'trial' | 'active' | 'suspended';
    max_retailers_allowed: number;
    features_enabled: Record<string, boolean>;
  };
}

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenant?: any;
    }
  }
}

export const tenantContextMiddleware = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract tenant identifier from request
    const tenantId = extractTenantId(req);

    if (!tenantId) {
      return res.status(401).json({
        error: 'Tenant context missing',
        code: 'TENANT_CONTEXT_MISSING'
      });
    }

    // Validate tenant exists & is active
    const tenant = await TenantService.getTenantById(tenantId);

    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found',
        code: 'TENANT_NOT_FOUND'
      });
    }

    // Check tenant status
    if (tenant.status === 'suspended') {
      return res.status(503).json({
        error: 'Tenant account suspended',
        code: 'TENANT_SUSPENDED',
        metadata: { suspended_at: tenant.suspended_at }
      });
    }

    if (tenant.status === 'archived') {
      return res.status(404).json({
        error: 'Tenant account archived',
        code: 'TENANT_ARCHIVED'
      });
    }

    // Attach to request context
    req.tenantId = tenant.id;
    req.tenant = {
      id: tenant.id,
      slug: tenant.slug,
      status: tenant.status,
      max_retailers_allowed: tenant.max_retailers_allowed,
      features_enabled: tenant.features_enabled
    };

    // Inject tenant_id into request locals for logging
    res.locals.tenantId = tenant.id;

    next();
  } catch (error) {
    console.error('Tenant context extraction failed:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'TENANT_CONTEXT_ERROR'
    });
  }
};

// Extract tenant from: subdomain, header, or JWT
function extractTenantId(req: TenantRequest): string | null {
  // Priority 1: X-Tenant-ID header (API requests)
  const headerTenant = req.header('X-Tenant-ID');
  if (headerTenant) return headerTenant;

  // Priority 2: Subdomain (web requests - subdomain.supplysetu.com)
  const subdomain = extractSubdomain(req.hostname);
  if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
    return subdomain; // Will be resolved to tenant_id via TenantService
  }

  // Priority 3: JWT token (mobile app)
  const token = extractTokenFromAuthHeader(req);
  if (token) {
    const decoded = verifyAndDecodeJWT(token);
    return decoded?.tenant_id;
  }

  return null;
}

function extractSubdomain(hostname: string): string | null {
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }
  return null;
}
```

### Tenant Service: Resolution & Caching

```typescript
// src/services/tenant.service.ts

import NodeCache from 'node-cache';

const TENANT_CACHE = new NodeCache({ stdTTL: 3600 }); // 1 hour cache

export class TenantService {
  /**
   * Get tenant by ID with caching
   * Fails fast if tenant not found or suspended
   */
  static async getTenantById(tenantId: string) {
    // Check cache first
    const cached = TENANT_CACHE.get(tenantId);
    if (cached) return cached;

    const tenant = await db.query(
      `SELECT * FROM tenants WHERE id = $1 AND deleted_at IS NULL`,
      [tenantId]
    );

    if (!tenant.rows.length) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const tenantRecord = tenant.rows[0];

    // Cache for fast subsequent lookups
    TENANT_CACHE.set(tenantId, tenantRecord);

    return tenantRecord;
  }

  /**
   * Resolve subdomain to tenant ID
   */
  static async getTenantBySubdomain(subdomain: string) {
    const cacheKey = `subdomain:${subdomain}`;
    const cached = TENANT_CACHE.get(cacheKey);
    if (cached) return cached;

    const tenant = await db.query(
      `SELECT id, status, name FROM tenants WHERE subdomain = $1 AND deleted_at IS NULL LIMIT 1`,
      [subdomain]
    );

    if (!tenant.rows.length) {
      return null;
    }

    TENANT_CACHE.set(cacheKey, tenant.rows[0]);
    return tenant.rows[0];
  }

  /**
   * Invalidate cache (called on tenant updates)
   */
  static invalidateCache(tenantId: string) {
    TENANT_CACHE.del(tenantId);
  }
}
```

---

## 4. Query Isolation: Tenant-Scoped Data Access

### Base Query Builder with Automatic Tenant Filter

```typescript
// src/database/query-builder.ts

export class TenantScopedQuery {
  /**
   * Every query MUST include tenant_id filter
   * Violations throw at runtime
   */
  static buildQuery(
    baseQuery: string,
    tenantId: string,
    params: any[] = [],
    allowedUnscoped: boolean = false
  ) {
    // Validate query doesn't already have tenant filter (prevent duplicates)
    if (baseQuery.toLowerCase().includes('tenant_id')) {
      // Already scoped
      return { query: baseQuery, params };
    }

    // All main tables MUST have tenant_id column
    const tablesRequiringScope = [
      'retailers',
      'orders',
      'invoices',
      'payments',
      'routes',
      'skus',
      'notifications',
      'audit_logs'
    ];

    // Detect which table is primary in FROM clause
    const fromMatch = baseQuery.match(/FROM\s+(\w+)/i);
    const table = fromMatch?.[1];

    if (!allowedUnscoped && tablesRequiringScope.includes(table)) {
      // Auto-inject tenant_id WHERE clause
      const scopedQuery = appendWhereClause(baseQuery, `tenant_id = $${params.length + 1}`);
      return {
        query: scopedQuery,
        params: [...params, tenantId]
      };
    }

    return { query: baseQuery, params };
  }
}

// Usage in repositories
export class RetailerRepository {
  static async getRetailers(tenantId: string, limit: number = 50) {
    const { query, params } = TenantScopedQuery.buildQuery(
      `SELECT * FROM retailers LIMIT $1`,
      tenantId,
      [limit]
    );
    return db.query(query, params);
  }

  static async getRetailerById(tenantId: string, retailerId: string) {
    const { query, params } = TenantScopedQuery.buildQuery(
      `SELECT * FROM retailers WHERE id = $1`,
      tenantId,
      [$1: retailerId]
    );
    return db.query(query, params);
  }
}
```

### Database Schema: Add tenant_id to ALL data tables

```sql
-- Retrofit existing tables
ALTER TABLE retailers ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE orders ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE invoices ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE payments ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE routes ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE skus ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE notification_preferences ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE audit_logs ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;

-- Create composite indices to ensure query efficiency + isolation
CREATE INDEX idx_retailers_tenant_id ON retailers(tenant_id, id);
CREATE INDEX idx_orders_tenant_id ON orders(tenant_id, created_at);
CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id, status);
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id, status);
CREATE INDEX idx_skus_tenant_id ON skus(tenant_id, sku_code);
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id, created_at);

-- Add constraint: prevent accidental query execution without tenant filter
-- (Alternative: use RLS - Row Level Security in PostgreSQL)
```

---

## 5. Tenant Configuration Storage

### Tenant Config Hierarchy

```typescript
// src/models/tenant-config.model.ts

export interface TenantConfig {
  branding: {
    logo_url: string;
    brand_color: string;
    app_name: string;
  };
  integrations: {
    payment_gateway: 'razorpay' | 'stripe' | 'local';
    sms_provider: 'twilio' | 'local' | 'aws_sns';
    email_provider: 'sendgrid' | 'aws_ses';
  };
  operational: {
    retailer_credit_limit: number;
    order_minimum_value: number;
    order_maximum_value: number;
    payment_terms_days: number;
    auto_approve_orders: boolean;
  };
  feature_flags: Record<string, boolean>;
}

// Storage: tenant_configs table
CREATE TABLE tenant_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Configuration as JSON
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Versioning (audit trail)
  version INT DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES tenant_admins(id),
  
  -- Soft history
  config_history JSONB[] DEFAULT ARRAY[]::jsonb[]
);

CREATE INDEX idx_tenant_configs_tenant ON tenant_configs(tenant_id);
```

### Config Retrieval Service

```typescript
// src/services/tenant-config.service.ts

export class TenantConfigService {
  private static configCache = new Map<string, TenantConfig>();

  static async getConfig(tenantId: string): Promise<TenantConfig> {
    // In-memory cache (5 min TTL)
    const cached = this.configCache.get(tenantId);
    if (cached) return cached;

    const result = await db.query(
      `SELECT config FROM tenant_configs WHERE tenant_id = $1`,
      [tenantId]
    );

    if (!result.rows.length) {
      return this.getDefaultConfig();
    }

    const config = result.rows[0].config;
    this.configCache.set(tenantId, config);

    // Expire cache after 5 minutes
    setTimeout(() => this.configCache.delete(tenantId), 5 * 60 * 1000);

    return config;
  }

  static async updateConfig(
    tenantId: string,
    updates: Partial<TenantConfig>,
    updatedBy: string
  ) {
    // Validate updates against schema
    const schema = this.getConfigSchema();
    const validation = ajv.validate(schema, updates);

    if (!validation) {
      throw new Error(`Invalid config: ${ajv.errorsText()}`);
    }

    // Version the previous config
    await db.query(
      `UPDATE tenant_configs 
       SET config_history = array_append(config_history, config),
           version = version + 1
       WHERE tenant_id = $1`,
      [tenantId]
    );

    // Update with new config
    await db.query(
      `UPDATE tenant_configs 
       SET config = jsonb_set(config, '{...}', $1),
           updated_at = CURRENT_TIMESTAMP,
           updated_by = $2
       WHERE tenant_id = $3`,
      [
        JSON.stringify(updates),
        updatedBy,
        tenantId
      ]
    );

    // Invalidate cache
    this.configCache.delete(tenantId);
  }

  private static getDefaultConfig(): TenantConfig {
    return {
      branding: {
        logo_url: 'https://cdn.supplysetu.com/default-logo.png',
        brand_color: '#2563EB',
        app_name: 'SupplySetu'
      },
      integrations: {
        payment_gateway: 'razorpay',
        sms_provider: 'twilio',
        email_provider: 'sendgrid'
      },
      operational: {
        retailer_credit_limit: 50000,
        order_minimum_value: 500,
        order_maximum_value: 500000,
        payment_terms_days: 7,
        auto_approve_orders: false
      },
      feature_flags: {}
    };
  }
}
```

---

## 6. Tenant Provisioning Workflow

### Step 1: Tenant Signup (Create Tenant Record)

```typescript
// src/services/tenant-provisioning.service.ts

export class TenantProvisioningService {
  static async signup(input: {
    email: string;
    password: string;
    business_name: string;
    business_type: string;
    contact_phone?: string;
  }) {
    // Validate inputs
    if (!input.email || !input.password || !input.business_name) {
      throw new Error('Missing required fields');
    }

    // Check email/tenant uniqueness
    const existing = await db.query(
      `SELECT id FROM tenant_admins WHERE email = $1`,
      [input.email]
    );

    if (existing.rows.length) {
      throw new Error('Email already registered');
    }

    // Generate tenant slug from business name
    const slug = this.generateSlug(input.business_name);
    const subdomain = slug;

    // Transaction: Create tenant + admin user
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // 1. Create tenant
      const tenantResult = await client.query(
        `INSERT INTO tenants (name, slug, subdomain, business_legal_name, business_type, contact_email, contact_phone, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'trial')
         RETURNING id`,
        [
          input.business_name,
          slug,
          subdomain,
          input.business_name,
          input.business_type,
          input.email,
          input.contact_phone
        ]
      );

      const tenantId = tenantResult.rows[0].id;

      // 2. Create tenant admin
      const passwordHash = await bcrypt.hash(input.password, 10);
      await client.query(
        `INSERT INTO tenant_admins (tenant_id, email, password_hash, full_name, is_active)
         VALUES ($1, $2, $3, $4, true)`,
        [tenantId, input.email, passwordHash, input.business_name]
      );

      // 3. Create provisioning state
      await client.query(
        `INSERT INTO tenant_provisioning_state (tenant_id, current_step)
         VALUES ($1, 'signup_complete')`,
        [tenantId]
      );

      // 4. Create default config
      await client.query(
        `INSERT INTO tenant_configs (tenant_id, config)
         VALUES ($1, $2)`,
        [tenantId, JSON.stringify(TenantConfigService.getDefaultConfig())]
      );

      await client.query('COMMIT');

      // Log event
      await this.auditLog(tenantId, 'TENANT_CREATED', 'signup_complete', { email: input.email });

      return { tenant_id: tenantId, slug, subdomain };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async advanceProvisioningStep(
    tenantId: string,
    nextStep: string,
    data: any
  ) {
    // Validate prerequisite steps completed
    const currentState = await db.query(
      `SELECT current_step, steps_completed FROM tenant_provisioning_state WHERE tenant_id = $1`,
      [tenantId]
    );

    const state = currentState.rows[0];
    const stepsCompleted = state.steps_completed;

    // Flow validation: must complete steps in order
    const stepOrder = [
      'signup_complete',
      'profile_setup_complete',
      'route_config_complete',
      'sku_import_complete',
      'retailer_upload_complete',
      'go_live_ready'
    ];

    const currentIndex = stepOrder.indexOf(state.current_step);
    const nextIndex = stepOrder.indexOf(nextStep);

    if (nextIndex <= currentIndex) {
      throw new Error(`Cannot go backwards in provisioning (${state.current_step} → ${nextStep})`);
    }

    // Update state
    await db.query(
      `UPDATE tenant_provisioning_state
       SET current_step = $1,
           steps_completed = jsonb_set(steps_completed, $2, 'true'),
           step_timestamps = jsonb_set(step_timestamps, $3, $4),
           updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $5`,
      [
        nextStep,
        `{${nextStep.split('_')[0]}}`,
        `{${nextStep}}`,
        new Date().toISOString(),
        tenantId
      ]
    );

    await this.auditLog(tenantId, 'PROVISIONING_STEP_ADVANCED', nextStep, data);
  }

  private static generateSlug(businessName: string): string {
    return businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 32);
  }

  private static async auditLog(
    tenantId: string,
    action: string,
    details: string,
    metadata: any
  ) {
    await db.query(
      `INSERT INTO audit_logs (tenant_id, action, details, metadata, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [tenantId, action, details, JSON.stringify(metadata)]
    );
  }
}
```

---

## 7. Tenant Isolation Guarantees

### Anti-Patterns: What NOT to Do

```typescript
// ❌ WRONG: No tenant context
const retailers = await db.query(`SELECT * FROM retailers LIMIT 10`);
// Risk: Returns retailers from ANY tenant

// ❌ WRONG: Client-side filtering (trust user input)
const tenantId = req.query.tenant_id; // User can modify in browser
const retailers = await db.query(`SELECT * FROM retailers WHERE tenant_id = $1`, [tenantId]);
// Risk: User can request any tenant_id parameter

// ❌ WRONG: Weak isolation
const retailers = await getAllRetailers(); // Generic helper without tenant context
// Risk: Long-term maintenance nightmare; easy to miss tenant_id in new queries
```

### Correct Pattern: Server-Enforced Isolation

```typescript
// ✅ CORRECT: Using middleware + enforced tenant context
export const getRetailers = async (req: TenantRequest, res: Response) => {
  // tenantId extracted from middleware (req.tenantId)
  // Cannot be spoofed from client
  
  const { query, params } = TenantScopedQuery.buildQuery(
    `SELECT * FROM retailers WHERE is_active = true ORDER BY created_at DESC LIMIT $1`,
    req.tenantId,
    [50]
  );
  
  const result = await db.query(query, params);
  res.json(result.rows);
};

// ✅ CORRECT: Database-level enforcement via Row Level Security (PostgreSQL 9.5+)
CREATE POLICY retailer_tenant_isolation ON retailers
USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE retailers ENABLE ROW LEVEL SECURITY;
```

### Test: Verify Tenant Isolation

```typescript
// src/__tests__/tenant-isolation.test.ts

describe('Tenant Isolation', () => {
  it('should not allow querying retailer from different tenant', async () => {
    const tenant1 = await createTestTenant('tenant1');
    const tenant2 = await createTestTenant('tenant2');

    const retailer1 = await createTestRetailer(tenant1.id, 'Shop A');
    const retailer2 = await createTestRetailer(tenant2.id, 'Shop B');

    // Tenant 1 tries to access Tenant 2's retailer
    const req = {
      tenantId: tenant1.id,
      tenant: { id: tenant1.id }
    };

    const result = await RetailerRepository.getRetailerById(tenant1.id, retailer2.id);
    expect(result.rows.length).toBe(0); // Empty result
  });

  it('should isolate orders per tenant', async () => {
    const tenant1 = await createTestTenant('tenant1');
    const tenant2 = await createTestTenant('tenant2');

    const order1 = await createTestOrder(tenant1.id, { amount: 10000 });
    const order2 = await createTestOrder(tenant2.id, { amount: 20000 });

    const tenant1Orders = await db.query(
      `SELECT SUM(amount) as total FROM orders WHERE tenant_id = $1`,
      [tenant1.id]
    );

    expect(tenant1Orders.rows[0].total).toBe(10000);
  });
});
```

---

## 8. Horizontal Scaling Readiness

### Architecture: Tenant-Agnostic Service Layer

```typescript
// src/services/order.service.ts

/**
 * Order service designed for horizontal scaling:
 * - No shared in-memory state
 * - All context passed via parameters
 * - No global singletons
 */
export class OrderService {
  static async createOrder(
    tenantId: string,
    retailerId: string,
    payload: OrderPayload
  ) {
    // Validate retailer belongs to tenant
    const retailer = await RetailerRepository.getRetailerById(tenantId, retailerId);
    if (!retailer) throw new Error('Retailer not found');

    // Create order
    const order = await OrderRepository.create(tenantId, {
      ...payload,
      retailer_id: retailerId
    });

    // Publish event (async, service-independent)
    await EventBus.publish('order.created', {
      tenantId,
      orderId: order.id,
      retailerId,
      amount: order.total_amount
    });

    return order;
  }
}

// EventBus: Pub/Sub independent of instance
export class EventBus {
  static async publish(eventType: string, payload: any) {
    // Can use Redis, RabbitMQ, or cloud pub/sub
    const message = {
      type: eventType,
      timestamp: Date.now(),
      payload
    };

    // Multi-instance safe: events flow through broker
    await messageBroker.publish('events', JSON.stringify(message));
  }
}
```

### Load Balancer Configuration

```nginx
# nginx.conf - Multi-tenant routing

upstream app_servers {
    # Multiple instances (auto-scale)
    server app-1.internal:8000;
    server app-2.internal:8000;
    server app-3.internal:8000;
}

server {
    listen 80;
    server_name ~^(?<subdomain>.+)\.supplysetu\.com$ supplysetu.com api.supplysetu.com;

    # Route to any available app instance
    # Middleware extracts tenant from subdomain
    location / {
        proxy_pass http://app_servers;
        
        # Pass tenant context
        proxy_set_header X-Tenant-Subdomain $subdomain;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 9. Security Considerations

### Tenant Misrouting Prevention

```typescript
/**
 * Guard: Prevent server-side request forgery (SSRF) attacks
 * Ensure tenant in JWT matches extracted tenant from request context
 */
export const tenantMisrouteGuard = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  const extractedTenantId = req.tenantId;
  const jwtTenantId = req.user?.tenant_id; // From JWT payload

  if (extractedTenantId && jwtTenantId && extractedTenantId !== jwtTenantId) {
    logger.warn('TENANT_MISROUTE_DETECTED', {
      extracted: extractedTenantId,
      jwt: jwtTenantId,
      ipAddress: req.ip,
      userAgent: req.user?.id
    });

    return res.status(403).json({
      error: 'Tenant mismatch',
      code: 'TENANT_MISMATCH'
    });
  }

  next();
};

// Apply to all protected routes
app.use('/api/v1', tenantContextMiddleware, tenantMisrouteGuard);
```

### Connection Pool: Per-Tenant Isolation

```typescript
// src/database/connection-pool.ts

export class DatabasePool {
  private static pools = new Map<string, Pool>();

  /**
   * Option 1: Shared pool with RLS enforcement (Recommended for most cases)
   */
  static async getConnection(tenantId: string) {
    if (this.pools.has('default')) {
      const pool = this.pools.get('default');
      const client = await pool.connect();
      
      // Set tenant context for RLS
      await client.query(`SELECT set_config('app.current_tenant_id', $1, false)`, [tenantId]);
      
      return client;
    }
  }

  /**
   * Option 2: Separate database per tenant (Enterprise, but complex)
   * Use for: Max isolation, regulatory requirements
   */
  static async getTenantDatabase(tenantId: string) {
    if (!this.pools.has(tenantId)) {
      // Create new pool for this tenant
      const dbName = `supplysetu_${tenantId}`;
      const pool = new Pool({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        database: dbName // Separate database per tenant
      });
      this.pools.set(tenantId, pool);
    }
    return this.pools.get(tenantId);
  }
}
```

---

## 10. Monitoring Tenant Health

### Metrics per Tenant

```sql
-- View: Tenant health metrics
CREATE VIEW tenant_health AS
SELECT 
  t.id,
  t.slug,
  t.status,
  COUNT(DISTINCT r.id) as total_retailers,
  COUNT(DISTINCT o.id) as orders_this_month,
  AVG(o.total_amount) as avg_order_value,
  MAX(o.created_at) as last_order_at,
  (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.activated_at)) / 86400)::int as days_live
FROM tenants t
LEFT JOIN retailers r ON t.id = r.tenant_id
LEFT JOIN orders o ON t.id = o.tenant_id AND o.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
WHERE t.deleted_at IS NULL
GROUP BY t.id;
```

### Alerts per Tenant

```typescript
// Alert: Tenant inactive (no orders for 7 days)
async function checkTenantInactivity() {
  const inactiveTenants = await db.query(
    `SELECT id, slug FROM tenants
     WHERE status = 'active'
     AND deleted_at IS NULL
     AND (SELECT MAX(created_at) FROM orders WHERE tenant_id = tenants.id) < CURRENT_TIMESTAMP - INTERVAL '7 days'`
  );

  for (const tenant of inactiveTenants.rows) {
    await AlertService.create({
      tenant_id: tenant.id,
      severity: 'warning',
      message: `No orders for 7 days`,
      action: 'reach_out_to_distributor'
    });
  }
}
```

---

## Summary

**Core Principles:**
1. ✅ Tenant ID attached via middleware (immutable for request context)
2. ✅ ALL queries enforce tenant_id filter (automatic via TenantScopedQuery)
3. ✅ Database RLS enforces Row Level Security (PostgreSQL backup)
4. ✅ Tenant-specific configuration stored & cached
5. ✅ Provisioning state machine tracks onboarding progress
6. ✅ Horizontal scaling via stateless service layer
7. ✅ Tenant misrouting detected & logged

**Deployment:**
```bash
# Apply migrations
npm run migrate:prod

# Verify tenant isolation
npm run test:isolation

# Start app instances (auto-scales)
docker run -e INSTANCE_ID=1 app:latest
docker run -e INSTANCE_ID=2 app:latest
```
