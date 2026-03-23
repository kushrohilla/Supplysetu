# SupplySetu Flutter Feature Parity Checklist

## Runtime Foundations

- Authentication flow matches React Native behavior
- Session restore and logout match React Native behavior
- API base URL and timeout policy match current production rules
- Crash and performance telemetry are enabled

## Catalogue

- Product listing parity
- Search behavior parity
- Pagination parity
- Price and scheme label parity
- Low-end device scrolling benchmark passed

## Checkout

- Cart state parity
- Minimum order validation parity
- Payment mode parity
- Order submission parity
- Error and retry handling parity

## Orders

- Order history parity
- Order detail parity
- Status timeline parity
- Reorder behavior parity

## Engagement

- Notification banner parity
- Scheme alert parity
- Inactivity reminder parity

## Operational Gates

- Order success rate within threshold
- Crash rate within threshold
- Session stability within threshold
- Support tickets not materially elevated
- Rollback path verified before batch expansion
