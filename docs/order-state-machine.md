# Order State Machine

## Transition Diagram

Primary workflow:

`pending_approval -> approved_for_export -> invoiced -> dispatched -> delivered -> closed`

Cancellation exits:

- `pending_approval -> cancelled`
- `approved_for_export -> cancelled`

No other transitions are valid. Orders cannot skip stages, rewind, or move out of terminal states.

## Actor Rules

- `admin`
  - `pending_approval -> approved_for_export`
  - `pending_approval -> cancelled`
  - `approved_for_export -> cancelled`
  - `invoiced -> dispatched`
  - `dispatched -> delivered`
- `system`
  - all admin transitions
  - `approved_for_export -> invoiced`
  - `delivered -> closed`
- `sync_worker`
  - `approved_for_export -> invoiced`
  - `delivered -> closed`

This keeps invoice confirmation and financial closure tied to controlled internal or accounting-driven actors rather than manual admin updates.

## Edge Cases

- Duplicate invoice confirmation is rejected with `DUPLICATE_INVOICE_CONFIRMATION`.
- Dispatch before invoice confirmation is rejected with `DISPATCH_BEFORE_INVOICE`.
- Closure before delivery confirmation is rejected with `CLOSE_BEFORE_DELIVERED`.
- Repeated updates to the current terminal state are rejected as duplicate status updates.
- Concurrent updates are rejected with `ORDER_STATUS_CONFLICT` when the persisted status no longer matches the expected current state.
- Cancelled and closed orders are terminal and cannot transition further.

## Error Response Structure

Invalid transitions should return HTTP `409` with a consistent body:

```json
{
  "error": {
    "code": "INVALID_ORDER_TRANSITION",
    "message": "Cannot transition order from pending_approval to dispatched",
    "details": {
      "currentStatus": "pending_approval",
      "requestedStatus": "dispatched",
      "allowedNextStatuses": ["approved_for_export", "cancelled"]
    }
  }
}
```

Role violations should return HTTP `403`:

```json
{
  "error": {
    "code": "ORDER_TRANSITION_ROLE_FORBIDDEN",
    "message": "Role admin cannot transition order from approved_for_export to invoiced",
    "details": {
      "actorRole": "admin",
      "currentStatus": "approved_for_export",
      "requestedStatus": "invoiced",
      "allowedActorRoles": ["system", "sync_worker"]
    }
  }
}
```
