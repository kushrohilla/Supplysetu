# React Native To Flutter Module Map

## Route Mapping

| React Native Route | Flutter Target | Notes |
| --- | --- | --- |
| `src/app/(auth)/welcome.tsx` | `apps/mobile_flutter/lib/features/auth/presentation/welcome_screen.dart` | OTP entry and session bootstrap |
| `src/app/(app)/browse/index.tsx` | `apps/mobile_flutter/lib/features/catalogue/presentation/catalogue_screen.dart` | List/search/pagination benchmark surface |
| `src/app/(app)/checkout/payment.tsx` | `apps/mobile_flutter/lib/features/checkout/presentation/checkout_screen.dart` | Payment mode and submit flow |
| `src/app/(app)/orders/index.tsx` | `apps/mobile_flutter/lib/features/orders/presentation/order_history_screen.dart` | Order history parity |
| `src/app/(app)/orders/[id].tsx` | `apps/mobile_flutter/lib/features/orders/presentation/order_detail_screen.dart` | Detail timeline and reorder |

## Feature Mapping

| React Native Feature Area | Flutter Folder | Migration Notes |
| --- | --- | --- |
| `src/features/auth` | `apps/mobile_flutter/lib/features/auth` | Keep token/session semantics identical |
| `src/features/ordering` | `apps/mobile_flutter/lib/features/catalogue` and `apps/mobile_flutter/lib/features/checkout` | Split browse and order execution clearly |
| `src/features/orders` | `apps/mobile_flutter/lib/features/orders` | Preserve order state wording and history UX |
| `src/features/engagement` | `apps/mobile_flutter/lib/features/engagement` | Keep behavior surfaces behind rollout controls |
| `src/services/api` | `apps/mobile_flutter/lib/core` | Same API contracts, timeout rules, and retry policy |

## Migration Notes

- Do not duplicate backend contracts for Flutter.
- Do not migrate all users at once.
- Keep module ownership explicit so parity can be measured one surface at a time.
