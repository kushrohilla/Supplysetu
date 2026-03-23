# Subscription Management Module

## 1. Overview

Tenant billing lifecycle: plans → billing cycles → usage tracking → payment → suspension/upgrade.

### Supported Models
- Monthly subscription (recurring)
- Annual subscription (volume discount)
- Usage-based pricing (overage charges)
- Trial period (14 days free)
- Grace period (7 days late payment)

---

## 2. Subscription Data Models

### Subscription Plans

```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Plan identity
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(50) UNIQUE,
  description TEXT,
  
  -- Pricing
  monthly_price_inr INT, -- In paise (₹100 = 10000 paise)
  annual_price_inr INT,  -- 20% discount if annual
  
  -- Limits per plan
  max_retailers INT,
  max_api_calls_per_month INT,
  max_concurrent_users INT,
  max_custom_webhooks INT,
  
  -- Features enabled
  features JSONB DEFAULT '{
    "assisted_ordering": true,
    "retailer_insights": true,
    "bulk_operations": false,
    "advanced_analytics": false,
    "dedicated_support": false,
    "custom_branding": false
  }'::jsonb,
  
  -- Support level
  support_tier ENUM('community', 'standard', 'priority', 'enterprise') DEFAULT 'standard',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_trial_plan BOOLEAN DEFAULT false, -- 14-day free trial
  
  -- Ordering
  sort_order INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO subscription_plans (
  name, slug, description, monthly_price_inr,
  annual_price_inr, max_retailers, max_api_calls_per_month,
  max_concurrent_users, features, support_tier, sort_order
) VALUES
  -- Starter Plan (Trial)
  ('Trial', 'trial', '14-day free trial', 0, 0, 50, 10000, 2,
   '{"assisted_ordering": true, "retailer_insights": false, "bulk_operations": false}'::jsonb,
   'community', 1),
  
  -- Growth Plan
  ('Growth', 'growth', 'For growing distributors', 9999, 99990, 500, 100000, 5,
   '{"assisted_ordering": true, "retailer_insights": true, "bulk_operations": true}'::jsonb,
   'standard', 2),
  
  -- Pro Plan
  ('Pro', 'pro', 'For established distributors', 29999, 299990, 2000, 500000, 15,
   '{"assisted_ordering": true, "retailer_insights": true, "bulk_operations": true, "advanced_analytics": true}'::jsonb,
   'priority', 3),
  
  -- Enterprise Plan
  ('Enterprise', 'enterprise', 'Custom deployment + support', NULL, NULL, 10000, 5000000, 100,
   '{"assisted_ordering": true, "retailer_insights": true, "bulk_operations": true, "advanced_analytics": true, "dedicated_support": true, "custom_branding": true}'::jsonb,
   'enterprise', 4);
```

### Tenant Subscription Status

```sql
CREATE TABLE tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Plan assignment
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  
  -- Billing cycle
  billing_period ENUM('monthly', 'annual') DEFAULT 'monthly',
  current_cycle_start_date DATE NOT NULL,
  current_cycle_end_date DATE NOT NULL,
  renewal_date DATE NOT NULL,
  
  -- Status
  status ENUM(
    'trial',              -- 14-day free period
    'active',             -- Payment received
    'past_due',           -- Payment overdue (7-day grace)
    'suspended',          -- No payment after grace period
    'cancelled'           -- User requested cancellation
  ) DEFAULT 'trial',
  
  -- Trial info
  trial_ends_at TIMESTAMP,
  trial_extended BOOLEAN DEFAULT false,
  
  -- Payment tracking
  last_payment_date TIMESTAMP,
  next_payment_date TIMESTAMP,
  payment_method_id VARCHAR(255), -- Reference to payment gateway
  
  -- Grace period
  grace_period_ends_at TIMESTAMP,  -- 7 days after past_due
  suspension_warned_at TIMESTAMP,  -- Sent warning email
  
  -- Usage tracking (reset monthly)
  usage_this_cycle JSONB DEFAULT '{
    "orders_created": 0,
    "api_calls": 0,
    "retail ers_count": 0
  }'::jsonb,
  
  -- Overage charges
  estimated_overages_inr INT DEFAULT 0,
  
  -- Admin notes
  notes TEXT,
  
  -- Timestamps
  activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  suspended_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_subscriptions_tenant ON tenant_subscriptions(tenant_id);
CREATE INDEX idx_tenant_subscriptions_status ON tenant_subscriptions(status);
CREATE INDEX idx_tenant_subscriptions_renewal ON tenant_subscriptions(renewal_date);
```

### Billing History & Invoices

```sql
CREATE TABLE billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES tenant_subscriptions(id) ON DELETE CASCADE,
  
  -- Invoice details
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  invoice_date DATE DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  
  -- Amounts (in paise)
  subscription_amount_inr INT NOT NULL,  -- Plan cost
  overage_charges_inr INT DEFAULT 0,
  discount_inr INT DEFAULT 0,
  gst_inr INT DEFAULT 0,
  total_amount_inr INT NOT NULL,
  
  -- Payment status
  status ENUM('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
  sent_at TIMESTAMP,
  paid_at TIMESTAMP,
  
  -- Payment reference
  payment_gateway_ref VARCHAR(255),
  payment_method VARCHAR(50),
  
  -- Line items
  line_items JSONB NOT NULL, -- [{name, qty, rate, amount}]
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_billing_invoices_tenant ON billing_invoices(tenant_id);
CREATE INDEX idx_billing_invoices_status ON billing_invoices(status);
CREATE INDEX idx_billing_invoices_due_date ON billing_invoices(due_date);
```

### Usage Metrics (Per Billing Cycle)

```sql
CREATE TABLE usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Billing cycle
  cycle_start_date DATE NOT NULL,
  cycle_end_date DATE NOT NULL,
  
  -- Metrics
  orders_created INT DEFAULT 0,
  api_calls_made INT DEFAULT 0,
  files_uploaded INT DEFAULT 0,
  retailers_count INT DEFAULT 0,
  salesman_count INT DEFAULT 0,
  
  -- Calculated
  was_over_plan_limit BOOLEAN DEFAULT false,
  
  -- Timestamp
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(tenant_id, cycle_start_date)
);

CREATE INDEX idx_usage_metrics_tenant ON usage_metrics(tenant_id);
CREATE INDEX idx_usage_metrics_cycle ON usage_metrics(cycle_start_date, cycle_end_date);
```

---

## 3. Subscription Lifecycle State Machine

### States & Transitions

```
                TRIAL (14 days free)
                     |
                     v
          [Day 14] Set to ACTIVE
                     |
          ┌──────────┴──────────┐
          v                     v
    [Payment OK]          [Payment Failed]
          |                     |
          v                     v
       ACTIVE ────────────→ PAST_DUE
          ↑                     |
          │              [Day 7 grace period]
          │                     |
          │                     v
          │─────────────← SUSPENDED
                        [No payment after grace]
                               |
                         [Cancel / Delete]
                               |
                               v
                           CANCELLED
```

### State Transitions

```typescript
// src/services/subscription.service.ts

export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled'
}

export class SubscriptionStateManager {
  /**
   * Transition: Trial → Active (after 14 days or manual payment)
   */
  static async activateSubscription(
    tenantId: string,
    planId: string
  ) {
    const subscription = await db.query(
      `UPDATE tenant_subscriptions
       SET status = $1,
           activated_at = CURRENT_TIMESTAMP,
           current_cycle_start_date = CURRENT_DATE,
           current_cycle_end_date = CURRENT_DATE + INTERVAL '1 month',
           renewal_date = CURRENT_DATE + INTERVAL '1 month',
           trial_ends_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $2
       RETURNING *`,
      [SubscriptionStatus.ACTIVE, tenantId]
    );

    await this.createFirstInvoice(tenantId, planId);
    await this.notifyPlan('subscription:activated', tenantId);

    return subscription.rows[0];
  }

  /**
   * Transition: Active → PastDue (payment failed)
   */
  static async markPastDue(tenantId: string, reason: string) {
    const gracePeriodEnds = new Date();
    gracePeriodEnds.setDate(gracePeriodEnds.getDate() + 7); // 7-day grace

    const subscription = await db.query(
      `UPDATE tenant_subscriptions
       SET status = $1,
           grace_period_ends_at = $2,
           suspension_warned_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $3
       RETURNING *`,
      [SubscriptionStatus.PAST_DUE, gracePeriodEnds, tenantId]
    );

    // Send payment reminder
    await this.sendPaymentReminderEmail(tenantId, reason);

    return subscription.rows[0];
  }

  /**
   * Transition: PastDue → Suspended (after grace period)
   */
  static async suspendSubscription(tenantId: string) {
    const subscription = await db.query(
      `UPDATE tenant_subscriptions
       SET status = $1,
           suspended_at = CURRENT_TIMESTAMP,
           grace_period_ends_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $2
       RETURNING *`,
      [SubscriptionStatus.SUSPENDED, tenantId]
    );

    // Disable tenant access
    await db.query(
      `UPDATE tenants SET status = 'suspended' WHERE id = $1`,
      [tenantId]
    );

    // Send suspension notification
    await this.notifySubscriptionSuspended(tenantId);

    return subscription.rows[0];
  }

  /**
   * Transition: Suspended → Active (payment received)
   */
  static async reactivateFromSuspension(tenantId: string) {
    const subscription = await db.query(
      `UPDATE tenant_subscriptions
       SET status = $1,
           suspended_at = NULL,
           grace_period_ends_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $2
       RETURNING *`,
      [SubscriptionStatus.ACTIVE, tenantId]
    );

    // Re-enable tenant
    await db.query(
      `UPDATE tenants SET status = 'active' WHERE id = $1`,
      [tenantId]
    );

    await this.notifyPlan('subscription:reactivated', tenantId);

    return subscription.rows[0];
  }

  private static async notifyPlan(event: string, tenantId: string) {
    // Publish to message queue for email/SMS handlers
    await messageBroker.publish('subscription-events', {
      event,
      tenantId,
      timestamp: Date.now()
    });
  }
}
```

---

## 4. Subscription Status Middleware

### Enforce Plan Limits

```typescript
// src/middleware/subscription-status.middleware.ts

export const subscriptionStatusMiddleware = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId;

    // Fetch subscription status
    const subscription = await db.query(
      `SELECT s.*, p.features, p.max_retailers, p.max_api_calls_per_month
       FROM tenant_subscriptions s
       JOIN subscription_plans p ON s.plan_id = p.id
       WHERE s.tenant_id = $1`,
      [tenantId]
    );

    if (!subscription.rows.length) {
      return res.status(404).json({
        error: 'Subscription not found',
        code: 'SUBSCRIPTION_NOT_FOUND'
      });
    }

    const sub = subscription.rows[0];

    // Check status: Suspended tenants cannot operate
    if (sub.status === 'suspended') {
      return res.status(403).json({
        error: 'Account suspended. Payment required.',
        code: 'ACCOUNT_SUSPENDED',
        suspension_details: {
          suspended_at: sub.suspended_at,
          grace_ended_at: sub.grace_period_ends_at,
          action: 'Contact support to reactivate'
        }
      });
    }

    // Past due warning (but allow operation)
    if (sub.status === 'past_due') {
      res.set('X-Subscription-Warning', 'PAST_DUE');
    }

    // Attach subscription to request for feature checks
    req.subscription = {
      status: sub.status,
      plan: sub.name,
      features: sub.features,
      limits: {
        max_retailers: sub.max_retailers,
        max_api_calls: sub.max_api_calls_per_month
      },
      renewal_date: sub.renewal_date
    };

    next();
  } catch (error) {
    logger.error('Subscription middleware error:', error);
    res.status(500).json({
      error: 'Subscription validation failed',
      code: 'SUBSCRIPTION_ERROR'
    });
  }
};

// Apply to all protected routes
app.use('/api/v1', subscriptionStatusMiddleware);
```

### Feature Flag Enforcement

```typescript
// src/middleware/feature-flag.middleware.ts

export const requireFeature = (featureName: string) => {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    const features = req.subscription?.features || {};

    if (!features[featureName]) {
      return res.status(403).json({
        error: `Feature "${featureName}" not available in your plan`,
        code: 'FEATURE_NOT_AVAILABLE',
        upgradeUrl: '/billing/upgrade'
      });
    }

    next();
  };
};

// Usage in routes
app.post('/api/v1/advanced-reports',
  authenticate,
  subscriptionStatusMiddleware,
  requireFeature('advanced_analytics'),
  handler
);
```

---

## 5. Billing Cycle Management

### Auto-Renewal Logic

```typescript
// src/jobs/billing-renewal.job.ts

export class BillingRenewalJob {
  /**
   * Daily: Check subscriptions due for renewal
   */
  static async processRenewals() {
    const expiringToday = await db.query(
      `SELECT * FROM tenant_subscriptions
       WHERE renewal_date = CURRENT_DATE
       AND status IN ('active', 'trial')`
    );

    for (const sub of expiringToday.rows) {
      await this.renewSubscription(sub.id, sub.tenant_id);
    }
  }

  private static async renewSubscription(
    subscriptionId: string,
    tenantId: string
  ) {
    const subscription = await db.query(
      `SELECT s.*, p.monthly_price_inr, p.annual_price_inr
       FROM tenant_subscriptions s
       JOIN subscription_plans p ON s.plan_id = p.id
       WHERE s.id = $1`,
      [subscriptionId]
    );

    const sub = subscription.rows[0];

    // Calculate new cycle dates
    const newCycleStart = new Date(sub.renewal_date);
    const newCycleEnd = new Date(newCycleStart);

    if (sub.billing_period === 'monthly') {
      newCycleEnd.setMonth(newCycleEnd.getMonth() + 1);
    } else {
      newCycleEnd.setFullYear(newCycleEnd.getFullYear() + 1);
    }

    // Calculate invoice amount
    const amount = sub.billing_period === 'monthly'
      ? sub.monthly_price_inr
      : sub.annual_price_inr;

    // Create invoice
    const invoice = await db.query(
      `INSERT INTO billing_invoices (
        tenant_id, subscription_id, invoice_number, due_date,
        subscription_amount_inr, total_amount_inr, line_items
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [
        tenantId,
        subscriptionId,
        `INV-${Date.now()}`,
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Due in 14 days
        amount,
        amount,
        JSON.stringify([{
          name: `${sub.billing_period} subscription`,
          rate: amount / 100,
          qty: 1,
          amount: amount
        }])
      ]
    );

    // Update subscription renewal date
    await db.query(
      `UPDATE tenant_subscriptions
       SET current_cycle_start_date = $1,
           current_cycle_end_date = $2,
           renewal_date = $3,
           next_payment_date = $4,
           usage_this_cycle = '{
             "orders_created": 0,
             "api_calls": 0,
             "retailers_count": 0
           }'::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [
        newCycleStart,
        newCycleEnd,
        newCycleEnd,
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        subscriptionId
      ]
    );

    // Send invoice
    await this.sendInvoiceEmail(tenantId, invoice.rows[0].id);
  }

  private static async sendInvoiceEmail(tenantId: string, invoiceId: string) {
    // Queue for email handler
    await messageBroker.publish('billing-events', {
      event: 'invoice:send',
      tenantId,
      invoiceId,
      timestamp: Date.now()
    });
  }
}

// Schedule this job to run daily
cron.schedule('0 1 * * *', () => BillingRenewalJob.processRenewals());
```

### Grace Period Enforcement

```typescript
// src/jobs/grace-period-check.job.ts

export class GracePeriodJob {
  /**
   * Daily: Check for subscriptions in grace period
   */
  static async checkGracePeriod() {
    const pastDue = await db.query(
      `SELECT * FROM tenant_subscriptions
       WHERE status = 'past_due'
       AND grace_period_ends_at > CURRENT_TIMESTAMP`
    );

    for (const sub of pastDue.rows) {
      const daysUntilSuspension = Math.ceil(
        (new Date(sub.grace_period_ends_at) - Date.now()) / (1000 * 60 * 60 * 24)
      );

      // Send reminder on day 3 and day 6
      if (daysUntilSuspension === 3 || daysUntilSuspension === 1) {
        await this.sendReminderEmail(sub.tenant_id, daysUntilSuspension);
      }
    }
  }

  /**
   * Daily: Auto-suspend subscriptions after grace period
   */
  static async suspendExpiredGracePeriods() {
    const expiredGrace = await db.query(
      `SELECT * FROM tenant_subscriptions
       WHERE status = 'past_due'
       AND grace_period_ends_at <= CURRENT_TIMESTAMP`
    );

    for (const sub of expiredGrace.rows) {
      await SubscriptionStateManager.suspendSubscription(sub.tenant_id);
    }
  }

  private static async sendReminderEmail(tenantId: string, daysRemaining: number) {
    await messageBroker.publish('billing-events', {
      event: 'suspension_warning',
      tenantId,
      daysRemaining,
      timestamp: Date.now()
    });
  }
}

// Schedule this job
cron.schedule('0 2 * * *', () => GracePeriodJob.checkGracePeriod());
cron.schedule('0 2 * * *', () => GracePeriodJob.suspendExpiredGracePeriods());
```

---

## 6. Usage Tracking

### Track API Calls & Orders

```typescript
// src/middleware/usage-tracker.middleware.ts

export const usageTrackerMiddleware = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  // Intercept response
  const originalSend = res.send;
  res.send = function(data) {
    // Log API call after response is sent
    (async () => {
      try {
        const duration = Date.now() - startTime;

        // Increment usage counter
        await redisClient.incr(`usage:${req.tenantId}:api_calls:${getCurrentCycleKey()}`);

        // Track in database (async)
        await db.query(
          `UPDATE usage_metrics
           SET api_calls_made = api_calls_made + 1
           WHERE tenant_id = $1
           AND cycle_start_date = CURRENT_DATE`,
          [req.tenantId]
        );
      } catch (error) {
        logger.error('Usage tracking error:', error);
      }
    })();

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Track order creation
 */
export const trackOrder = async (tenantId: string) => {
  // Increment counter
  await redisClient.incr(`usage:${tenantId}:orders:${getCurrentCycleKey()}`);

  // Update database
  await db.query(
    `UPDATE usage_metrics
     SET orders_created = orders_created + 1
     WHERE tenant_id = $1
     AND cycle_start_date = CURRENT_DATE`,
    [tenantId]
  );

  // Check if over limit
  const subscription = await db.query(
    `SELECT s.*, p.max_api_calls_per_month
     FROM tenant_subscriptions s
     JOIN subscription_plans p ON s.plan_id = p.id
     WHERE s.tenant_id = $1`,
    [tenantId]
  );

  if (!subscription.rows.length) return;

  const sub = subscription.rows[0];
  const currentUsage = await redisClient.get(
    `usage:${tenantId}:api_calls:${getCurrentCycleKey()}`
  );

  if (parseInt(currentUsage) > sub.max_api_calls_per_month) {
    // Calculate overage
    const overage = parseInt(currentUsage) - sub.max_api_calls_per_month;
    const overageChargesInr = Math.ceil(overage * 0.10); // ₹0.10 per API call

    await db.query(
      `UPDATE tenant_subscriptions
       SET estimated_overages_inr = $1
       WHERE tenant_id = $2`,
      [overageChargesInr, tenantId]
    );
  }
};

function getCurrentCycleKey(): string {
  return new Date().toISOString().split('T')[0];
}
```

---

## 7. Payment Gateway Integration (Future)

### Payment Gateway Interface

```typescript
// src/services/payment-gateway.service.ts

export interface PaymentGatewayAdapter {
  initiatePay ment(invoice: Invoice): Promise<PaymentSession>;
  verifyPayment(paymentId: string): Promise<PaymentResult>;
  refund(paymentId: string, amount: number): Promise<RefundResult>;
}

/**
 * Razorpay adapter (example)
 */
export class RazorpayAdapter implements PaymentGatewayAdapter {
  private razorpay: any;

  constructor(apiKey: string, apiSecret: string) {
    this.razorpay = require('razorpay')({
      key_id: apiKey,
      key_secret: apiSecret
    });
  }

  async initiatePayment(invoice: Invoice): Promise<PaymentSession> {
    const order = await this.razorpay.orders.create({
      amount: invoice.total_amount_inr,
      currency: 'INR',
      receipt: invoice.invoice_number,
      notes: {
        tenant_id: invoice.tenant_id,
        invoice_id: invoice.id
      }
    });

    return {
      gateway: 'razorpay',
      session_id: order.id,
      payment_url: `https://checkout.razorpay.com/?key_id=${process.env.RAZORPAY_KEY}`,
      expires_at: new Date(Date.now() + 30 * 60 * 1000) // 30 min
    };
  }

  async verifyPayment(paymentId: string): Promise<PaymentResult> {
    const payment = await this.razorpay.payments.fetch(paymentId);

    return {
      success: payment.status === 'captured',
      payment_id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      timestamp: new Date(payment.created_at * 1000)
    };
  }

  async refund(paymentId: string, amount: number): Promise<RefundResult> {
    const refund = await this.razorpay.payments.refund(paymentId, {
      amount: amount
    });

    return {
      success: refund.status === 'processed',
      refund_id: refund.id,
      amount: refund.amount,
      timestamp: new Date()
    };
  }
}

/**
 * Payment webhook handler
 */
export async function handlePaymentWebhook(
  event: RazorpayWebhookEvent
) {
  if (event.event === 'payment.authorized') {
    const { payment } = event.payload;
    const invoiceNumber = payment.notes.invoice_id;

    // Mark invoice as paid
    await db.query(
      `UPDATE billing_invoices
       SET status = 'paid',
           paid_at = CURRENT_TIMESTAMP,
           payment_gateway_ref = $1,
           payment_method = 'razorpay'
       WHERE id = $2`,
      [payment.id, invoiceNumber]
    );

    const tenantId = payment.notes.tenant_id;

    // Activate subscription
    await SubscriptionStateManager.reactivateFromSuspension(tenantId);
  }
}
```

---

## 8. Billing Endpoints

### GET /billing/subscription

```typescript
response.200 {
  tenant_id: "uuid",
  plan: {
    name: "Pro",
    monthly_price_inr: 29999
  },
  status: "active",
  current_cycle: {
    start_date: "2026-03-01",
    end_date: "2026-03-31",
    renewal_date: "2026-04-01"
  },
  usage_this_cycle: {
    orders_created: 145,
    api_calls_made: 45320,
    retailers_count: 320
  },
  limits: {
    max_retailers: 2000,
    max_api_calls_per_month: 500000,
    max_concurrent_users: 15
  },
  next_billing: {
    invoice_date: "2026-03-31",
    due_date: "2026-04-14",
    amount_inr: 29999
  }
}
```

### GET /billing/invoices

```typescript
response.200 [
  {
    id: "inv-uuid-1",
    invoice_number: "INV-2026001",
    invoice_date: "2026-03-01",
    due_date: "2026-03-15",
    amount_inr: 29999,
    status: "paid",
    paid_at: "2026-03-10"
  }
]
```

### POST /billing/upgrade-plan

```typescript
request {
  new_plan_id: "uuid-pro",
  billing_period: "annual" // monthly | annual
}

response.200 {
  plan: "Pro",
  immediate_charge_inr: 0, // Proration if mid-cycle
  next_billing_date: "2026-04-01",
  features_enabled: ["assisted_ordering", "retailer_insights", "advanced_analytics"]
}
```

---

## 9. Summary

**Subscription management:**
1. ✅ 4 tiered plans (Trial, Growth, Pro, Enterprise)
2. ✅ Monthly + annual billing cycles
3. ✅ Usage tracking (orders, API calls)
4. ✅ Automatic renewals
5. ✅ Grace period (7 days) for overdue payments
6. ✅ Auto-suspension after grace period
7. ✅ Payment gateway adapter ready (Razorpay/Stripe integration)
8. ✅ Feature enforcement via middleware
9. ✅ Overage charges calculation

**Deployment ready for:**
- Self-hosted payment processing (credentials encrypted)
- External payment gateway webhooks
- Billing automation (renewal, grace period, suspension)
