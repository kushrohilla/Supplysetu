# SaaS Analytics Aggregation Module

## 1. Overview

Real-time insights without impacting operational database. Separate analytics data warehouse with denormalized snapshots, updated on schedule.

### Design Goals
- **Isolation**: Analytics queries never lock transactional data
- **Performance**: Pre-aggregated snapshots (no complex joins)
- **Real-time**: Aggregations every 5-15 minutes
- **Multi-tenant**: Per-tenant metrics in isolation
- **Cost-effective**: Compress old snapshots, archive to cold storage

---

## 2. Analytics Data Models

### Daily Snapshot Tables (Pre-aggregated)

```sql
-- Daily metrics per tenant
CREATE TABLE analytics_daily_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Date
  snapshot_date DATE NOT NULL,
  
  -- Orders metrics
  total_orders INT DEFAULT 0,
  successful_orders INT DEFAULT 0,
  failed_orders INT DEFAULT 0,
  avg_order_value INT DEFAULT 0, -- In paise
  total_order_value INT DEFAULT 0,
  
  -- Retailers metrics
  active_retailers INT DEFAULT 0,
  new_retailers_today INT DEFAULT 0,
  retailers_with_orders INT DEFAULT 0,
  
  -- Adoption
  retailer_adoption_percentage DECIMAL(5,2) DEFAULT 0,
  order_frequency_per_retailer DECIMAL(5,2) DEFAULT 0,
  
  -- Payment
  payment_success_rate DECIMAL(5,2) DEFAULT 100,
  online_payment_percentage DECIMAL(5,2) DEFAULT 0,
  
  -- Salesman performance
  salesman_count INT DEFAULT 0,
  avg_retailers_per_salesman INT DEFAULT 0,
  
  -- Users
  active_users INT DEFAULT 0,
  new_users_today INT DEFAULT 0,
  
  -- Timestamp
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(tenant_id, snapshot_date)
);

CREATE INDEX idx_analytics_daily_tenant ON analytics_daily_snapshots(tenant_id);
CREATE INDEX idx_analytics_daily_date ON analytics_daily_snapshots(snapshot_date);
```

### Hourly Metrics (High-frequency)

```sql
CREATE TABLE analytics_hourly_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Hour
  hour_start TIMESTAMP NOT NULL,
  
  -- Event counts
  orders_created INT DEFAULT 0,
  api_calls INT DEFAULT 0,
  failed_transactions INT DEFAULT 0,
  
  -- Revenue
  total_gmv INT DEFAULT 0, -- Gross Merchandise Value
  
  -- Timestamp
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(tenant_id, hour_start)
);

CREATE INDEX idx_analytics_hourly_tenant ON analytics_hourly_metrics(tenant_id);
CREATE INDEX idx_analytics_hourly_time ON analytics_hourly_metrics(hour_start);
```

### Cumulative Metrics (Lifetime)

```sql
CREATE TABLE analytics_cumulative_metrics (
  tenant_id UUID PRIMARY KEY UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Lifetime totals
  lifetime_orders INT DEFAULT 0,
  lifetime_order_value INT DEFAULT 0,
  lifetime_retailers_onboarded INT DEFAULT 0,
  
  -- Running totals (current month)
  current_month_orders INT DEFAULT 0,
  current_month_gmv INT DEFAULT 0,
  current_month_new_retailers INT DEFAULT 0,
  current_month_active_days INT DEFAULT 0,
  
  -- Trends
  month_over_month_growth_percentage DECIMAL(5,2) DEFAULT 0,
  
  -- Updated
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Retailer-Specific Analytics

```sql
CREATE TABLE analytics_retailer_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  retailer_id UUID NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  
  -- Date
  metric_date DATE NOT NULL,
  
  -- Order metrics
  orders_placed INT DEFAULT 0,
  total_value INT DEFAULT 0,
  
  -- Status
  days_since_last_order INT,
  is_active_today BOOLEAN DEFAULT false,
  consecutive_active_days INT DEFAULT 0,
  
  -- Engagement
  visit_count INT DEFAULT 0,
  assisted_order_count INT DEFAULT 0,
  self_service_order_count INT DEFAULT 0,
  
  -- VIP status
  aov_percentile INT,
  retention_risk_score INT, -- 1-100 (high = at risk)
  
  UNIQUE(tenant_id, retailer_id, metric_date)
);

CREATE INDEX idx_analytics_retailer_tenant ON analytics_retailer_metrics(tenant_id);
CREATE INDEX idx_analytics_retailer_date ON analytics_retailer_metrics(metric_date);
```

---

## 3. Aggregation Jobs (Scheduled)

### Hourly Aggregation (Near Real-time)

```typescript
// src/jobs/analytics-hourly.job.ts

export class AnalyticsHourlyJob {
  /**
   * Run every hour to aggregate metrics
   */
  static async aggregateHourlyMetrics() {
    const now = new Date();
    const hourStart = new Date(now);
    hourStart.setMinutes(0, 0, 0);

    // Get all active tenants
    const tenants = await db.query(
      `SELECT DISTINCT tenant_id FROM orders WHERE created_at >= $1`,
      [hourStart]
    );

    for (const { tenant_id } of tenants.rows) {
      await this.aggregateForTenant(tenant_id, hourStart);
    }
  }

  private static async aggregateForTenant(
    tenantId: string,
    hourStart: Date
  ) {
    const hourEnd = new Date(hourStart);
    hourEnd.setHours(hourEnd.getHours() + 1);

    // Query transactional database
    const metrics = await db.query(
      `SELECT
        COUNT(*) as orders_created,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_orders,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_orders,
        SUM(CASE WHEN status = 'success' THEN total_amount ELSE 0 END) as total_gmv
      FROM orders
      WHERE tenant_id = $1
      AND created_at >= $2 AND created_at < $3`,
      [tenantId, hourStart, hourEnd]
    );

    if (metrics.rows[0].orders_created === 0) {
      return; // Skip if no activity
    }

    // Write to analytics database
    await analyticsDb.query(
      `INSERT INTO analytics_hourly_metrics (
        tenant_id, hour_start, orders_created, failed_transactions, total_gmv
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (tenant_id, hour_start) DO UPDATE SET
        orders_created = $3,
        failed_transactions = $4,
        total_gmv = $5`,
      [tenantId, hourStart, ...Object.values(metrics.rows[0])]
    );
  }
}

// Schedule: Every hour at :05 mark
cron.schedule('5 * * * *', () => AnalyticsHourlyJob.aggregateHourlyMetrics());
```

### Daily Aggregation (Comprehensive)

```typescript
// src/jobs/analytics-daily.job.ts

export class AnalyticsDailyJob {
  /**
   * Run nightly to aggregate daily snapshots
   */
  static async generateDailySnapshots() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // Get all tenants
    const tenants = await db.query(`SELECT id FROM tenants WHERE deleted_at IS NULL`);

    for (const { id: tenantId } of tenants.rows) {
      await this.aggregateForTenant(tenantId, yesterday);
    }
  }

  private static async aggregateForTenant(tenantId: string, date: Date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Query 1: Order metrics
    const orderMetrics = await db.query(
      `SELECT
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_orders,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_orders,
        AVG(CASE WHEN status = 'success' THEN total_amount ELSE NULL END)::int as avg_order_value,
        SUM(CASE WHEN status = 'success' THEN total_amount ELSE 0 END)::int as total_order_value
      FROM orders
      WHERE tenant_id = $1 AND created_at >= $2 AND created_at < $3`,
      [tenantId, dayStart, dayEnd]
    );

    // Query 2: Retailer metrics
    const retailerMetrics = await db.query(
      `SELECT
        COUNT(DISTINCT id) as active_retailers,
        COUNT(DISTINCT CASE WHEN created_at >= $2 THEN id END) as new_retailers_today,
        COUNT(DISTINCT CASE WHEN EXISTS (
          SELECT 1 FROM orders WHERE retailer_id = retailers.id
          AND created_at >= $2 AND created_at < $3
        ) THEN id END) as retailers_with_orders
      FROM retailers
      WHERE tenant_id = $1
      AND is_active = true
      AND deleted_at IS NULL`,
      [tenantId, dayStart, dayEnd]
    );

    // Query 3: Adoption rate
    const totalRetailers = await db.query(
      `SELECT COUNT(*) as total FROM retailers WHERE tenant_id = $1 AND is_active = true`,
      [tenantId]
    );

    // Query 4: Payment metrics
    const paymentMetrics = await db.query(
      `SELECT
        COUNT(CASE WHEN status = 'success' THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100 as success_rate,
        COUNT(CASE WHEN payment_method = 'online' THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100 as online_rate
      FROM payments
      WHERE tenant_id = $1 AND created_at >= $2 AND created_at < $3`,
      [tenantId, dayStart, dayEnd]
    );

    // Query 5: User metrics
    const userMetrics = await db.query(
      `SELECT
        COUNT(DISTINCT CASE WHEN last_login_at >= $2 THEN id END) as active_users,
        COUNT(DISTINCT CASE WHEN created_at >= $2 THEN id END) as new_users
      FROM tenant_users
      WHERE tenant_id = $1 AND is_active = true`,
      [tenantId, dayStart]
    );

    // Calculate derived metrics
    const orderData = orderMetrics.rows[0];
    const retailerData = retailerMetrics.rows[0];
    const totalRetailersCount = totalRetailers.rows[0].total;
    const adoptionRate = (retailerData.retailers_with_orders / totalRetailersCount * 100).toFixed(2);
    const orderFrequency = (orderData.total_orders / retailerData.retailers_with_orders).toFixed(2);
    const paymentData = paymentMetrics.rows[0];
    const userData = userMetrics.rows[0];

    // Write snapshot
    await analyticsDb.query(
      `INSERT INTO analytics_daily_snapshots (
        tenant_id, snapshot_date,
        total_orders, successful_orders, failed_orders, avg_order_value, total_order_value,
        active_retailers, new_retailers_today, retailers_with_orders,
        retailer_adoption_percentage, order_frequency_per_retailer,
        payment_success_rate, online_payment_percentage,
        active_users, new_users_today
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (tenant_id, snapshot_date) DO UPDATE SET
        total_orders = $3,
        successful_orders = $4,
        failed_orders = $5,
        avg_order_value = $6,
        total_order_value = $7,
        active_retailers = $8,
        new_retailers_today = $9,
        retailers_with_orders = $10,
        retailer_adoption_percentage = $11,
        order_frequency_per_retailer = $12,
        payment_success_rate = $13,
        online_payment_percentage = $14,
        active_users = $15,
        new_users_today = $16`,
      [
        tenantId,
        date,
        orderData.total_orders,
        orderData.successful_orders,
        orderData.failed_orders,
        orderData.avg_order_value || 0,
        orderData.total_order_value || 0,
        retailerData.active_retailers,
        retailerData.new_retailers_today,
        retailerData.retailers_with_orders,
        adoptionRate,
        orderFrequency,
        paymentData.success_rate?.toFixed(2) || 100,
        paymentData.online_rate?.toFixed(2) || 0,
        userData.active_users,
        userData.new_users
      ]
    );

    // Update cumulative metrics
    await this.updateCumulativeMetrics(tenantId);
  }

  private static async updateCumulativeMetrics(tenantId: string) {
    // Lifetime totals
    const lifetimeMetrics = await db.query(
      `SELECT
        COUNT(*) as total_orders,
        SUM(total_amount) as total_value,
        COUNT(DISTINCT retailer_id) as total_retailers
      FROM orders
      WHERE tenant_id = $1 AND status = 'success'`,
      [tenantId]
    );

    // Current month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const currentMonthMetrics = await db.query(
      `SELECT
        COUNT(*) as orders,
        SUM(total_amount) as gmv,
        COUNT(DISTINCT CASE WHEN created_at >= $2 THEN id END) as new_retailers
      FROM orders o
      LEFT JOIN retailers r ON o.retailer_id = r.id
      WHERE o.tenant_id = $1 AND o.created_at >= $2 AND o.status = 'success'`,
      [tenantId, monthStart]
    );

    const lifetime = lifetimeMetrics.rows[0];
    const currentMonth = currentMonthMetrics.rows[0];

    await analyticsDb.query(
      `INSERT INTO analytics_cumulative_metrics (
        tenant_id, lifetime_orders, lifetime_order_value, lifetime_retailers_onboarded,
        current_month_orders, current_month_gmv, current_month_new_retailers,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (tenant_id) DO UPDATE SET
        lifetime_orders = $2,
        lifetime_order_value = $3,
        lifetime_retailers_onboarded = $4,
        current_month_orders = $5,
        current_month_gmv = $6,
        current_month_new_retailers = $7,
        updated_at = CURRENT_TIMESTAMP`,
      [
        tenantId,
        lifetime.total_orders,
        lifetime.total_value || 0,
        lifetime.total_retailers,
        currentMonth.orders,
        currentMonth.gmv || 0,
        currentMonth.new_retailers
      ]
    );
  }
}

// Schedule: Nightly at 01:30 UTC
cron.schedule('30 1 * * *', () => AnalyticsDailyJob.generateDailySnapshots());
```

### Retailer-Level Aggregation

```typescript
// src/jobs/analytics-retailer.job.ts

export class AnalyticsRetailerJob {
  /**
   * Daily: Per-retailer metrics for engagement tracking
   */
  static async aggregateRetailerMetrics() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const result = await db.query(
      `SELECT DISTINCT tenant_id, retailer_id FROM orders WHERE created_at >= $1`,
      [yesterday]
    );

    for (const { tenant_id, retailer_id } of result.rows) {
      await this.calculateRetailerMetrics(tenant_id, retailer_id, yesterday);
    }
  }

  private static async calculateRetailerMetrics(
    tenantId: string,
    retailerId: string,
    date: Date
  ) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Query metrics
    const metrics = await db.query(
      `SELECT
        COUNT(*) as orders,
        SUM(total_amount)::int as total_value,
        COUNT(DISTINCT DATE(created_at)) as visit_count,
        COUNT(CASE WHEN assisted = true THEN 1 END) as assisted_count,
        COUNT(CASE WHEN assisted = false THEN 1 END) as selfservice_count
      FROM orders
      WHERE tenant_id = $1 AND retailer_id = $2
      AND created_at >= $3 AND created_at < $4`,
      [tenantId, retailerId, dayStart, dayEnd]
    );

    // Last order query
    const lastOrder = await db.query(
      `SELECT created_at FROM orders
       WHERE tenant_id = $1 AND retailer_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [tenantId, retailerId]
    );

    // Calculate risk score
    let riskScore = 0;
    if (lastOrder.rows.length) {
      const daysSinceOrder = Math.floor(
        (Date.now() - new Date(lastOrder.rows[0].created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceOrder > 7) riskScore += 40;
      if (daysSinceOrder > 14) riskScore += 40;
      if (daysSinceOrder > 30) riskScore += 20;
    }

    // Write metric
    await analyticsDb.query(
      `INSERT INTO analytics_retailer_metrics (
        tenant_id, retailer_id, metric_date,
        orders_placed, total_value, visit_count,
        assisted_order_count, self_service_order_count,
        days_since_last_order, retention_risk_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (tenant_id, retailer_id, metric_date) DO UPDATE SET
        orders_placed = $4,
        total_value = $5,
        visit_count = $6,
        assisted_order_count = $7,
        self_service_order_count = $8,
        retention_risk_score = $10`,
      [
        tenantId,
        retailerId,
        date,
        metrics.rows[0].orders,
        metrics.rows[0].total_value,
        metrics.rows[0].visit_count,
        metrics.rows[0].assisted_count,
        metrics.rows[0].selfservice_count,
        lastOrder.rows.length ? Math.floor((Date.now() - new Date(lastOrder.rows[0].created_at).getTime()) / (1000 * 60 * 60 * 24)) : null,
        riskScore
      ]
    );
  }
}

// Schedule: Nightly at 02:00 UTC
cron.schedule('0 2 * * *', () => AnalyticsRetailerJob.aggregateRetailerMetrics());
```

---

## 4. Analytics Dashboard API Endpoints

### GET /analytics/dashboard/overview

```typescript
/**
 * Main dashboard: Today's metrics vs yesterday + trends
 */
response.200 {
  period: "today",
  tenant_id: "uuid",
  
  key_metrics: {
    orders_today: 24,
    orders_yesterday: 18,
    orders_trend: "+33%",
    
    gmv_today: 125000,
    gmv_yesterday: 98000,
    gmv_trend: "+28%",
    
    active_retailers: 145,
    new_retailers: 3,
    
    adoption_rate: 65.5,
    payment_success_rate: 97.8
  },
  
  top_hour: {
    hour: "10:00 - 11:00",
    orders: 6,
    gmv: 42000
  },
  
  charts: {
    orders_last_7_days: [
      { date: "2026-03-15", orders: 12, gmv: 60000 },
      { date: "2026-03-16", orders: 18, gmv: 89000 },
      { date: "2026-03-17", orders: 15, gmv: 75000 },
      // ... 4 more days
    ],
    
    retailer_adoption: {
      onboarded: 145,
      active_this_month: 98,
      at_risk: 12,
      inactive: 35
    }
  }
}
```

### GET /analytics/dashboard/retailers

```typescript
/**
 * Retailers tab: Top performers, at-risk, new signups
 */
response.200 {
  retailers_total: 145,
  
  top_performers: [
    {
      retailer_id: "uuid-1",
      name: "ABC Kirana",
      orders_this_month: 24,
      avg_order_value: 5500,
      last_order: "2 hours ago"
    }
  ],
  
  at_risk: [
    {
      retailer_id: "uuid-45",
      name: "XYZ Shop",
      risk_score: 85,
      reason: "No order for 18 days",
      last_order: "2026-03-03",
      recommended_action: "salesman_follow_up"
    }
  ],
  
  new_this_month: [
    {
      retailer_id: "uuid-200",
      name: "New Store",
      joined: "2026-03-15",
      first_order: "2026-03-16",
      is_active: true
    }
  ]
}
```

### GET /analytics/dashboard/salesmen

```typescript
/**
 * Salesman performance
 */
response.200 {
  salesmen: [
    {
      salesman_id: "uuid-s1",
      name: "Rajesh Kumar",
      retailers_assigned: 50,
      retailers_visited_this_week: 45,
      orders_this_month: 18,
      total_gmv_this_month: 125000,
      avg_gmv_per_order: 6944,
      assisted_orders_ratio: 0.75
    }
  ]
}
```

### GET /analytics/trends

```typescript
/**
 * Historical trends for date range
 */
request {
  start_date: "2026-02-15",
  end_date: "2026-03-21",
  granularity: "daily" | "weekly" | "monthly"
}

response.200 {
  period: {
    start: "2026-02-15",
    end: "2026-03-21",
    days: 34
  },
  
  trends: [
    {
      date: "2026-02-15",
      orders: 10,
      gmv: 55000,
      retailers_active: 120,
      retailers_at_risk: 8
    }
  ],
  
  summary: {
    total_orders: 567,
    total_gmv: 3125000,
    avg_daily_orders: 16.7,
    avg_daily_gmv: 91912,
    growth_mom_percentage: 34.2
  }
}
```

### GET /analytics/cohort-analysis

```typescript
/**
 * Retailer cohort analysis by onboarding month
 */
response.200 {
  cohorts: [
    {
      cohort_month: "2025-12",
      cohort_size: 120,
      months_active: [
        {
          month: 0,
          active_retailers: 110,
          retention_rate: 91.7,
          avg_orders_per_retailer: 5.2
        },
        {
          month: 1,
          active_retailers: 98,
          retention_rate: 81.7,
          avg_orders_per_retailer: 4.8
        },
        // ... more months
      ]
    }
  ]
}
```

---

## 5. Real-Time Metrics (Redis Cache)

### Cache Leaderboards

```typescript
// src/services/realtime-analytics.service.ts

export class RealtimeAnalytics {
  /**
   * Update real-time leaderboards (updated as events occur)
   */
  static async recordOrder(tenantId: string, order: Order) {
    // Today's top retailers
    await redis.zincrby(
      `leaderboard:${tenantId}:retailers:today`,
      order.total_amount,
      order.retailer_id
    );

    // Today's orders
    await redis.incr(`stats:${tenantId}:orders:today`);
    await redis.incrby(`stats:${tenantId}:gmv:today`, order.total_amount);

    // Set TTL to midnight
    const secondsUntilMidnight = this.getSecondsUntilMidnight();
    await redis.expire(`stats:${tenantId}:orders:today`, secondsUntilMidnight);
  }

  /**
   * Get current hour's performance
   */
  static async getCurrentHourStats(tenantId: string) {
    const [
      ordersThisHour,
      gmvThisHour,
      failedTransactions
    ] = await Promise.all([
      redis.get(`stats:${tenantId}:orders:hour`),
      redis.get(`stats:${tenantId}:gmv:hour`),
      redis.get(`stats:${tenantId}:failed:hour`)
    ]);

    return {
      orders_this_hour: parseInt(ordersThisHour) || 0,
      gmv_this_hour: parseInt(gmvThisHour) || 0,
      failed_transactions: parseInt(failedTransactions) || 0
    };
  }

  /**
   * Get top retailers (live leaderboard)
   */
  static async getTopRetailersLive(tenantId: string, limit: number = 10) {
    const topRetailers = await redis.zrevrange(
      `leaderboard:${tenantId}:retailers:today`,
      0,
      limit - 1,
      'WITHSCORES'
    );

    // Format response
    const result = [];
    for (let i = 0; i < topRetailers.length; i += 2) {
      result.push({
        retailer_id: topRetailers[i],
        total_gmv_today: parseInt(topRetailers[i + 1])
      });
    }

    return result;
  }

  private static getSecondsUntilMidnight(): number {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
  }
}
```

### Webhook for Live Dashboard

```typescript
// WebSocket handler for real-time updates
export class AnalyticsWebSocket {
  static async broadcastOrderUpdate(tenantId: string, order: Order) {
    // Update real-time stats
    await RealtimeAnalytics.recordOrder(tenantId, order);

    // Broadcast to connected clients
    const currentStats = await RealtimeAnalytics.getCurrentHourStats(tenantId);

    io.to(`tenant:${tenantId}`).emit('order:created', {
      order_id: order.id,
      gmv: order.total_amount,
      current_stats: currentStats
    });
  }
}
```

---

## 6. Performance Optimization

### Query Optimization: Use Analytics DB Read-Only Replica

```typescript
// src/database/analytics-query.ts

/**
 * Run analytics queries on read-only replica (never locks transactional data)
 */
export class AnalyticsQueryBuilder {
  static async executeAnalyticsQuery(query: string, params: any[]) {
    // Use read-only connection pool
    const connection = await analyticsReadPool.connect();

    try {
      return await connection.query(query, params);
    } finally {
      connection.release();
    }
  }

  // Ensure analytics never block operations
  static async getDailyMetrics(tenantId: string) {
    return this.executeAnalyticsQuery(
      `SELECT * FROM analytics_daily_snapshots
       WHERE tenant_id = $1
       ORDER BY snapshot_date DESC LIMIT 30`,
      [tenantId]
    );
  }
}
```

### Materialized Views for Complex Aggregations

```sql
-- Materialized view: Monthly revenue trend
CREATE MATERIALIZED VIEW analytics_monthly_revenue AS
SELECT
  tenant_id,
  DATE_TRUNC('month', snapshot_date)::DATE as month,
  SUM(total_order_value) as monthly_gmv,
  AVG(avg_order_value) as avg_order_value,
  SUM(successful_orders) as total_orders
FROM analytics_daily_snapshots
GROUP BY tenant_id, DATE_TRUNC('month', snapshot_date)
WITH DATA;

CREATE INDEX idx_analytics_monthly_tenant ON analytics_monthly_revenue(tenant_id);

-- Refresh nightly (after daily aggregation)
REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_monthly_revenue;
```

### Data Retention & Archival

```typescript
// src/jobs/analytics-retention.job.ts

export class AnalyticsRetentionJob {
  /**
   * Monthly: Archive old snapshot data
   */
  static async archiveOldSnapshots() {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Move to cold storage (slow query archive)
    await analyticsDb.query(
      `INSERT INTO analytics_snapshots_archive
       SELECT * FROM analytics_daily_snapshots
       WHERE snapshot_date < $1`,
      [threeMonthsAgo]
    );

    // Delete from hot table
    await analyticsDb.query(
      `DELETE FROM analytics_daily_snapshots WHERE snapshot_date < $1`,
      [threeMonthsAgo]
    );

    logger.info('Archived old analytics snapshots', {
      before_date: threeMonthsAgo
    });
  }
}

// Schedule: Monthly on 1st day
cron.schedule('0 3 1 * *', () => AnalyticsRetentionJob.archiveOldSnapshots());
```

---

## 7. Summary

**SaaS Analytics System:**
1. ✅ Hourly metrics (near real-time)
2. ✅ Daily snapshots (comprehensive aggregations)
3. ✅ Cumulative lifetime metrics
4. ✅ Retailer-level engagement tracking
5. ✅ Real-time leaderboards (Redis)
6. ✅ Multi-tenant isolation (per-tenant metrics)
7. ✅ Non-blocking queries (separate read-only analytics DB)
8. ✅ Cost optimization (archival of old data)

**Deployment:**
```bash
# Apply analytics schema
npm run migrate:analytics

# Start aggregation jobs
npm run start:aggregation-workers

# Dashboard ready
https://api.supplysetu.com/analytics/dashboard
```

**Key Metrics Tracked Per Tenant:**
- Orders: count, value, success rate
- Retailers: adoption %, activity, at-risk segmentation
- Payment: online %, success rate
- Users: active count, engagement
- Revenue: daily, monthly, trend
