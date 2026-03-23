# SaaS Observability Framework

## 1. Overview

Production observability: logs → metrics → traces, all tenant-scoped. Platform operators detect and isolate failures to specific tenants in real-time.

### Three Pillars
- **Logs**: Centralized ingestion, tenant tagging, searchable
- **Metrics**: Performance latency, error rates, throughput per tenant
- **Traces**: Request flow across services, pinpoint latency sources
- **Incidents**: Auto-detection, severity classification, routing

---

## 2. Central Logging Pipeline

### Log Aggregation Architecture

```
┌──────────────┐
│ App Instances│ (structured JSON logs, tenant_id tagged)
└──────┬───────┘
       │ fluent-bit
       │
       v
┌─────────────────────┐
│  Kafka Message Queue │ (topic: logs)
└──────┬──────────────┘
       │ consumers
       v
┌─────────────────────┐
│ Elasticsearch/ELK   │ (5 days hot, 30 days warm, 1 year cold)
└─────────────────────┘
       │
       ├──→ Kibana (dashboard)
       ├──→ Alerts (ELK watcher)
       └──→ Archive (S3)
```

### Logger Implementation

```typescript
// src/services/logger.service.ts

import winston, { createLogger, format } from 'winston';

export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: {
    service: 'supplysetu-api',
    environment: process.env.NODE_ENV
  },
  transports: [
    // Console (dev)
    new winston.transports.Console({
      format: format.simple()
    }),
    
    // Structured logs → Kafka
    new KafkaTransport({
      topic: 'logs',
      clientId: 'app-1',
      brokers: process.env.KAFKA_BROKERS?.split(',')
    })
  ]
});

/**
 * Attach tenant context to all logs
 */
export const attachTenantContext = (req: TenantRequest, res: Response, next: NextFunction) => {
  // Create child logger with tenant context
  const childLogger = logger.child({
    tenant_id: req.tenantId,
    request_id: uuid.v4(),
    user_id: req.user?.id,
    ip_address: req.ip,
    user_agent: req.get('user-agent')
  });

  req.log = childLogger;
  next();
};

// Usage in route handlers
app.get('/api/v1/orders', attachTenantContext, async (req, res) => {
  req.log.info('Fetching orders', {
    skip: req.query.skip,
    limit: req.query.limit
  });

  // ... operation ...

  req.log.info('Orders fetched successfully', {
    count: 25,
    duration_ms: 145
  });
});
```

### Log Format (Structured JSON)

```json
{
  "timestamp": "2026-03-21T10:30:15.234Z",
  "level": "info",
  "message": "Order created",
  "service": "supplysetu-api",
  "environment": "production",
  "tenant_id": "tenant-uuid-123",
  "request_id": "req-uuid-456",
  "user_id": "user-uuid-789",
  "action": "order:create",
  "resource_id": "order-uuid-001",
  "details": {
    "order_amount": 25000,
    "retailer_name": "ABC Kirana",
    "payment_method": "online",
    "duration_ms": 234
  },
  "metadata": {
    "ip_address": "203.0.113.42",
    "user_agent": "Mobile/5.0",
    "correlation_id": "corr-uuid"
  }
}
```

### Elasticsearch Mapping

```json
{
  "mappings": {
    "properties": {
      "timestamp": { "type": "date" },
      "tenant_id": { "type": "keyword" },
      "request_id": { "type": "keyword" },
      "level": { "type": "keyword" },
      "message": { "type": "text" },
      "action": { "type": "keyword" },
      "error_message": { "type": "text" },
      "error_stack": { "type": "text" },
      "service": { "type": "keyword" },
      "duration_ms": { "type": "integer" }
    }
  }
}
```

---

## 3. Metrics & Monitoring

### Prometheus Metrics (Application)

```typescript
// src/middleware/metrics.middleware.ts

import client from 'prom-client';

// HTTP request metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'tenant_id'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'tenant_id']
});

// Business metrics
const ordersCreatedTotal = new client.Counter({
  name: 'orders_created_total',
  help: 'Total orders created',
  labelNames: ['tenant_id', 'payment_method', 'status']
});

const ordersValueSum = new client.Counter({
  name: 'orders_value_sum_inr',
  help: 'Sum of order values in INR',
  labelNames: ['tenant_id']
});

const apiCallsTotal = new client.Counter({
  name: 'api_calls_total',
  help: 'Total API calls',
  labelNames: ['tenant_id', 'endpoint']
});

// Database metrics
const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['query_type', 'table', 'tenant_id'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
});

const dbConnectionPoolSize = new client.Gauge({
  name: 'db_connection_pool_size',
  help: 'Database connection pool size',
  labelNames: ['pool_type']
});

// Cache metrics
const cacheHits = new client.Counter({
  name: 'cache_hits_total',
  help: 'Cache hits',
  labelNames: ['cache_key', 'tenant_id']
});

const cacheMisses = new client.Counter({
  name: 'cache_misses_total',
  help: 'Cache misses',
  labelNames: ['cache_key', 'tenant_id']
});

/**
 * Middleware: Record HTTP request metrics
 */
export const metricsMiddleware = (req: TenantRequest, res: Response, next: NextFunction) => {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function(data) {
    const duration = (Date.now() - start) / 1000;

    httpRequestDuration
      .labels(req.method, req.baseUrl, res.statusCode, req.tenantId)
      .observe(duration);

    httpRequestTotal
      .labels(req.method, req.baseUrl, res.statusCode, req.tenantId)
      .inc();

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Record business metrics
 */
export const recordOrder = (tenantId: string, order: Order) => {
  ordersCreatedTotal
    .labels(tenantId, order.payment_method, order.status)
    .inc();

  ordersValueSum
    .labels(tenantId)
    .inc(order.total_amount);
};

/**
 * Metrics export endpoint
 */
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});
```

### Custom Metrics (Business KPIs)

```typescript
// src/metrics/business-kpis.ts

export class BusinessMetrics {
  /**
   * Track tenant-specific KPIs
   */
  static async updateTenantKPIs(tenantId: string) {
    // Daily orders
    const today = await db.query(
      `SELECT COUNT(*) as count FROM orders
       WHERE tenant_id = $1
       AND DATE(created_at) = CURRENT_DATE`,
      [tenantId]
    );

    gauge_orders_today
      .labels(tenantId)
      .set(today.rows[0].count);

    // Retailers with orders this month
    const activeRetailers = await db.query(
      `SELECT COUNT(DISTINCT retailer_id) FROM orders
       WHERE tenant_id = $1
       AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)`,
      [tenantId]
    );

    gauge_active_retailers_mtd
      .labels(tenantId)
      .set(activeRetailers.rows[0].count);

    // Payment success rate (last 100 transactions)
    const paymentSuccess = await db.query(
      `SELECT
        COUNT(CASE WHEN status = 'success' THEN 1 END)::float / COUNT(*) * 100 as rate
       FROM payments
       WHERE tenant_id = $1
       ORDER BY created_at DESC LIMIT 100`,
      [tenantId]
    );

    gauge_payment_success_rate
      .labels(tenantId)
      .set(paymentSuccess.rows[0].rate);
  }
}

// Update every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  const tenants = await db.query(`SELECT id FROM tenants WHERE status = 'active'`);
  for (const { id } of tenants.rows) {
    await BusinessMetrics.updateTenantKPIs(id);
  }
});
```

---

## 4. Distributed Tracing

### OpenTelemetry Setup

```typescript
// src/tracing.ts

import { NodeTracerProvider } from '@opentelemetry/node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { SimpleSpanProcessor } from '@opentelemetry/tracing';
import { registerInstrumentations } from '@opentelemetry/auto-instrumentations-node';

// Initialize Jaeger exporter
const jaegerExporter = new JaegerExporter({
  serviceName: 'supplysetu-api',
  host: process.env.JAEGER_HOST || 'localhost',
  port: parseInt(process.env.JAEGER_PORT || '6831')
});

// Setup tracing
const tracerProvider = new NodeTracerProvider();
tracerProvider.addSpanProcessor(new SimpleSpanProcessor(jaegerExporter));

// Auto-instrument popular libraries
registerInstrumentations({
  tracerProvider
});

export const tracer = tracerProvider.getTracer('supplysetu-api');

/**
 * Attach trace context to all requests
 */
export const tracingMiddleware = (req: TenantRequest, res: Response, next: NextFunction) => {
  const span = tracer.startSpan(`HTTP ${req.method} ${req.baseUrl}`);

  span.setAttributes({
    'http.method': req.method,
    'http.url': req.originalUrl,
    'http.status_code': res.statusCode,
    'tenant_id': req.tenantId,
    'user_id': req.user?.id
  });

  const originalSend = res.send;
  res.send = function(data) {
    span.setAttributes({
      'http.status_code': res.statusCode
    });
    span.end();
    return originalSend.call(this, data);
  };

  next();
};

app.use(tracingMiddleware);
```

### Trace Example: Order Creation

```
Request: POST /api/v1/orders
  ├─ Span: HTTP POST /api/v1/orders (total: 245ms)
  │
  ├─ Span: validate_order_payload (duration: 5ms)
  │
  ├─ Span: db_query_retailer_info (duration: 25ms)
  │  └─ Span: db_connection_acquire (5ms)
  │  └─ Span: db_execute (15ms)
  │  └─ Span: db_connection_release (5ms)
  │
  ├─ Span: calculate_order_total (duration: 8ms)
  │
  ├─ Span: process_payment (duration: 150ms)
  │  ├─ Span: payment_gateway_request (140ms)
  │  └─ Span: verify_response (5ms)
  │
  ├─ Span: db_query_insert_order (duration: 20ms)
  │
  ├─ Span: publish_event (duration: 10ms)
  │  └─ Span: kafka_produce (8ms)
  │
  └─ Response: 201 Created (total: 245ms)
```

---

## 5. Alert Rules & Thresholds

### Alert Classification

```yaml
# alerting-rules.yaml

groups:
  - name: supplysetu-saas
    interval: 30s
    rules:
      # CRITICAL ALERTS (immediate page)
      - alert: CriticalErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 2m
        annotations:
          severity: "critical"
          summary: "{{ $labels.tenant_id }}: Error rate >5%"
          dashboard: "https://monitoring.supplysetu.com/d/{{ $labels.tenant_id }}"

      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        annotations:
          severity: "critical"
          summary: "PostgreSQL not responding"

      - alert: PaymentGatewayTimeout
        expr: rate(payment_gateway_timeout_total[5m]) > 0.1
        for: 3m
        annotations:
          severity: "critical"
          summary: "{{ $labels.tenant_id }}: Payment failures >10%"

      # HIGH PRIORITY ALERTS (1 hour SLA)
      - alert: HighLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 5
        for: 10m
        annotations:
          severity: "high"
          summary: "{{ $labels.tenant_id }}: P95 latency >5s"

      - alert: DatabaseConnectionPoolExhausted
        expr: db_connection_pool_size{pool_type="active"} / db_connection_pool_size{pool_type="max"} > 0.9
        for: 5m
        annotations:
          severity: "high"
          summary: "Database connection pool >90% utilized"

      - alert: CacheHitRateDropped
        expr: rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m])) < 0.7
        for: 15m
        annotations:
          severity: "high"
          summary: "{{ $labels.tenant_id }}: Cache hit rate <70%"

      # MEDIUM PRIORITY ALERTS (4 hour SLA)
      - alert: SyncFailureBacklog
        expr: sync_failure_queue_length > 1000
        for: 30m
        annotations:
          severity: "medium"
          summary: "{{ $labels.tenant_id }}: Sync failure backlog >1000 items"

      - alert: DiskSpaceWarning
        expr: node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.15
        for: 10m
        annotations:
          severity: "medium"
          summary: "Disk space <15% available"

      - alert: HighMemoryUsage
        expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.85
        for: 10m
        annotations:
          severity: "medium"
          summary: "Pod memory usage >85%"

      # LOW PRIORITY ALERTS (next business day)
      - alert: AuditLogBacklogHigh
        expr: audit_log_queue_length > 10000
        for: 2h
        annotations:
          severity: "low"
          summary: "Audit log backlog growing"
```

### Alert Routing (PagerDuty Integration)

```typescript
// src/services/alert-routing.service.ts

export class AlertRoutingService {
  /**
   * Route alerts based on severity + tenant
   */
  static async routeAlert(alert: AlertEvent) {
    const { severity, tenant_id, message } = alert;

    // Get escalation policy for tenant
    const escalation = await this.getEscalationPolicy(tenant_id, severity);

    // Create incident in PagerDuty
    const incident = await pagerduty.incidents.create({
      incident: {
        type: 'incident',
        title: message,
        service: {
          id: `service_${tenant_id}`,
          type: 'service_reference'
        },
        urgency: severity === 'critical' ? 'high' : 'low',
        escalation_policy: escalation,
        body: {
          type: 'incident_body',
          details: JSON.stringify(alert)
        }
      }
    });

    // Notify on Slack (dev channel or tenant channel)
    await this.notifySlack(tenant_id, severity, message);

    // Log alert
    await db.query(
      `INSERT INTO alert_history (tenant_id, severity, message, incident_id)
       VALUES ($1, $2, $3, $4)`,
      [tenant_id, severity, message, incident.id]
    );
  }

  private static async getEscalationPolicy(
    tenantId: string,
    severity: string
  ) {
    // Critical: immediate page to ops team
    if (severity === 'critical') {
      return process.env.PAGERDUTY_CRITICAL_ESCALATION;
    }
    // High: 15-min escalation
    if (severity === 'high') {
      return process.env.PAGERDUTY_HIGH_ESCALATION;
    }
    // Medium: notify operations channel
    return process.env.PAGERDUTY_MEDIUM_ESCALATION;
  }

  private static async notifySlack(
    tenantId: string,
    severity: string,
    message: string
  ) {
    const channel = severity === 'critical'
      ? '#ops-alerts'
      : `#tenant-${tenantId}-alerts`;

    await slack.chat.postMessage({
      channel,
      text: `🚨 ${severity.toUpperCase()}: ${message}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${severity.toUpperCase()}*\n${message}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Dashboard' },
              url: `https://monitoring.supplysetu.com/tenant/${tenantId}`
            }
          ]
        }
      ]
    });
  }
}
```

---

## 6. Incident Severity Classification

### Severity Matrix

```
┌─────────────┬──────────────────────────────────────┬─────────┬──────────┐
│ Level       │ Definition                           │ SLA     │ Audience │
├─────────────┼──────────────────────────────────────┼─────────┼──────────┤
│ CRITICAL    │ Service down, data loss, security    │ 15 min  │ CTO, VP  │
│             │ breach, all tenants affected         │         │ Ops      │
├─────────────┼──────────────────────────────────────┼─────────┼──────────┤
│ HIGH        │ Single tenant down, >5% error rate,  │ 1 hour  │ Ops team │
│             │ payment failures, data corruption    │         │          │
├─────────────┼──────────────────────────────────────┼─────────┼──────────┤
│ MEDIUM      │ Degraded for tenant, <5% errors,    │ 4 hours │ Support  │
│             │ slow performance, non-critical data  │         │ Ops      │
├─────────────┼──────────────────────────────────────┼─────────┼──────────┤
│ LOW         │ Minor issues, warnings, log backlog  │ 1 day   │ Ops team │
│             │ during business hours                │         │ (async)  │
└─────────────┴──────────────────────────────────────┴─────────┴──────────┘
```

### Incident Classification Algorithm

```typescript
// src/services/incident-classifier.service.ts

export class IncidentClassifier {
  static classify(metric: AlertMetric): SeverityLevel {
    // Rule 1: Database down → CRITICAL
    if (metric.type === 'database_down') {
      return SeverityLevel.CRITICAL;
    }

    // Rule 2: All tenants affected → CRITICAL
    if (metric.affected_tenants_count > 50) {
      return SeverityLevel.CRITICAL;
    }

    // Rule 3: Payment failures >10% → HIGH
    if (metric.type === 'payment_failure' && metric.rate > 0.1) {
      return SeverityLevel.HIGH;
    }

    // Rule 4: Single tenant down (high GMV) → HIGH
    if (metric.type === 'tenant_down') {
      const tenant = await getTenant(metric.tenant_id);
      if (tenant.monthly_gmv > 1000000) { // >10 lakh
        return SeverityLevel.HIGH;
      }
      return SeverityLevel.MEDIUM;
    }

    // Rule 5: Error rate >5% → HIGH
    if (metric.error_rate > 0.05) {
      return SeverityLevel.HIGH;
    }

    // Rule 6: Latency P95 >5s → MEDIUM (if persistent)
    if (metric.p95_latency > 5000) {
      return SeverityLevel.MEDIUM;
    }

    // Default
    return SeverityLevel.LOW;
  }
}
```

---

## 7. Uptime Reporting

### Uptime SLA Tracking

```typescript
// src/services/uptime-tracking.service.ts

export class UptimeTracker {
  /**
   * Calculate monthly uptime for tenant
   */
  static async getMonthlyUptime(tenantId: string, month: string) {
    // month format: "2026-03"

    const downtime = await db.query(
      `SELECT
        SUM(EXTRACT(EPOCH FROM (end_time - start_time))) / 60 as total_minutes
       FROM incident_history
       WHERE tenant_id = $1
       AND severity IN ('critical', 'high')
       AND DATE_TRUNC('month', start_time) = $2::date`,
      [tenantId, `${month}-01`]
    );

    const totalMinutesInMonth = 30 * 24 * 60; // Assume 30-day month
    const downtimeMinutes = downtime.rows[0].total_minutes || 0;
    const uptimePercentage = ((totalMinutesInMonth - downtimeMinutes) / totalMinutesInMonth * 100);

    return {
      month,
      uptime_percentage: uptimePercentage.toFixed(3),
      downtime_minutes: downtimeMinutes,
      sla_target: 99.9,
      sla_met: uptimePercentage >= 99.9
    };
  }

  /**
   * Generate SLA credits if below threshold
   */
  static async calculateSLACredit(tenantId: string, month: string) {
    const uptime = await this.getMonthlyUptime(tenantId, month);

    if (uptime.sla_met) {
      return { credit_percentage: 0 };
    }

    // Tiered SLA credits
    const uptimePercent = parseFloat(uptime.uptime_percentage);

    let creditPercent = 0;
    if (uptimePercent < 99) creditPercent = 100; // Full refund
    if (uptimePercent >= 99 && uptimePercent < 99.5) creditPercent = 50;
    if (uptimePercent >= 99.5 && uptimePercent < 99.9) creditPercent = 10;

    return { credit_percentage: creditPercent };
  }
}
```

### GET /reporting/uptime-sla

```typescript
response.200 {
  tenant_id: "uuid",
  reporting_period: "2026-03",
  
  uptime: {
    percentage: 99.95,
    target: 99.9,
    status: "exceeds_sla",
    downtime_minutes: 19
  },
  
  incidents: [
    {
      start_time: "2026-03-15T14:30:00Z",
      end_time: "2026-03-15T14:35:00Z",
      severity: "high",
      reason: "Database connection pool exhausted",
      impact_duration_minutes: 5
    }
  ],
  
  sla_credit: {
    applicable: false,
    credit_percentage: 0,
    reason: "Uptime exceeds SLA target"
  },
  
  pdfReport: "https://api.supplysetu.com/reports/uptime/2026-03/pdf"
}
```

---

## 8. Observability Dashboard (Grafana)

### Key Dashboards

```
1. Platform Overview
   ├─ Global error rate
   ├─ Total active tenants
   ├─ Global GMV (last 24h)
   ├─ Top 10 error-prone endpoints
   └─ Database connection pool status

2. Per-Tenant Dashboard
   ├─ Orders today | yesterday | trend
   ├─ Error rate (tenant-specific)
   ├─ Latency P50/P95/P99
   ├─ API call distribution
   ├─ Payment success rate
   └─ Active users

3. Infrastructure
   ├─ Pod CPU/Memory utilization
   ├─ Database connections
   ├─ Disk space
   ├─ Network I/O
   └─ Cache hit rate

4. Business Health
   ├─ Adoption curve vs cohort
   ├─ Monthly recurring revenue
   ├─ Payment discipline
   ├─ Retention cohort analysis
   └─ Support ticket volume (correlated)
```

---

## 9. Summary

**Observability System:**
1. ✅ Centralized logging (tenant-scoped, searchable)
2. ✅ Metrics (application + business KPIs)
3. ✅ Distributed tracing (request flow visualization)
4. ✅ Alert routing (PagerDuty + Slack)
5. ✅ Severity classification (automatic routing)
6. ✅ SLA tracking + credit calculation
7. ✅ Uptime reporting (per-tenant)

**Deployment:**
```bash
# Deploy observability stack
docker-compose -f docker-compose.observability.yml up

# Components
- Elasticsearch (logs)
- Prometheus (metrics)
- Grafana (dashboards)
- Jaeger (traces)
- AlertManager (routing)
- Kafka (log streaming)

# Access
- Kibana: http://localhost:5601
- Grafana: http://localhost:3000
- Jaeger: http://localhost:16686
```

**Key SLOs:**
- Platform availability: 99.9% (4 nines)
- P95 latency: <500ms
- Error rate: <0.5%
- Payment success: >99%
- Alert response time: <15min (critical)
