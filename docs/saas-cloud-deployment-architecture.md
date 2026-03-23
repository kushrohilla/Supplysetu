# Cloud Deployment Architecture

## 1. Overview

Multi-tenant SaaS platform on Kubernetes with auto-scaling, tenant isolation, and disaster recovery. Cloud-agnostic design (deployable on AWS EKS, GCP GKE, Azure AKS).

### Design Goals
- Horizontal scaling: Add app instances without downtime
- Tenant isolation: Data breach doesn't compromise other tenants
- Cost efficiency: Under-utilized resources auto-scale down
- High availability: 99.9% uptime SLA
- Disaster recovery: RTO <1 hour, RPO <15 min

---

## 2. Deployment Topology

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      CDN (CloudFlare)                       │
│          (Static assets, DDoS protection, SSL)              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│              Load Balancer (Cloud LB / Ingress)             │
│         (Route by subdomain, SSL termination)               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│      Kubernetes Cluster (3 Availability Zones)              │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         API Application Pods (Auto-scaled)             │ │
│  │                                                        │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │ │
│  │  │  App-1   │  │  App-2   │  │  App-3   │ ...        │ │
│  │  │  Node.js │  │  Node.js │  │  Node.js │            │ │
│  │  │  Port 80 │  │  Port 80 │  │  Port 80 │            │ │
│  │  └──────────┘  └──────────┘  └──────────┘            │ │
│  │                                                        │ │
│  │  Min: 3 pods | Target: Auto-scale to 50 @ 70% CPU    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │      Worker Pods (Async Jobs / Background Tasks)      │ │
│  │                                                        │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │ │
│  │  │ Worker-1 │  │ Worker-2 │  │ Worker-3 │ ...        │ │
│  │  │Bull Queue│  │Bull Queue│  │Bull Queue│            │ │
│  │  └──────────┘  └──────────┘  └──────────┘            │ │
│  │                                                        │ │
│  │  Min: 1 pod | Target: Auto-scale to 20 @ jobs queue  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │             Redis Cache (StatefulSet)                 │ │
│  │                                                        │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │ │
│  │  │  Redis-1 │  │  Redis-2 │  │  Redis-3 │ (Cluster) │ │
│  │  │  Master  │  │  Replica │  │  Replica │            │ │
│  │  └──────────┘  └──────────┘  └──────────┘            │ │
│  │                                                        │ │
│  │  Persistent Volume: 100GB SSD (replicated)            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       │               │               │
       v               v               v
  ┌─────────┐    ┌──────────┐    ┌─────────┐
  │ Postgres │    │  Postgres │    │ Postgres │
  │ Primary  │    │ Replica 1 │    │ Replica 2│
  │  (Write) │    │  (Read)   │    │  (Read)  │
  └─────────┘    └──────────┘    └─────────┘
       │               │               │
       └───────────────┼───────────────┘
                       │
            (Multi-AZ Managed RDS)
            (Automated backups, encryption)
```

### Environment Separation

```
┌────────────────────────────────────────────────────┐
│               Development Cluster                  │
│                                                    │
│  ✓ Single-node K8s (minikube or small VM)          │
│  ✓ PostgreSQL (small instance, daily backup)       │
│  ✓ Shared Redis (no replication)                   │
│  ✓ App replicas: 1-2 (low HA requirement)          │
│  ✓ Domain: dev-api.supplysetu.dev                  │
│  ✓ HTTPS: self-signed cert                         │
│  ✓ Cost: ~$200/month                               │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│             Staging/QA Cluster                     │
│                                                    │
│  ✓ 3-node K8s (production-like)                    │
│  ✓ PostgreSQL (medium instance, multi-AZ)          │
│  ✓ Redis cluster (3 nodes, replicated)             │
│  ✓ App replicas: 3-5 (staging HA)                  │
│  ✓ Auto-scale: yes (test scaling logic)            │
│  ✓ Domain: staging-api.supplysetu.com              │
│  ✓ Data: Encrypted copy of prod (weekly)           │
│  ✓ Cost: ~$800/month                               │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│           Production Cluster (Multi-AZ)            │
│                                                    │
│  ✓ Multi-region (active-passive failover)          │
│  ✓ 3 AZ per region (9 total nodes)                 │
│  ✓ PostgreSQL (large instance, multi-AZ sync)      │
│  ✓ Redis cluster (6 nodes, HA + persistence)       │
│  ✓ App replicas: 10-50+ (aggressive scaling)       │
│  ✓ Auto-scale: 70% CPU → +5 pods                   │
│  ✓ Domain: api.supplysetu.com (global CDN)         │
│  ✓ SLA: 99.99% (4 nines)                           │
│  ✓ Cost: ~$8,000/month (baseline)                  │
│  ✓ Disaster recovery: RTO <1hr, RPO <15min         │
└────────────────────────────────────────────────────┘
```

---

## 3. Kubernetes Resource Configuration

### Namespace Isolation

```yaml
# namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: supplysetu-api
  labels:
    app: supplysetu
    environment: production

---
apiVersion: v1
kind: Namespace
metadata:
  name: supplysetu-workers
  labels:
    app: supplysetu-workers
    environment: production

---
apiVersion: v1
kind: Namespace
metadata:
  name: supplysetu-infra
  labels:
    app: supplysetu-infra
    environment: production
```

### Application Deployment (Auto-scaling)

```yaml
# deployment-api.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: supplysetu-api
  namespace: supplysetu-api
spec:
  replicas: 3  # Min replicas
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 0  # Zero downtime rolling updates

  selector:
    matchLabels:
      app: supplysetu-api
      tier: application

  template:
    metadata:
      labels:
        app: supplysetu-api
        tier: application
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8000"
        prometheus.io/path: "/metrics"

    spec:
      affinity:
        # Pod Disruption Budget: Keep at least 2 pods running
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - supplysetu-api
                topologyKey: kubernetes.io/hostname

      containers:
        - name: api
          image: supplysetu/api:v1.0.0  # Pinned version
          imagePullPolicy: IfNotPresent

          ports:
            - name: http
              containerPort: 8000
              protocol: TCP

          # Environment variables
          env:
            - name: NODE_ENV
              value: "production"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
            - name: REDIS_URL
              valueFrom:
                configMapKeyRef:
                  name: app-config
                  key: redis-url
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: jwt-secrets
                  key: secret

          # Health checks
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3

          readinessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 10
            periodSeconds: 5

          # Resource requests/limits
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi

          # Graceful shutdown
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 15"]

---
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: supplysetu-api-hpa
  namespace: supplysetu-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: supplysetu-api

  minReplicas: 3
  maxReplicas: 50

  metrics:
    # Scale on CPU utilization
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70

    # Scale on memory utilization
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80

    # Custom metric: API response time
    - type: Pods
      pods:
        metric:
          name: http_request_duration_seconds
        target:
          type: AverageValue
          averageValue: "500m"

  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 100
          periodSeconds: 30
```

### Service Definition (Internal Load Balancing)

```yaml
# service-api.yaml
apiVersion: v1
kind: Service
metadata:
  name: supplysetu-api-service
  namespace: supplysetu-api
  labels:
    app: supplysetu-api

spec:
  type: LoadBalancer  # Exposes to external load balancer
  selector:
    app: supplysetu-api
    tier: application

  ports:
    - name: http
      port: 80
      targetPort: http
      protocol: TCP

  sessionAffinity: ClientIP  # Sticky sessions (optional)
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600

  # In load balancer for health checks
  healthCheckNodePort: 30000
```

### Ingress Configuration (Multi-tenant Routing)

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: supplysetu-ingress
  namespace: supplysetu-api
  annotations:
    # SSL/TLS termination
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    # Rate limiting and WAF
    nginx.ingress.kubernetes.io/limit-rps: "1000"
    nginx.ingress.kubernetes.io/enable-modsecurity: "true"

spec:
  ingressClassName: nginx

  tls:
    - hosts:
        - "*.supplysetu.com"
        - "supplysetu.com"
        - "*.supplysetu.dev"
      secretName: wildcard-tls

  rules:
    # Primary domain + subdomains (tenant routing)
    - host: "*.supplysetu.com"
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: supplysetu-api-service
                port:
                  number: 80

    # Direct API endpoint
    - host: "api.supplysetu.com"
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: supplysetu-api-service
                port:
                  number: 80

    # Staging
    - host: "*.supplysetu.dev"
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: supplysetu-api-service
                port:
                  number: 80
```

---

## 4. Database Scaling Strategy

### PostgreSQL Multi-AZ Setup

```yaml
# rds-postgresql.yaml (AWS example, adapts to GCP/Azure)
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
  namespace: supplysetu-infra

data:
  max_connections: "200"  # Increased for connection pooling
  shared_buffers: "256MB"
  effective_cache_size: "1GB"
  maintenance_work_mem: "64MB"
  checkpoint_completion_target: "0.9"
  wal_buffers: "16MB"
  default_statistics_target: "100"
  max_parallel_workers: "4"

---
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: supplysetu-postgres
  namespace: supplysetu-infra

spec:
  instances: 3  # Primary + 2 replicas

  # PostgreSQL version
  imageName: ghcr.io/cloudnative-pg/postgresql:15

  # Primary instance
  primaryUpdateStrategy: unsupervised

  # Backup strategy
  backup:
    barmanObjectStore:
      destinationPath: s3://supplysetu-backups/postgres
      s3Credentials:
        accessKeyId:
          name: s3-credentials
          key: access-key
        secretAccessKey:
          name: s3-credentials
          key: secret-key
    retentionPolicy: "30d"

  # Recovery options
  recovery:
    recoveryCron: "0 2 * * *"  # Daily backups

  # Monitoring
  monitoring:
    enabled: true
    podMonitorSelector:
      matchLabels:
        prometheus: "true"

  postgresql:
    parameters:
      max_connections: "200"
      log_statement: "mod"  # Log DDL/DML
      log_duration: "on"

  # Persistent storage
  storage:
    size: 500Gi  # Initial size (auto-scales)
    storageClass: ssd-gp3
```

### Connection Pooling (PgBouncer)

```yaml
# pgbouncer-pooler.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pgbouncer-config
  namespace: supplysetu-infra

data:
  pgbouncer.ini: |
    [databases]
    supplysetu = host=postgres-primary.supplysetu-infra port=5432 dbname=supplysetu

    [pgbouncer]
    pool_mode = transaction  # Transaction-level pooling for multi-tenant
    max_client_conn = 1000   # Max client connections
    default_pool_size = 25   # Connections per database
    min_pool_size = 10
    reserve_pool_size = 5
    reserve_pool_timeout = 3
    max_db_connections = 100
    max_user_connections = 50

    # Query logging
    query_wait_timeout = 120
    client_connect_timeout = 10
    client_idle_timeout = 600
    client_lifetime = 3600

    # Security
    authentication_type = md5
    transport_user_credentials = yes

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgbouncer
  namespace: supplysetu-infra

spec:
  replicas: 3  # 3 PgBouncer instances for HA
  selector:
    matchLabels:
      app: pgbouncer

  template:
    metadata:
      labels:
        app: pgbouncer

    spec:
      containers:
        - name: pgbouncer
          image: pgbouncer:1.18-alpine
          ports:
            - containerPort: 6432
          volumeMounts:
            - name: config
              mountPath: /etc/pgbouncer

      volumes:
        - name: config
          configMap:
            name: pgbouncer-config
```

### Read Replica for Analytics

```typescript
// Query routing: analytics queries to replica
export class DatabaseRouter {
  static async executeQuery(
    query: string,
    params: any[],
    options?: { read_replica?: boolean }
  ) {
    // Detect: SELECT queries can use read replica
    const isReadOnly = query.trim().toUpperCase().startsWith('SELECT');
    const useReplica = isReadOnly && options?.read_replica !== false;

    const pool = useReplica ? this.replicaPool : this.primaryPool;

    return pool.query(query, params);
  }

  private static primaryPool = new Pool({
    // Connect to primary instance (write operations)
    host: process.env.DB_PRIMARY_HOST,
    port: 5432
  });

  private static replicaPool = new Pool({
    // Connect to read replica (analytics queries)
    host: process.env.DB_REPLICA_HOST,
    port: 5432,
    // Route to replica for load distribution
    application_name: 'analytics'
  });
}
```

---

## 5. CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
    paths-ignore:
      - 'docs/**'

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Lint code
        run: npm run lint

      - name: Run tests
        run: npm run test:coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/supplysetu_test

      - name: Security scan
        run: npm run audit

      - name: Build Docker image
        run: |
          docker build -t supplysetu/api:${{ github.sha }} .
          docker tag supplysetu/api:${{ github.sha }} supplysetu/api:latest

      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_REGISTRY_PASSWORD }} | docker login -u ${{ secrets.DOCKER_REGISTRY_USERNAME }} --password-stdin
          docker push supplysetu/api:${{ github.sha }}
          docker push supplysetu/api:latest

  deploy-staging:
    needs: build-and-test
    runs-on: ubuntu-latest

    steps:
      - name: Deploy to staging
        run: |
          kubectl set image deployment/supplysetu-api \
            api=supplysetu/api:${{ github.sha }} \
            -n supplysetu-api \
            --kubeconfig=${{ secrets.KUBE_CONFIG }}

      - name: Run smoke tests
        run: |
          curl -f https://staging-api.supplysetu.com/health || exit 1

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && success()

    steps:
      - name: Backup production database
        run: |
          pg_dump ${{ secrets.PROD_DATABASE_URL }} > backup-${{ github.sha }}.sql
          aws s3 cp backup-${{ github.sha }}.sql s3://supplysetu-backups/

      - name: Deploy to production
        run: |
          kubectl set image deployment/supplysetu-api \
            api=supplysetu/api:${{ github.sha }} \
            -n supplysetu-api \
            --kubeconfig=${{ secrets.PROD_KUBE_CONFIG }}
          kubectl rollout status deployment/supplysetu-api -n supplysetu-api

      - name: Verify health
        run: |
          for i in {1..30}; do
            curl -f https://api.supplysetu.com/health && exit 0
            sleep 2
          done
          exit 1

      - name: Smoke tests
        run: npm run test:e2e:prod
```

### Canary Deployment Strategy

```yaml
# canary-deployment.yaml (using Flagger)
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: supplysetu-api
  namespace: supplysetu-api
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: supplysetu-api

  progressDeadlineSeconds: 60

  # Service mesh (Istio)
  service:
    port: 80
    targetPort: 8000

  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10

    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m

      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m

    webhooks:
      - name: integration-tests
        url: http://flagger-loadtester/
        timeout: 30s
        metadata:
          type: smoke
          cmd: "curl -sd 'test' http://supplysetu-api-canary:80/api/v1/health"

  # Rollback on failure
  skipAnalysis: false
```

---

## 6. Infrastructure as Code (Terraform)

### Terraform Configuration

```hcl
# terraform/main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
  }

  backend "s3" {
    bucket         = "supplysetu-terraform-state"
    key            = "production"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-lock"
  }
}

provider "aws" {
  region = var.aws_region
}

# EKS Cluster
resource "aws_eks_cluster" "supplysetu" {
  name            = "supplysetu-prod"
  role_arn        = aws_iam_role.eks_cluster.arn
  version         = "1.27"

  vpc_config {
    subnet_ids              = var.private_subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = true
  }

  enabled_cluster_log_types = [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler"
  ]

  tags = {
    Name        = "supplysetu-prod"
    Environment = "production"
  }
}

# Auto-scaling group
resource "aws_eks_node_group" "supplysetu" {
  cluster_name    = aws_eks_cluster.supplysetu.name
  node_group_name = "supplysetu-nodes"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = var.private_subnet_ids

  scaling_config {
    desired_size = 9
    max_size     = 30
    min_size     = 9
  }

  instance_types = ["t3.xlarge"]

  tags = {
    Name = "supplysetu-node-group"
  }
}

# RDS PostgreSQL
resource "aws_rds_cluster" "supplysetu" {
  cluster_identifier      = "supplysetu-postgres"
  engine                  = "aurora-postgresql"
  engine_version          = "15.2"
  database_name           = "supplysetu"
  master_username         = var.db_admin_username
  master_password         = random_password.db_password.result
  database_subnet_group_name = aws_db_subnet_group.exploremore.name

  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.postgres.name

  enabled_cloudwatch_logs_exports = ["postgresql"]
  storage_encrypted               = true
  kms_key_id                      = aws_kms_key.rds.arn

  backup_retention_period      = 30
  preferred_backup_window      = "03:00-04:00"
  preferred_maintenance_window = "sun:04:00-sun:05:00"

  skip_final_snapshot       = false
  final_snapshot_identifier = "supplysetu-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  tags = {
    Name = "supplysetu-postgres"
  }
}

# Redis ElastiCache
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "supplysetu-redis"
  engine               = "redis"
  node_type           = "cache.r6g.xlarge"
  num_cache_nodes      = 3
  parameter_group_name = "default.redis7"
  engine_version       = "7.0"
  port                 = 6379

  security_group_ids = [aws_security_group.redis.id]
  subnet_group_name  = aws_elasticache_subnet_group.redis.name

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth.result

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  tags = {
    Name = "supplysetu-redis"
  }
}

# S3 for backups/assets
resource "aws_s3_bucket" "supplysetu" {
  bucket = "supplysetu-prod-bucket"
  tags = {
    Name = "supplysetu-prod"
  }
}

resource "aws_s3_bucket_versioning" "supplysetu" {
  bucket = aws_s3_bucket.supplysetu.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "supplysetu" {
  bucket = aws_s3_bucket.supplysetu.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
```

---

## 7. Disaster Recovery

### Backup Strategy

```
Daily Backup Schedule:
├─ Full backup: 02:00 UTC (daily)
├─ Incremental: Every 6 hours
├─ Transaction logs: Every 15 minutes
├─ Retention: 30 days

Point-in-Time Recovery (PITR):
├─ Recovery Window: 30 days
├─ RTO: <15 minutes
├─ RPO: <5 minutes

Backup Locations:
├─ Primary: S3 (same region)
├─ Secondary: S3 (cross-region replication, different account)
├─ Tertiary: On-premise vault (compliance)
```

### Failover Procedure

```bash
#!/bin/bash
# failover.sh - Invoke cross-region failover

set -e

echo "🚨 INITIATING FAILOVER PROCEDURE"
echo "Source Region: us-east-1"
echo "Target Region: us-west-2"

# 1. Verify primary is down
if curl -s https://api.supplysetu.com/health | grep -q "healthy"; then
  echo "❌ Primary region still responding. Abort failover."
  exit 1
fi

# 2. Promote read replica to primary
echo "📊 Promoting US-West-2 replica to primary..."
aws rds promote-read-replica \
  --db-instance-identifier supplysetu-replica-west \
  --region us-west-2

# 3. Wait for promotion
aws rds wait db-instance-available \
  --db-instance-identifier supplysetu-replica-west \
  --region us-west-2

# 4. Update DNS to new region
echo "🔄 Updating Route53 DNS..."
aws route53 change-resource-record-sets \
  --hosted-zone-id ZONE123 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.supplysetu.com",
        "Type": "A",
        "TTL": 60,
        "ResourceRecords": [{"Value": "1.1.1.1"}]
      }
    }]
  }'

# 5. Deploy app to failover cluster
echo "🚀 Redeploying to US-West-2 cluster..."
kubectl --context=us-west-2 rollout restart deployment/supplysetu-api

# 6. Run health checks
echo "✅ Running health checks..."
for i in {1..60}; do
  if curl -s https://api.supplysetu.com/health | grep -q "healthy"; then
    echo "✅ FAILOVER SUCCESSFUL - API healthy in US-West-2"
    exit 0
  fi
  echo "⏳ Health check $i/60..."
  sleep 5
done

echo "❌ FAILOVER FAILED - API not responding after 5 minutes"
exit 1
```

---

## 8. Monitoring & Alerts

### Prometheus Scrape Configuration

```yaml
# prometheus.yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'supplysetu-api'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - supplysetu-api
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### Alert Rules

```yaml
# alerting-rules.yaml
groups:
  - name: supplysetu
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate (5xx responses)"
          dashboard: "{{ $labels.job }}"

      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        annotations:
          severity: "critical"
          summary: "PostgreSQL not responding"

      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.9
        for: 2m
        annotations:
          summary: "Redis memory usage > 90%"

      - alert: KubernetesNodeNotReady
        expr: kube_node_status_condition{condition="Ready",status="true"} == 0
        for: 5m
        annotations:
          severity: "critical"
          summary: "Kubernetes node not ready"
```

---

## Summary

**Production-grade cloud architecture:**
1. ✅ Multi-AZ Kubernetes with horizontal auto-scaling (3-50 pods)
2. ✅ PostgreSQL multi-AZ with read replicas for analytics
3. ✅ Redis cluster for caching + session storage
4. ✅ CI/CD pipeline with canary deployments
5. ✅ Disaster recovery: RTO <15min, RPO <5min
6. ✅ Terraform for reproducible infrastructure
7. ✅ Monitoring, alerting, and observability

**Cost Optimization:**
- Dev: ~$200/month
- Staging: ~$800/month
- Production: ~$8,000/month (scales with demand)
