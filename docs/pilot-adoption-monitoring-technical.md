# Pilot Adoption Monitoring: Technical Implementation Guide

## Overview

This document provides engineering specifications for implementing the pilot adoption monitoring dashboard. It covers data model, metric calculations, alert queries, and integration points.

**Tech Stack Considerations:**
- Backend: Node.js/Express, Python, or similar
- Database: PostgreSQL (for analytics queries)
- Analytics: Time-series DB (InfluxDB) or analytics warehouse (BigQuery, Snowflake)
- Dashboard UI: React/Vue component library with charting (Chart.js, Recharts)
- Real-time: WebSocket or Server-Sent Events (SSE) for 15-min refresh
- Alerting: Email service (SendGrid) + SMS (Twilio) + in-app notifications

---

## PART 1: DATA MODEL & SCHEMA

### 1.1 Core Tables Required

#### Table: `pilots`

```sql
CREATE TABLE pilots (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  status ENUM('planning', 'active', 'completed', 'paused'),
  start_date DATE,
  end_date DATE,
  target_retailers INT,
  expected_onboarded INT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

Example:
id: '550e8400-e29b-41d4-a716-446655440000'
name: 'Pilot Wave 1'
status: 'active'
start_date: '2026-05-12'
end_date: '2026-06-09'
target_retailers: 35
expected_onboarded: 35
```

---

#### Table: `pilot_retailers`

```sql
CREATE TABLE pilot_retailers (
  id UUID PRIMARY KEY,
  pilot_id UUID REFERENCES pilots(id),
  retailer_id UUID REFERENCES retailers(id), -- existing retailer table
  batch VARCHAR(10), -- 'A', 'B', 'C'
  frequency_segment VARCHAR(20), -- 'high', 'medium', 'low'
  readiness_tier INT, -- 1, 2, 3, 4
  readiness_score INT, -- 0-100
  onboarding_rep_id UUID,
  account_created_at TIMESTAMP,
  first_login_at TIMESTAMP NULL,
  first_order_at TIMESTAMP NULL,
  last_activity_at TIMESTAMP NULL, -- max(last_login, last_order) 
  status ENUM('planning', 'onboarded', 'active', 'dormant', 'churned'),
  churn_date TIMESTAMP NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  UNIQUE KEY (pilot_id, retailer_id)
);

Example:
id: 'retailer-pilot-001'
pilot_id: '550e8400-...'
retailer_id: 'rtl-00042'
batch: 'A'
frequency_segment: 'high'
readiness_score: 85
account_created_at: '2026-05-12 09:30:00'
first_login_at: '2026-05-12 09:45:00'
first_order_at: '2026-05-12 14:22:00'
```

---

#### Table: `orders`

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  retailer_id UUID REFERENCES retailers(id),
  pilot_id UUID REFERENCES pilots(id),
  order_date TIMESTAMP,
  channel VARCHAR(50), -- 'app', 'whatsapp', 'phone', 'email', 'other'
  order_total DECIMAL(10, 2),
  item_count INT,
  status ENUM('submitted', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  INDEX idx_retailer_pilot (retailer_id, pilot_id),
  INDEX idx_order_date (order_date),
  INDEX idx_channel (channel)
);

Example:
id: 'order-2026-051342'
retailer_id: 'rtl-00042'
pilot_id: '550e8400-...'
order_date: '2026-05-13 14:22:00'
channel: 'app'
order_total: 76.50
item_count: 4
```

---

#### Table: `login_sessions`

```sql
CREATE TABLE login_sessions (
  id UUID PRIMARY KEY,
  retailer_id UUID REFERENCES retailers(id),
  pilot_id UUID REFERENCES pilots(id),
  login_at TIMESTAMP,
  logout_at TIMESTAMP NULL,
  device_type VARCHAR(50), -- 'web', 'ios_app', 'android_app'
  duration_seconds INT,
  actions_taken INT, -- count of clicks/searches/etc
  
  INDEX idx_retailer_login (retailer_id, login_at),
  INDEX idx_pilot_login (pilot_id, login_at)
);

Example:
login_at: '2026-05-21 10:15:00'
logout_at: '2026-05-21 10:22:00'
device_type: 'ios_app'
duration_seconds: 420
actions_taken: 8
```

---

### 1.2 Materialized Views for Analytics

**Rationale:** Pre-calculate expensive metrics to avoid slow queries on dashboard

```sql
-- Materialized View: Weekly metrics by pilot
CREATE MATERIALIZED VIEW mv_pilot_weekly_metrics AS
SELECT 
  pilot_id,
  DATE_TRUNC('week', order_date) as week_start,
  COUNT(DISTINCT retailer_id) as active_retailers,
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE channel = 'app') as app_orders,
  COUNT(*) FILTER (WHERE channel = 'whatsapp') as whatsapp_orders,
  COUNT(*) FILTER (WHERE channel = 'phone') as phone_orders,
  SUM(order_total) as weekly_gmv,
  AVG(item_count) as avg_items_per_order,
  AVG(order_total) as avg_order_value
FROM orders
GROUP BY pilot_id, DATE_TRUNC('week', order_date)
ORDER BY pilot_id, week_start DESC;

-- Refresh every hour
REFRESH MATERIALIZED VIEW mv_pilot_weekly_metrics;
```

---

```sql
-- Materialized View: Per-retailer metrics
CREATE MATERIALIZED VIEW mv_retailer_pilot_metrics AS
SELECT 
  pr.id as pilot_retailer_id,
  pr.pilot_id,
  pr.retailer_id,
  pr.batch,
  pr.frequency_segment,
  pr.first_order_at,
  pr.last_activity_at,
  COUNT(o.id) as total_orders,
  COUNT(*) FILTER (WHERE o.order_date >= CURRENT_DATE - INTERVAL '7 days') as orders_last_7d,
  COUNT(*) FILTER (WHERE o.channel = 'app') as app_orders,
  COUNT(*) FILTER (WHERE o.channel = 'whatsapp') as whatsapp_orders,
  CASE 
    WHEN COUNT(o.id) = 0 THEN 0
    ELSE COUNT(*) FILTER (WHERE o.channel = 'app') * 100 / COUNT(o.id)
  END as app_order_percentage,
  DENSE_RANK() OVER (PARTITION BY pr.pilot_id ORDER BY pr.first_order_at) as days_to_first_order,
  CASE 
    WHEN pr.last_activity_at IS NULL THEN 'never_active'
    WHEN pr.last_activity_at < CURRENT_DATE - INTERVAL '14 days' THEN 'churned'
    WHEN pr.last_activity_at < CURRENT_DATE - INTERVAL '7 days' THEN 'dormant'
    ELSE 'active'
  END as retention_status
FROM pilot_retailers pr
LEFT JOIN orders o ON pr.retailer_id = o.retailer_id AND pr.pilot_id = o.pilot_id
GROUP BY pr.id, pr.pilot_id, pr.retailer_id, pr.batch, pr.frequency_segment, 
         pr.first_order_at, pr.last_activity_at;

-- Refresh every 30 minutes
REFRESH MATERIALIZED VIEW mv_retailer_pilot_metrics;
```

---

## PART 2: METRIC CALCULATION QUERIES

### 2.1 Total Onboarded

**Query:**
```sql
SELECT 
  pilot_id,
  COUNT(*) as total_onboarded
FROM pilot_retailers
WHERE first_login_at IS NOT NULL
  AND status IN ('onboarded', 'active', 'dormant', 'churned')
GROUP BY pilot_id;
```

**Optimization:** Runs in <100ms (indexed on first_login_at, status)

---

### 2.2 First Order Placement Rate

**Query:**
```sql
SELECT 
  pr.pilot_id,
  pr.batch,
  pr.frequency_segment,
  COUNT(DISTINCT pr.id) as total_retailers,
  COUNT(DISTINCT CASE WHEN pr.first_order_at IS NOT NULL THEN pr.id END) as with_orders,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN pr.first_order_at IS NOT NULL THEN pr.id END) 
    / COUNT(DISTINCT pr.id), 2) as conversion_rate
FROM pilot_retailers pr
WHERE pr.status IN ('onboarded', 'active', 'dormant', 'churned')
GROUP BY pr.pilot_id, pr.batch, pr.frequency_segment;
```

---

### 2.3 Weekly Active Ordering Retailers

**Query:**
```sql
SELECT 
  pr.pilot_id,
  DATE_TRUNC('week', o.order_date) as week_start,
  COUNT(DISTINCT o.retailer_id) as weekly_active,
  (
    SELECT COUNT(DISTINCT id) 
    FROM pilot_retailers 
    WHERE pilot_id = pr.pilot_id 
      AND status IN ('onboarded', 'active', 'dormant', 'churned')
  ) as total_onboarded,
  ROUND(100.0 * COUNT(DISTINCT o.retailer_id) / 
    (SELECT COUNT(DISTINCT id) FROM pilot_retailers WHERE pilot_id = pr.pilot_id), 2) 
    as active_percentage
FROM pilot_retailers pr
LEFT JOIN orders o ON pr.retailer_id = o.retailer_id 
  AND pr.pilot_id = o.pilot_id
  AND o.order_date >= DATE_TRUNC('week', CURRENT_DATE)
  AND o.order_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
GROUP BY pr.pilot_id, DATE_TRUNC('week', o.order_date)
ORDER BY pr.pilot_id, week_start DESC;
```

---

### 2.4 Average Order Frequency Change

**Query:**
```sql
WITH pre_pilot AS (
  SELECT 
    retailer_id,
    COUNT(*) / EXTRACT(WEEK FROM (MIN(order_date))) as orders_per_week
  FROM orders
  WHERE order_date < (SELECT start_date FROM pilots WHERE id = $1)
  GROUP BY retailer_id
),
post_pilot AS (
  SELECT 
    o.retailer_id,
    COUNT(*) / EXTRACT(WEEK FROM (CURRENT_DATE - (SELECT start_date FROM pilots WHERE id = $1))) 
      as orders_per_week
  FROM orders o
  JOIN pilots p ON o.pilot_id = p.id
  WHERE o.pilot_id = $1
    AND o.order_date >= p.start_date
  GROUP BY o.retailer_id
)
SELECT 
  ROUND(AVG(post_pilot.orders_per_week - pre_pilot.orders_per_week) 
    / AVG(pre_pilot.orders_per_week) * 100, 2) as freq_change_percent
FROM pre_pilot
FULL OUTER JOIN post_pilot ON pre_pilot.retailer_id = post_pilot.retailer_id;
```

---

### 2.5 Platform Channel Mix

**Query:**
```sql
SELECT 
  pilot_id,
  DATE_TRUNC('week', order_date) as week_start,
  channel,
  COUNT(*) as order_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY pilot_id, DATE_TRUNC('week', order_date)), 2) 
    as channel_percentage
FROM orders
WHERE pilot_id = $1
GROUP BY pilot_id, DATE_TRUNC('week', order_date), channel
ORDER BY week_start DESC, channel;
```

---

### 2.6 Retention / Churn Rate

**Query:**
```sql
SELECT 
  pilot_id,
  CASE 
    WHEN last_activity_at IS NULL THEN 'never_active'
    WHEN last_activity_at < CURRENT_DATE - INTERVAL '14 days' THEN 'churned'
    WHEN last_activity_at < CURRENT_DATE - INTERVAL '7 days' THEN 'dormant'
    ELSE 'active'
  END as status,
  COUNT(*) as retailer_count
FROM pilot_retailers
WHERE first_login_at IS NOT NULL
GROUP BY pilot_id, status;
```

**Retention Rate Calculation:**
```
retention_rate = (active + dormant) / (active + dormant + churned) * 100
```

---

## PART 3: ALERT QUERIES

### 3.1 Dormant Retailers (7–14 Days)

**Query:**
```sql
SELECT 
  pr.id as pilot_retailer_id,
  pr.pilot_id,
  r.id as retailer_id,
  r.name as retailer_name,
  pr.last_activity_at,
  CURRENT_DATE - pr.last_activity_at as days_inactive,
  pr.first_order_at,
  COUNT(o.id) as total_orders,
  pr.readiness_score,
  pr.batch
FROM pilot_retailers pr
JOIN retailers r ON pr.retailer_id = r.id
LEFT JOIN orders o ON pr.retailer_id = o.retailer_id AND pr.pilot_id = o.pilot_id
WHERE pr.pilot_id = $1
  AND pr.last_activity_at < CURRENT_DATE - INTERVAL '7 days'
  AND pr.last_activity_at >= CURRENT_DATE - INTERVAL '14 days'
  AND pr.status != 'churned'
GROUP BY pr.id, pr.pilot_id, r.id, r.name, pr.last_activity_at, 
         pr.first_order_at, pr.readiness_score, pr.batch;
```

**Alert Trigger:**
- Insert into `alerts` table with `alert_type = 'dormant_7d'`
- Send email to support@company.com
- Log in `alert_history` for tracking

---

### 3.2 Churned Retailers (14+ Days)

**Query:**
```sql
SELECT 
  pr.id as pilot_retailer_id,
  pr.pilot_id,
  r.id as retailer_id,
  r.name as retailer_name,
  pr.last_activity_at,
  CURRENT_DATE - pr.last_activity_at as days_inactive,
  pr.first_order_at,
  COUNT(o.id) as total_orders
FROM pilot_retailers pr
JOIN retailers r ON pr.retailer_id = r.id
LEFT JOIN orders o ON pr.retailer_id = o.retailer_id AND pr.pilot_id = o.pilot_id
WHERE pr.pilot_id = $1
  AND pr.last_activity_at < CURRENT_DATE - INTERVAL '14 days'
  AND pr.status != 'churned'
GROUP BY pr.id, pr.pilot_id, r.id, r.name, pr.last_activity_at, pr.first_order_at;
```

**Alert Trigger:**
- Insert into `alerts` table with `alert_type = 'churned_14d'`
- Send email to pilot_pm@company.com (escalation)
- SLA: 4h response time

---

### 3.3 No First Order After 7 Days

**Query:**
```sql
SELECT 
  pr.id as pilot_retailer_id,
  pr.pilot_id,
  r.id as retailer_id,
  r.name as retailer_name,
  pr.account_created_at,
  pr.first_login_at,
  CURRENT_DATE - pr.account_created_at as days_since_created,
  pr.readiness_score,
  pr.batch,
  COALESCE(COUNT(l.id), 0) as login_count
FROM pilot_retailers pr
JOIN retailers r ON pr.retailer_id = r.id
LEFT JOIN login_sessions l ON pr.retailer_id = l.retailer_id 
  AND pr.pilot_id = l.pilot_id
WHERE pr.pilot_id = $1
  AND pr.first_order_at IS NULL
  AND pr.account_created_at < CURRENT_DATE - INTERVAL '7 days'
  AND pr.first_login_at IS NOT NULL
GROUP BY pr.id, pr.pilot_id, r.id, r.name, pr.account_created_at, 
         pr.first_login_at, pr.readiness_score, pr.batch;
```

---

### 3.4 Heavy Legacy Channel Usage (70%+ Non-App)

**Query:**
```sql
WITH channel_stats AS (
  SELECT 
    pr.id as pilot_retailer_id,
    pr.pilot_id,
    pr.retailer_id,
    COUNT(*) as total_orders,
    COUNT(*) FILTER (WHERE o.channel = 'app') as app_orders,
    ROUND(100.0 * COUNT(*) FILTER (WHERE o.channel = 'app') / COUNT(*), 2) as app_percentage
  FROM pilot_retailers pr
  LEFT JOIN orders o ON pr.retailer_id = o.retailer_id AND pr.pilot_id = o.pilot_id
  WHERE pr.pilot_id = $1
  GROUP BY pr.id, pr.pilot_id, pr.retailer_id
  HAVING COUNT(*) >= 5 -- only for retailers with 5+ orders
)
SELECT 
  cs.pilot_retailer_id,
  cs.pilot_id,
  r.id as retailer_id,
  r.name as retailer_name,
  cs.total_orders,
  cs.app_orders,
  100 - cs.app_percentage as non_app_percentage,
  cs.app_percentage
FROM channel_stats cs
JOIN retailers r ON cs.retailer_id = r.id
WHERE cs.app_percentage < 30 -- less than 30% app = more than 70% non-app
ORDER BY cs.app_percentage ASC;
```

---

## PART 4: DASHBOARD API ENDPOINTS

### 4.1 Main Dashboard Data Endpoint

**Endpoint:** `GET /api/v1/admin/pilots/:pilotId/dashboard`

**Response:**
```json
{
  "pilot": {
    "id": "550e8400-...",
    "name": "Pilot Wave 1",
    "status": "active",
    "start_date": "2026-05-12",
    "end_date": "2026-06-09"
  },
  "metrics": {
    "onboarded": {
      "total": 28,
      "target": 35,
      "percentage": 80,
      "status": "on_track"
    },
    "first_orders": {
      "total": 24,
      "percentage": 86,
      "by_batch": {
        "A": { "total": 16, "percentage": 100 },
        "B": { "total": 6, "percentage": 75 },
        "C": { "total": 2, "percentage": 50 }
      }
    },
    "weekly_active": {
      "current_week": 18,
      "percentage": 64,
      "previous_weeks": [24, 22, 20],
      "status": "declining"
    },
    "retention": {
      "active": 26,
      "dormant": 2,
      "churned": 0,
      "rate": 93
    },
    "channel_mix": {
      "app": 78,
      "whatsapp": 16,
      "phone": 5,
      "trend": [65, 70, 75, 78]
    },
    "order_frequency": {
      "pre_pilot_avg": 2.1,
      "current_avg": 2.4,
      "change_percent": 14
    }
  },
  "alerts": [
    {
      "id": "alert-...",
      "type": "churned_14d",
      "retailer_id": "rtl-035",
      "retailer_name": "Fresh Mart",
      "created_at": "2026-05-21T10:00:00Z",
      "status": "open"
    },
    {
      "id": "alert-...",
      "type": "dormant_7d",
      "retailer_id": "rtl-012",
      "retailer_name": "Tony's Market",
      "created_at": "2026-05-21T08:30:00Z",
      "status": "open"
    }
  ],
  "last_updated": "2026-05-21T10:13:00Z"
}
```

---

### 4.2 Retailers List by Status

**Endpoint:** `GET /api/v1/admin/pilots/:pilotId/retailers?status=dormant`

**Query Params:**
- `status`: 'active' | 'dormant' | 'churned' | 'no_orders'
- `batch`: 'A' | 'B' | 'C'
- `segment`: 'high' | 'medium' | 'low'
- `sort_by`: 'last_activity' | 'readiness_score' | 'order_count'

**Response:**
```json
{
  "retailers": [
    {
      "pilot_retailer_id": "...",
      "retailer_id": "rtl-012",
      "name": "Tony's Market",
      "batch": "A",
      "segment": "high",
      "readiness_score": 85,
      "account_created_at": "2026-05-12T09:30:00Z",
      "first_login_at": "2026-05-12T09:45:00Z",
      "first_order_at": "2026-05-12T14:22:00Z",
      "last_activity_at": "2026-05-12T20:00:00Z",
      "total_orders": 1,
      "app_orders": 1,
      "app_percentage": 100,
      "days_inactive": 9,
      "status": "dormant"
    }
  ],
  "total": 2,
  "page": 1,
  "limit": 20
}
```

---

### 4.3 Alert Webhook (for Real-Time Updates)

**Endpoint:** `POST /webhooks/pilot-alerts` (internal)

**Trigger:** When alert conditions met

**Payload:**
```json
{
  "alert_id": "alert-...",
  "pilot_id": "550e8400-...",
  "alert_type": "dormant_7d",
  "retailer_id": "rtl-012",
  "retailer_name": "Tony's Market",
  "severity": "warning",
  "created_at": "2026-05-21T10:00:00Z",
  "action_urls": {
    "send_checkin": "/api/v1/admin/alerts/{alert_id}/send_checkin",
    "contact_retailer": "/api/v1/admin/alerts/{alert_id}/contact",
    "view_details": "/admin/retailers/rtl-012"
  }
}
```

---

## PART 5: BACKGROUND JOBS FOR ALERTING

### 5.1 Daily Alert Job

**Scheduled:** Every day at 9 AM UTC

```python
def daily_pilot_alert_check():
    """
    Run alert checks for all active pilots
    - Dormant (7–14 days)
    - Churned (14+ days)
    - No first order (7+ days)
    - Heavy legacy channel usage
    """
    
    active_pilots = Pilot.query.filter_by(status='active').all()
    
    for pilot in active_pilots:
        # Check dormant retailers
        dormant = check_dormant_retailers(pilot.id)
        for retailer in dormant:
            create_alert(
                pilot_id=pilot.id,
                alert_type='dormant_7d',
                retailer_id=retailer['retailer_id'],
                severity='warning'
            )
            send_email(
                to='support@company.com',
                template='dormant_alert',
                context=retailer
            )
        
        # Check churned retailers
        churned = check_churned_retailers(pilot.id)
        for retailer in churned:
            create_alert(
                pilot_id=pilot.id,
                alert_type='churned_14d',
                retailer_id=retailer['retailer_id'],
                severity='critical'
            )
            send_email(
                to='pilot_pm@company.com',
                template='churn_alert',
                context=retailer
            )
        
        # Check no first order
        no_orders = check_no_first_order_7d(pilot.id)
        for retailer in no_orders:
            create_alert(
                pilot_id=pilot.id,
                alert_type='no_first_order_7d',
                retailer_id=retailer['retailer_id'],
                severity='warning'
            )
            send_email(
                to='onboarding_rep@company.com',
                template='conversion_alert',
                context=retailer
            )
```

---

### 5.2 Metric Refresh Job

**Scheduled:** Every 15 minutes

```python
def refresh_pilot_metrics():
    """Refresh materialized views for dashboard"""
    
    db.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_pilot_weekly_metrics")
    db.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_retailer_pilot_metrics")
    
    # Update in-memory cache for fast dashboard load
    for pilot in Pilot.query.filter_by(status='active').all():
        metrics = calculate_pilot_metrics(pilot.id)
        cache.set(f"pilot:{pilot.id}:metrics", metrics, ttl=15*60)
```

---

## PART 6: FRONTEND COMPONENT SPECS

### 6.1 Dashboard Card Component (React Example)

```jsx
// components/DashboardCard.jsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis } from 'recharts';

export function MetricCard({ title, value, target, trend, status, icon, onClick }) {
  const getStatusColor = (status) => {
    return {
      'on_track': '#10b981',     // green
      'at_risk': '#f59e0b',      // yellow
      'critical': '#ef4444'      // red
    }[status] || '#6b7280';      // gray
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg" onClick={onClick}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div 
          className="px-3 py-1 text-sm font-medium rounded-full"
          style={{ 
            backgroundColor: getStatusColor(status), 
            color: 'white',
            opacity: 0.8
          }}
        >
          {status === 'on_track' && '🟢 On Track'}
          {status === 'at_risk' && '🟡 At Risk'}
          {status === 'critical' && '🔴 Critical'}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-baseline justify-between">
          <span className="text-4xl font-bold text-gray-900">{value}</span>
          {target && <span className="text-sm text-gray-600">/ {target}</span>}
        </div>
        {trend && <span className="text-sm text-gray-600 mt-1">{trend}% change</span>}
      </div>

      {/* Mini sparkline chart if provided */}
      {trend && (
        <div className="h-12">
          <LineChart width={200} height={50} data={trend.data}>
            <Line type="monotone" dataKey="value" stroke={getStatusColor(status)} dot={false} strokeWidth={2} />
          </LineChart>
        </div>
      )}
    </div>
  );
}
```

---

### 6.2 Alert Panel Component (React Example)

```jsx
// components/AlertPanel.jsx
export function AlertPanel({ alerts, onActionClick }) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Alerts ({alerts.length})</h2>
      </div>

      <div className="divide-y">
        {alerts.map(alert => (
          <div key={alert.id} className="px-6 py-4 hover:bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium">
                  {alert.severity === 'critical' && '🔴'} 
                  {alert.severity === 'warning' && '🟡'} 
                  {alert.retailer_name}
                </h4>
                <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
              </div>
              <button
                onClick={() => onActionClick(alert)}
                className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Take Action
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## PART 7: TESTING & VALIDATION

### 7.1 Test Data Seeding

```sql
-- Seed test pilot
INSERT INTO pilots (id, name, status, start_date, end_date, target_retailers)
VALUES ('test-pilot-001', 'Test Wave 1', 'active', '2026-05-12', '2026-06-09', 35);

-- Seed test retailers
INSERT INTO pilot_retailers (pilot_id, retailer_id, batch, frequency_segment, readiness_score, account_created_at, first_login_at, status)
SELECT 
  'test-pilot-001',
  id,
  CASE WHEN ROW_NUMBER() OVER (ORDER BY id) <= 16 THEN 'A'
       WHEN ROW_NUMBER() OVER (ORDER BY id) <= 24 THEN 'B'
       ELSE 'C' END as batch,
  CASE WHEN id LIKE '%01%' THEN 'high'
       WHEN id LIKE '%02%' THEN 'medium'
       ELSE 'low' END as segment,
  FLOOR(RANDOM() * (100 - 40 + 1)) + 40 as score,
  CURRENT_TIMESTAMP - INTERVAL '5 days',
  CURRENT_TIMESTAMP - INTERVAL '4 days',
  'onboarded'
FROM retailers
LIMIT 35;

-- Seed test orders
INSERT INTO orders (pilot_id, retailer_id, order_date, channel, order_total, item_count)
SELECT 
  'test-pilot-001',
  retailer_id,
  CURRENT_TIMESTAMP - INTERVAL (RANDOM() * 5)::int day,
  CASE FLOOR(RANDOM() * 4)
    WHEN 0 THEN 'app'
    WHEN 1 THEN 'whatsapp'
    WHEN 2 THEN 'phone'
    ELSE 'email' END,
  (RANDOM() * 100 + 50)::numeric(10, 2),
  (RANDOM() * 5 + 2)::int
FROM pilot_retailers
WHERE pilot_id = 'test-pilot-001'
GROUP BY retailer_id;
```

---

### 7.2 Dashboard Query Performance Testing

**Expected Query Times:**
- Dashboard load (all metrics): <500ms (cached)
- Retailer list (20 results): <200ms
- Alert generation: <1 second per pilot
- Metric refresh: <30 seconds per pilot

**Optimization Strategies:**
1. Materialize views (refresh every 30 min)
2. Implement query caching (15 min TTL)
3. Use database indexes
4. Paginate retailer lists (max 20 results per page)
5. Async alert processing (background jobs)

---

### 7.3 Alert Accuracy Tests

```python
def test_dormant_alert_triggers():
    """Verify dormant alerts trigger at correct thresholds"""
    
    # Create test retailer with no activity for 7 days
    retailer = create_test_retailer()
    retailer.last_activity_at = datetime.now() - timedelta(days=7)
    db.session.commit()
    
    alerts = check_dormant_retailers(pilot_id)
    assert len(alerts) == 1
    assert alerts[0]['retailer_id'] == retailer.id
    
    # Should NOT trigger at 6 days
    retailer.last_activity_at = datetime.now() - timedelta(days=6)
    db.session.commit()
    
    alerts = check_dormant_retailers(pilot_id)
    assert len(alerts) == 0
```

---

**Document Version:** 1.0  
**Last Updated:** [Current Date]
