# Quick Developer Reference Guide

**SupplySetu Mobile-First B2B Ordering System**  
**For Rapid Implementation & Integration**

---

## 🚀 QUICK START

### Backend API Base URL
```
Development: http://localhost:3000/retailer-api
Production: https://api.supplysetu.com/retailer-api
```

### Mobile App Base URL
```
Android: com.supplysetu.mobile
```

---

## 🔐 AUTHENTICATION FLOW

### Step 1: Get OTP
```bash
curl -X POST http://localhost:3000/retailer-api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210"}'

# Response: {"message": "OTP sent", "otp": "123456"}
```

### Step 2: Verify OTP & Get Tokens
```bash
curl -X POST http://localhost:3000/retailer-api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210", "otp": "123456"}'

# Response:
# {
#   "access_token": "eyJhbGc...",
#   "refresh_token": "eyJhbGc...",
#   "retailer": {...}
# }
```

### Step 3: Use Access Token
```bash
curl -H "Authorization: Bearer eyJhbGc..." \
  http://localhost:3000/retailer-api/auth/distributors
```

---

## 📦 CORE API ENDPOINTS (11 Total)

### Authentication (5)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/login` | Send OTP |
| POST | `/auth/verify` | Verify OTP, get tokens |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/auth/distributors` | List my distributors |
| PUT | `/auth/profile` | Update my profile |

### Catalogue (5)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/catalogue/brands?tenant_id=1` | List brands |
| GET | `/catalogue/brands/:id/products?page=1` | Products by brand (paginated) |
| GET | `/catalogue/search?q=milk&tenant_id=1` | Search products |
| GET | `/catalogue/products/:id?tenant_id=1` | Product details |
| POST | `/catalogue/stock/batch?tenant_id=1` | Check stock (bulk) |

### Orders (5)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/orders/quick-reorder?tenant_id=1` | Recent + frequent items |
| POST | `/orders/create` | Place order |
| GET | `/orders/:id?tenant_id=1` | Order details |
| GET | `/orders/list?tenant_id=1` | Order history |
| GET | `/orders/:id/status?tenant_id=1` | Order status |

---

## 📱 MOBILE SCREENS & IMPLEMENTATION ORDER

### Screen 1: OTP Login ✅ (DONE)
- Path: `apps/mobile/src/screens/auth/OTPLoginScreen.tsx`
- Flow: Phone input → OTP verification → NavigateTo(DistributorSelect)

### Screen 2: Distributor Select ✅ (DONE)
- Path: `apps/mobile/src/screens/distributor/DistributorSelectScreen.tsx`
- Flow: List distributors → Select → NavigateTo(Home)

### Screen 3: Home Screen ✅ (DONE)
- Path: `apps/mobile/src/screens/app/HomeScreen.tsx`
- Sections: Quick Reorder strip + Brand Grid

### Screen 4: Product List ⏳ (NEXT)
- Path: `apps/mobile/src/screens/app/ProductsScreen.tsx`
- API: `GET /catalogue/brands/:id/products?page=1`
- Features: Pagination, lazy images, quantity stepper, add-to-cart

### Screen 5: Search ⏳
- Path: `apps/mobile/src/screens/app/SearchScreen.tsx`
- API: `GET /catalogue/search?q=milk`
- Features: Debounced input (200ms), results list

### Screen 6: Cart ⏳
- Path: `apps/mobile/src/components/CartBottomSheet.tsx`
- Features: Floating bar, expandable drawer, swipe-delete, item count

### Screen 7: Checkout ⏳
- Path: `apps/mobile/src/screens/app/CheckoutScreen.tsx`
- Features: Order review, payment type selection, submit button

### Screen 8: Order Confirmation ⏳
- Path: `apps/mobile/src/screens/app/OrderConfirmationScreen.tsx`
- Features: Order number, status, confirmation token

### Screen 9: Order History ⏳
- Path: `apps/mobile/src/screens/app/OrderHistoryScreen.tsx`
- API: `GET /orders/list?tenant_id=1`
- Features: List, status badges, pagination

### Screen 10: Order Details ⏳
- Path: `apps/mobile/src/screens/app/OrderDetailScreen.tsx`
- API: `GET /orders/:id?tenant_id=1`
- Features: Full details, status timeline, reorder button

---

## 🛠️ KEY CODE PATTERNS

### Auth Context Usage
```typescript
// Login
const { loginWithOTP, verifyOTP, retailer } = useContext(AuthContext);
await loginWithOTP(phone);
await verifyOTP(phone, otp);

// Get distributors & select
const distributors = await getDistributors();
selectDistributor(distributor); // Stores tenant_id
```

### API Calls with Pagination
```typescript
// React Query infinite scroll
const { data, hasNextPage, fetchNextPage } = useInfiniteQuery({
  queryKey: ['products', brandId],
  queryFn: ({ pageParam = 1 }) => 
    fetch(`/catalogue/brands/${brandId}/products?page=${pageParam}`),
  getNextPageParam: (lastPage) => 
    lastPage.has_more ? lastPage.page + 1 : undefined,
});

// Load more
<FlatList
  onEndReached={() => hasNextPage && fetchNextPage()}
  data={data?.pages.flatMap(p => p.products)}
/>
```

### Cart Management
```typescript
// Add item
const { addItem } = useContext(CartContext);
addItem({ product_id: 1, quantity: 24, price: 45 });

// Persist to storage
useEffect(() => {
  AsyncStorage.setItem('cart', JSON.stringify(cart));
}, [cart]);
```

### Order Submission with Idempotency
```typescript
import { v4 as uuid } from 'uuid';

const handleSubmitOrder = async () => {
  const idempotencyKey = uuid();
  
  const response = await fetch('/orders/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tenant_id: selectedDistributor.tenant_id,
      retailer_id: retailer.id,
      line_items: cart.items,
      payment_type: paymentType,
      idempotency_key: idempotencyKey,
      metadata: { delivery_route, instructions }
    })
  });
  
  // Retry-safe: Same idempotencyKey returns cached response
};
```

### Error Handling
```typescript
try {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  return response.json();
} catch (error) {
  if (error.message.includes('min_order_value')) {
    showWarning('Order must be ₹1500 or more');
  } else {
    showError('Order failed. Tap to retry.');
  }
}
```

---

## 📊 DATABASE QUICK REFERENCE

### Key Tables
- `retailers`: Phone-based retailer identity
- `retailer_distributor_links`: Many-to-many with metadata
- `orders`: Order records with idempotency key
- `order_line_items`: Line items with locked prices
- `order_payments`: Payment tracking

### Query Examples
```sql
-- Get retailer by phone
SELECT * FROM retailers WHERE phone = '9876543210';

-- Get connected distributors
SELECT * FROM retailer_distributor_links 
WHERE retailer_id = 1 
ORDER BY last_ordered_at DESC;

-- Get orders with line items
SELECT o.*, item.* 
FROM orders o
LEFT JOIN order_line_items item ON o.id = item.order_id
WHERE o.retailer_id = 1 AND o.tenant_id = 1
ORDER BY o.created_at DESC;

-- Check idempotency (safe retry)
SELECT * FROM orders WHERE idempotency_key = 'uuid-xxx';
```

---

## ⚙️ CONFIGURATION

### Environment Variables
```bash
# Backend
PORT=3000
DATABASE_URL=postgres://user:pass@localhost/supplysetu
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx

# Mobile
API_BASE_URL=http://localhost:3000/retailer-api
```

### React Query Configuration
```typescript
import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 300000,     // 5 min
      gcTime: 600000,        // 10 min
      retry: 3,
      retryDelay: (attempt) => Math.pow(2, attempt) * 1000,
    },
  },
});
```

---

## 🐛 DEBUGGING TIPS

### OTP Not Received?
- Check phone format (10 digits, numeric)
- Rate limit: Max 3 attempts per min
- TTL: 5 minutes expiry

### Order Not Creating?
- Check order total ≥ ₹1500
- Verify line items have valid product_ids
- Check stock availability
- Review idempotency_key (must be UUID format)

### Images Not Loading?
- Check URLs are HTTPS
- Verify tenant has permission to products
- Check image_url field in response

### Pagination Not Working?
- Ensure ?page=1 parameter sent
- Check has_more flag (true = more pages, false = end)
- Verify page_size ≤ 30

### Token Expired?
- Call `POST /auth/refresh` with refresh_token
- Retry original request
- On refresh failure: Logout & require re-login

---

## 📈 PERFORMANCE CHECKLIST

- [ ] API responses <2s (p95)
- [ ] App cold start <8s
- [ ] Images <100KB each
- [ ] Max payload 30 items
- [ ] Debounce search 200ms+
- [ ] Cache brands 1 hour
- [ ] Cache products 30 min
- [ ] Persist cart to disk
- [ ] Retry orders with backoff
- [ ] Monitor error rate <5%

---

## 🔗 USEFUL LINKS

### Documentation
- [Architecture Guide](./mobile-retailer-ordering-architecture.md)
- [API Specification](./retailer-api-specification.md)
- [Implementation Status](./implementation-status.md)

### Code Locations
- Backend: `src/modules/`
- Mobile: `apps/mobile/src/screens/`, `apps/mobile/src/components/`
- Types: `src/shared/types/retailer-ordering.ts`

### External References
- React Query: https://tanstack.com/query/latest
- React Native: https://reactnative.dev
- Knex.js: https://knexjs.org
- JWT: https://jwt.io

---

## 📞 SUPPORT CONTACTS

- **Backend Issues**: Backend team (@github-handle)
- **Mobile Issues**: Mobile team (@github-handle)
- **API Contract**: PM team (@github-handle)
- **Database Schema**: DB team (@github-handle)

---

**Version**: 1.0.0  
**Last Updated**: March 23, 2026  
**Maintained By**: SupplySetu Engineering
