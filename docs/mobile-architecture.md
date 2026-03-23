# SupplySetu Mobile Foundation

## Goals

- Ultra lightweight retailer-facing mobile shell
- Low RAM friendly rendering and navigation
- Optimised for unstable network conditions
- Large readable typography and large tap-target-ready spacing
- Minimal navigation depth

## Stack Choice

- Expo React Native with TypeScript
- Expo Router for shallow route structure
- Secure token storage via `expo-secure-store`
- Response caching via `AsyncStorage`
- Network state via `@react-native-community/netinfo`
- React Query for controlled async state and cache orchestration

## Folder Structure

```text
apps/mobile/
  src/
    app/
      (auth)/
      (app)/
    bootstrap/
    features/
      auth/
        state/
    navigation/
    services/
      api/
      cache/
      storage/
    shared/
      components/
        errors/
        loading/
        ui/
      query/
      theme/
```

## Foundation Capabilities

- API client abstraction with a single request entry point
- Offline-aware request wrapper with bounded retry behavior
- Secure token persistence isolated behind a storage service
- Mobile number plus OTP mock authentication flow with persistent session restore
- Access token refresh before expiry and on `401` retry path
- Logout cleanup that clears secure session state and local caches
- Lightweight local GET response cache for degraded connectivity
- Global app providers and runtime bootstrap
- App-wide error boundary
- Paginated brand-to-product browsing flow with deferred search input
- Instant local cart updates with sticky running total and minimum-order validation
- Payment mode selection and order confirmation with expected delivery date
- Order history with status badges, reorder shortcuts, and delivery timeline views
- Push-style operational updates, inactivity reminder banner, and scheme alert modal pattern
- Large-type theme tokens suitable for low-end Android use

## Performance Notes

- Default query retries are conservative to reduce radio churn on unstable networks.
- GET requests can serve cached responses while offline.
- Non-idempotent mutations are not retried automatically.
- Layout primitives avoid deep component trees and heavy animation dependencies.

## Next Feature Increments

1. Login screen and token refresh flow
2. Retailer catalogue list with cached pagination
3. Repeat last order and draft order flow
4. Order history and delivery tracking
5. Notification inbox and low-bandwidth nudges
