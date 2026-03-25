# Database Migration Implementation Checklist

**Purpose**: Step-by-step guide for executing the domain-driven migration strategy  
**Estimated Duration**: 6–7 days  
**Team Involved**: DevOps, Backend Engineering, Database Admin

---

## Pre-Launch Phase (1 Week Before Migration)

### Week Before: Planning
- [ ] **Schedule migration window** with team (best: low-traffic day/time)
- [ ] **Notify stakeholders**: Sales, Support, Product on expected timeline
- [ ] **Code review**: All 7 new migrations reviewed by 2+ engineers
- [ ] **Read documentation**: Team reads DATABASE_EVOLUTION.md + MIGRATION_REFACTORING_GUIDE.md
- [ ] **Test plan drafted**: Define test cases for each stage

### 3 Days Before: Testing in Staging
- [ ] **Backup production database** (`pg_dump supplysetu > backup-2026-03-25.sql`)
- [ ] **Clone staging schema from production** (or use test instance)
- [ ] **Run all 7 migrations locally**: `npm run migrate:latest --env development`
  ```bash
  # Verify tables created
  psql supplysetu -c "\dt 001_* 002_* 003_* 004_* 005_* 006_* 007_*"
  # Should show 28+ tables
  ```
- [ ] **Verify old tables still exist**: `psql supplysetu -c "\dt legacy_*"`
- [ ] **Test rollback**: `npm run migrate:rollback --steps 7` then re-migrate
- [ ] **Type consistency check**: Run query to verify all FKs use UUIDs
  ```bash
  psql supplysetu << 'EOF'
  -- Check for INT primary keys (should be 0 after migration)
  SELECT table_name, column_name, data_type
  FROM information_schema.columns
  WHERE column_name = 'id' AND data_type = 'integer'
    AND table_name IN (
      SELECT tablename FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
    );
  EOF
  ```

### 1 Day Before: Dry Run
- [ ] **Run full migration sequence on staging**:
  ```bash
  npm run migrate:latest --env staging
  # Verify took <15 minutes
  # Verify no errors in logs
  ```
- [ ] **Run data migration job on staging**:
  ```bash
  npm run job:migrateInventoryData --env staging
  # Verify inventory_movements table populated
  # Verify counts match inventory_snapshots
  ```
- [ ] **Create incident response plan** (if issues occur)
  - Who to call
  - What to monitor
  - Rollback decision criteria
- [ ] **Brief on-call engineer** (they'll be monitoring during execution)

---

## Day 1: Deploy New Migrations

### Morning: Pre-Execution (30 min before)
- [ ] **Announce on Slack**: "#ops: Starting database migration in 30 min"
- [ ] **Verify backup exists**: `ls -lh /backups/supplysetu-2026-03-25.sql`
- [ ] **Scale down API instances** (optional, reduces concurrent writes during migration)
  ```bash
  kubectl scale deployment supplysetu-api --replicas=1
  ```

### 8:00 AM: Execute Migration
- [ ] **Stop application gracefully**:
  ```bash
  pm2 stop supplysetu-app
  # Wait 30 seconds for in-flight requests to complete
  sleep 30
  ```
- [ ] **Run forward migrations**:
  ```bash
  cd /app && npm run migrate:latest --env production
  # Monitor output for errors
  # Should complete in <15 minutes
  ```
- [ ] **Verify new tables exist**:
  ```bash
  psql supplysetu -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '____%';"
  # Should show 28+ tables
  ```
- [ ] **Verify old tables unchanged**:
  ```bash
  psql supplysetu -c "SELECT COUNT(*) FROM inventory_snapshots;" 
  # Should match previous count
  ```
- [ ] **Start application**:
  ```bash
  pm2 start supplysetu-app
  pm2 logs supplysetu-app  # Monitor logs for 5 minutes
  ```
- [ ] **Smoke test**: 
  ```bash
  curl http://localhost:3000/api/health
  # Should return 200 OK
  ```
- [ ] **Scale back up** (if scaled down):
  ```bash
  kubectl scale deployment supplysetu-api --replicas=3
  ```

### 8:30 AM: Post-Migration Verification
- [ ] **Verify application working**:
  - Test: Create new order → should work
  - Test: Query products → should return results
  - Test: View past orders → should work
- [ ] **Check database activity**:
  ```bash
  psql supplysetu -c "SELECT pid, state, query FROM pg_stat_activity LIMIT 10;"
  # Check for long-running queries or locks
  ```
- [ ] **Announce on Slack**: "#ops: Migration Phase 1 complete! New tables created."
- [ ] **Set reminder**: "Start Phase 2 (data migration) in 1 hour"

---

## Day 2-3: Populate New Tables

### Day 2: 9:00 AM - Kickoff Data Migration
- [ ] **Start background migration job**:
  ```bash
  npm run job:migrateInventoryData &
  JOB_PID=$!
  echo $JOB_PID > /var/run/migration.pid
  ```
- [ ] **Monitor progress**:
  ```bash
  # Check every 5 minutes
  watch -n 5 "psql supplysetu -c \"SELECT COUNT(*) FROM inventory_movements;\""
  ```
- [ ] **Log progress**:
  ```bash
  tail -f /var/log/migration.log
  # Should show: "Migrating snapshot X of Y..."
  ```

### During Migration: Anomaly Checks
- [ ] **No application errors** in PM2 logs
- [ ] **Old tables still being queried** (not yet written to)
- [ ] **New tables growing** in row count each minute

### Day 2: 2:00 PM - Completion Verification
- [ ] **Check migration job completed**:
  ```bash
  if [ ! -f /var/run/migration.pid ]; then
    echo "Migration complete"
  else
    kill $(cat /var/run/migration.pid) 2>/dev/null && echo "Still running"
  fi
  ```
- [ ] **Count verification**:
  ```bash
  psql supplysetu << 'EOF'
  SELECT 'inventory_snapshots' as table_name, COUNT(*) as rows 
  FROM inventory_snapshots
  UNION ALL
  SELECT 'inventory_movements', COUNT(*) FROM inventory_movements;
  EOF
  # Movements should be >= snapshots (due to line items movements)
  ```
- [ ] **Data consistency check**:
  ```bash
  psql supplysetu << 'EOF'
  SELECT tp.id, tp.product_name,
    COALESCE(SUM(im.quantity_change), 0) as computed_stock,
    (SELECT MAX(stock_qty) FROM tenant_product_stock_snapshots 
     WHERE tenant_product_id = tp.id) as max_snapshot,
    CASE 
      WHEN COALESCE(SUM(im.quantity_change), 0) = 
           (SELECT MAX(stock_qty) FROM tenant_product_stock_snapshots 
            WHERE tenant_product_id = tp.id) THEN '✓ OK'
      ELSE '✗ MISMATCH'
    END as status
  FROM tenant_products tp
  LEFT JOIN inventory_movements im ON im.tenant_product_id = tp.id
  WHERE tp.tenant_id = (SELECT id FROM tenants LIMIT 1)
  GROUP BY tp.id, tp.product_name;
  EOF
  # All rows should show "✓ OK"
  ```
- [ ] **Announce**: "#ops: Data migration complete! All new tables populated."

---

## Day 4-5: Dual-Write Validation

### Day 4: 8:00 AM - Enable Dual-Write Mode
- [ ] **Prepare dual-write code** (should already be implemented):
  ```typescript
  // Application writes to both tables
  await db('inventory_snapshots').update({ stock_qty: qty });
  await db('inventory_movements').insert({ quantity_change: delta });
  ```
- [ ] **Deploy code with dual-write** (no config change yet):
  ```bash
  git pull && npm run build && pm2 restart supplysetu-app
  ```
- [ ] **Verify dual-write in logs**:
  ```bash
  tail -f /var/log/supplysetu.log | grep -E "inventory_movements|inventory_snapshots"
  # Should see BOTH tables being written to
  ```

### Day 4-5: Continuous Validation

- [ ] **Run reconciliation queries every 12 hours**:
  ```bash
  # Test script: queries/reconciliation-check.sh
  npm run db:reconcile-inventory
  ```
- [ ] **Monitor application metrics**:
  - API response times (should be < 500ms)
  - Error rate (should be 0%)
  - Database connections (should be normal)
  - CPU/Memory usage (should be normal)

- [ ] **Create dashboard** (if applicable):
  - Graph: Inventory snapshot vs. movement stock
  - Graph: New tables row count over time
  - Graph: Application error rate

### Day 5: 5:00 PM - Approval Gate
- [ ] **Database team sign-off**: "Data matches, reconciliation OK"
- [ ] **Backend team sign-off**: "Dual-write working, no errors"
- [ ] **Yes/No decision**: "Ready to cutover?"
  - If **NO**: Debug, extend dual-write period, repeat Day 4-5
  - If **YES**: Proceed to Day 6

- [ ] **Notify team**: "#ops: Cutover approved for tomorrow morning"

---

## Day 6: Feature Flag Cutover

### 7:00 AM: Pre-Cutover
- [ ] **Create incident commander** (single point of contact for issues)
- [ ] **Prepare rollback procedure** (have it ready to execute in 2 minutes)
- [ ] **Alert ops team**: "Cutover in 1 hour"

### 8:00 AM: Execute Cutover
- [ ] **Set feature flag**:
  ```bash
  export USE_MOVEMENT_LEDGER=true
  pm2 restart supplysetu-app
  # No database changes — just code path change
  ```
- [ ] **Verify reading from new table**:
  ```bash
  # Add debug logging to see which table is queried
  tail -f /var/log/supplysetu.log | grep "Reading from: inventory_movements"
  ```
- [ ] **Smoke test**: Create order → check inventory updated
- [ ] **Monitor logs intensely** for 15 minutes:
  - No 404 errors (table not found)
  - No schema errors
  - Response times normal

### 8:15 AM: Post-Cutover Validation
- [ ] **Run quick sanity checks**:
  ```bash
  # Query: Current stock
  curl http://localhost:3000/api/products/abc-123/stock
  # Should return quantity
  
  # Query: Order creation
  curl -X POST http://localhost:3000/api/orders -d '{...}'
  # Should work
  
  # Query: Inventory history
  curl http://localhost:3000/api/admin/inventory/abc-123/movements
  # Should return movements
  ```
- [ ] **Verify old tables NOT being written to**:
  ```bash
  psql supplysetu -c "SELECT n_tup_upd, n_tup_del FROM pg_stat_user_tables WHERE tablename = 'inventory_snapshots';"
  # Numbers should not increase over next 1 hour
  ```

### 8:30 AM: Declare Success
- [ ] **Announce on Slack**: "#ops: ✅ Cutover complete! Using new movement-based schema."
- [ ] **Start 24-hour monitoring** (watch for any anomalies)
- [ ] **Keep ops team on-call** (in case rollback needed)

### 8:30 AM - 6:30 PM: Intensive Monitoring (First Day)

- [ ] **Check every hour**:
  ```bash
  # Query performance
  psql supplysetu -c "EXPLAIN ANALYZE SELECT SUM(quantity_change) FROM inventory_movements WHERE tenant_product_id = 'x';"
  
  # Error logs
  grep -i "error\|exception" /var/log/supplysetu.log | tail -20
  
  # Database connections
  psql supplysetu -c "SELECT count(*) FROM pg_stat_activity;"
  ```

- [ ] **Canary tests** (automated):
  - Create test order → verify shows in new schema
  - Query stock → verify matches expected
  - Report generation → verify works

---

## Day 7: Stability Monitoring

### Throughout the Day
- [ ] **Continue hourly checks** (from Day 6)
- [ ] **Watch error rates**: Should stay at 0%
- [ ] **Monitor query performance**: Should match benchmarks
- [ ] **Check data consistency**: reconciliation-check.sh

### 5:00 PM: Week 1 Review
- [ ] **Team meeting**: Review observations from migration
- [ ] **Document issues** (if any): What went wrong? How to fix?
- [ ] **Update runbooks** with lessons learned
- [ ] **Announce**: "#ops: Week 1 stable! Monitoring continues..."

### Week 1 Complete.
Continue monitoring but reduce to twice-daily checks.

---

## Week 2: Sustained Monitoring

### Daily (2x per day: 9 AM & 5 PM)
- [ ] **Query performance check**: No degradation
- [ ] **Error rate check**: Stays at 0%
- [ ] **Data consistency check**: Reconciliation OK
- [ ] **Application health**: All endpoints working

### Weekly (Every Friday)
- [ ] **Performance report**: Query times, error rates, data volumes
- [ ] **Incident review**: Any issues encountered?
- [ ] **Team retrospective**: What went well? What could improve?

---

## Week 4: Archive Old Tables

### Day 28: Archive Decision
- [ ] **Review migration health**: 4+ weeks of stable operation?
  - If **YES**: Archive old tables
  - If **NO**: Extend monitoring, decide later

### Day 28: Archive Execution
- [ ] **Create backup of old tables** (for compliance):
  ```bash
  pg_dump supplysetu -t inventory_snapshots > /backups/inventory_snapshots-legacy-2026-03-25.sql
  pg_dump supplysetu -t inventory_sync_jobs > /backups/inventory_sync_jobs-legacy-2026-03-25.sql
  ```
- [ ] **Set old tables to read-only** (prevent accidental writes):
  ```sql
  ALTER TABLE inventory_snapshots SET UNLOGGED;
  ALTER TABLE inventory_sync_jobs SET UNLOGGED;
  ```
- [ ] **Update documentation**: Mark old tables as "deprecated" in DATABASE_EVOLUTION.md
- [ ] **Announce**: "#ops: Old inventory tables archived (read-only). Data preserved at s3://backups/"

---

## Rollback Checklist (If Needed)

### Scenario 1: Issues During Data Migration (Day 2)
- [ ] **Stop migration job**: `kill $(cat /var/run/migration.pid)`
- [ ] **Decision**: 
  - If minor: Re-run migration job (idempotent)
  - If critical: Skip to Scenario 3
- [ ] **New tables** already exist (keep them)
- [ ] **Continue testing** after fix
- [ ] **Re-run migration job** with fix

### Scenario 2: Issues During Dual-Write (Day 4-5)
- [ ] **Disable dual-write** in code → deploy

```typescript
// Comment out:
// await db('inventory_movements').insert({ ... });
```

- [ ] **Verify**: Old table still being written to
- [ ] **Fix**: Debug dual-write code
- [ ] **Re-enable** after fix
- [ ] **Redeploy** and resume Day 4-5

### Scenario 3: Critical Issues After Cutover (Day 6+)
- [ ] **Incident commander calls**: Stop all other work
- [ ] **Flip feature flag back**:
  ```bash
  export USE_MOVEMENT_LEDGER=false
  pm2 restart supplysetu-app
  ```
- [ ] **Verify**: Application reading from old table
- [ ] **Smoke test**: Ensure working (1-2 minutes)
- [ ] **NO database rollback needed** (new tables remain)
- [ ] **Post-incident review**: Why did this happen?

### Scenario 4: Complete System Failure
- [ ] **Restore from backup**:
  ```bash
  # Stop application
  pm2 stop supplysetu-app
  
  # Restore database
  psql supplysetu < /backups/supplysetu-2026-03-25.sql
  
  # Restart application with old code
  git checkout {old_commit}
  npm install && npm run build
  pm2 start supplysetu-app
  ```
- [ ] **Engage incident response team** for post-mortem
- [ ] **Downtime**: ~30 minutes total

---

## Sign-Off Template

When each phase completes, have the relevant team lead sign-off:

```
Phase 1: Deploy New Migrations
Date: 2026-03-25
DevOps Lead: ________________
Status: ☐ PASS ☐ FAIL
Notes: _______________________________________________________

Phase 2: Data Migration  
Date: 2026-03-26/27
Database Admin: ________________
Status: ☐ PASS ☐ FAIL
Notes: _______________________________________________________

Phase 3: Dual-Write Validation
Date: 2026-03-28/29
Backend Lead: ________________
Status: ☐ PASS ☐ FAIL
Notes: _______________________________________________________

Phase 4: Feature Flag Cutover
Date: 2026-03-30
Incident Commander: ________________
Status: ☐ PASS ☐ FAIL
Notes: _______________________________________________________

Phase 5: Sustained Monitoring (Week 1)
Date: 2026-03-31 to 2026-04-06
Monitor: ________________
Status: ☐ STABLE ☐ ISSUES
Notes: _______________________________________________________
```

---

## Quick Reference: Common Commands

```bash
# Check migration status
npm run migrate:status --env production

# Run migrations
npm run migrate:latest --env production

# Rollback last migration
npm run migrate:rollback --steps 1 --env production

# Monitor migration progress
watch -n 5 "psql supplysetu -c \"SELECT COUNT(*) FROM inventory_movements;\""

# Check data consistency
psql supplysetu -c "$(cat queries/reconciliation-check.sql)"

# View application logs
pm2 logs supplysetu-app

# Check database performance
psql supplysetu << 'EOF'
SELECT schemaname, tablename, seq_scan, idx_scan
FROM pg_stat_user_tables
ORDER BY seq_scan DESC LIMIT 10;
EOF

# View feature flag status
echo $USE_MOVEMENT_LEDGER
```

---

## Emergency Contacts

| Role | Name | Phone | Notes |
|------|------|-------|-------|
| Incident Commander | [TBD] | 📱 | Primary decision maker |
| Database Admin | [TBD] | 📱 | Performs rollback if needed |
| Backend Lead | [TBD] | 📱 | Code changes, debugging |
| DevOps Lead | [TBD] | 📱 | Infrastructure, monitoring |
| VP Engineering | [TBD] | 📱 | Executive escalation |

---

## Document Version

- **v1.0** - Created 2026-03-25
- **v1.1** - [To be updated post-execution]

---

**This checklist must be completed in order. Do not skip steps. Contact incident commander immediately if any step fails.**

