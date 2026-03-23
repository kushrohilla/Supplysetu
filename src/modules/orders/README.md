Orders module foundation for order intent capture, workflow orchestration, and strict lifecycle state management.

## State Machine

Lifecycle:

- `pending_approval -> approved_for_export -> invoiced -> dispatched -> delivered -> closed`
- `pending_approval -> cancelled`
- `approved_for_export -> cancelled`

Guardrails:

- No state skipping
- No duplicate invoice confirmation
- No dispatch before invoiced
- No closure before delivered

Actors:

- `admin`: operational approvals, cancellations, dispatch, delivery updates
- `system`: internal automation
- `sync_worker`: accounting confirmation and reconciliation-driven transitions
