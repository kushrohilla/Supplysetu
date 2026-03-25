# Auth Module - Summary

## Purpose
Handles authentication and authorization for retailers. Manages OTP-based login, JWT token generation/refresh, and user profile management.

## Main Entities
- **Retailer** - End user account with phone-based identity
- **OTP** - One-time password for login verification (6-digit)
- **AccessToken** - JWT for authenticated requests (1-day expiry)
- **RefreshToken** - JWT for token refresh (7-day expiry)

## Active API Routes
- `POST /auth/login` — Send OTP to phone (SMS via Twilio)
- `POST /auth/verify` — Verify OTP, return JWT tokens
- `POST /auth/refresh` — Refresh access token using refresh token
- `GET /auth/distributors` — List connected distributors for retailer
- `POST /auth/profile` — Update retailer profile information

## Implementation Completion Status

| Component | Status | Notes |
|-----------|--------|-------|
| OTP Generation | ✅ 100% | Generates 6-digit code |
| OTP Storage | ⚠️ 60% | Code written, Redis integration TODO |
| JWT Tokens | ✅ 100% | Generation and validation complete |
| Token Refresh | ✅ 100% | Proper rotation strategy |
| Middleware Auth | 🔴 40% | Token verification incomplete |
| Profile Updates | ✅ 100% | Database persistence working |

## Pending Logic Areas
1. **Redis Integration (TODO_IMPLEMENTATION_REQUIRED)** — OTP storage/retrieval
   - Location: `services/AuthService.ts: storeOTP()`, `verifyOTP()`
   - Blocked on: Redis client initialization in infrastructure layer

2. **SMS Gateway Integration (TODO_IMPLEMENTATION_REQUIRED)** — Twilio SMS sending
   - Location: `controllers/AuthController.ts: loginWithOTP()`
   - Blocked on: Twilio API configuration

3. **Middleware Auth Completion (TODO_IMPLEMENTATION_REQUIRED)** — Token verification in requests
   - Location: `middleware/authMiddleware.ts`
   - Required for: `/auth/distributors`, `/auth/profile`, all protected routes

## Key Implementation Details
- OTP valid for 10 minutes
- Tokens use HS256 HMAC signing
- Access tokens: 1 day, Refresh tokens: 7 days
- Retailer identity tied to phone number (primary key)

## Testing Notes
- In development mode, OTP response includes code for testing
- Mock OTP: accepts any 6-digit code when not connected to Redis
