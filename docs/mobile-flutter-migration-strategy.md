# SupplySetu Controlled Mobile Stack Migration Strategy

## Intent

This document defines the in-repo migration structure for moving the retailer app from React Native to Flutter without disrupting live ordering continuity.

## Parallel App Strategy

- Keep the existing React Native app in `apps/mobile`.
- Build the Flutter migration app in `apps/mobile_flutter`.
- Reuse the same backend APIs, authentication contracts, and order submission semantics.
- Do not remove any React Native workflow until the Flutter equivalent has passed parity and rollout gates.

## Migration Architecture Diagram Description

1. Retailers continue to use the React Native app during migration.
2. The Flutter app is built in parallel and consumes the same backend APIs.
3. Telemetry for both runtimes must be tagged with runtime, app version, tenant, route, device tier, and release cohort.
4. Rollout decisions must be controlled through staged distribution and segment-based enablement.
5. Rollback must always be possible by routing affected users back to the React Native app version while preserving server-side order continuity.

## Phase Plan

### Phase 1 Foundation

- Establish Flutter project structure and navigation.
- Implement auth and session flow.
- Verify low-end Android performance baseline.

### Phase 2 Catalogue

- Implement product list, search, and pagination.
- Compare scroll performance against the React Native catalogue.

### Phase 3 Order Flow

- Implement cart, checkout, and order submission.
- Validate order completion time and failure handling.

### Phase 4 Behaviour Layer

- Implement order history and order detail.
- Implement notification and retry behavior.
- Validate offline recovery logic.

### Phase 5 Controlled Rollout

- Select a low-risk pilot retailer segment.
- Roll out Flutter in staged batches.
- Monitor crash, latency, and ordering funnel metrics.

### Phase 6 Expansion

- Increase migrated retailer share gradually.
- Decommission React Native only after sustained stability thresholds are met.

## Rollout Segmentation Logic

- Start with internal users and supervised field staff.
- Expand to low-volume routes before high-volume routes.
- Separate by device tier: mid-range first, low-RAM later.
- Separate by network profile: stable coverage first, weak-network clusters later.
- Avoid batching high-risk distributors into the same rollout wave.

## Rollback Strategy

- Keep React Native fully operational during all Flutter rollout phases.
- Preserve server-side idempotent order intent handling so app rollback does not duplicate orders.
- Use staged distribution and release suspension if Flutter telemetry breaches thresholds.
- Revert targeted cohorts first instead of global rollback whenever possible.

## Validation Metrics

- Order placement success rate delta vs React Native
- Crash rate delta vs React Native
- Average order flow completion time
- Session duration stability
- Support ticket trend during rollout

## Effort Guidance

- Foundation scaffold: immediate
- Functional parity by module: staged over multiple releases
- Full runtime replacement: only after parity, telemetry stability, and support load remain acceptable
