# Retailer Onboarding UX Flows: First Login & First Order

## Overview

This document specifies the **in-app experience flows** for first-time retailer users during their initial onboarding session. These flows are designed for **guided, hand-held experiences** where an onboarding representative walks the retailer through the platform and the retailer places their first order.

**UX Optimization Goals:**
1. **Zero friction:** Every step is clear, no ambiguity
2. **Hand-holding:** Guided coaching at each stage (tooltips, inline help, context-driven hints)
3. **Momentum:** Fast progress from login → dashboard → search → cart → order
4. **Success celebration:** Positive reinforcement at order completion
5. **Barrier removal:** Error states handled gently; quick recovery paths

---

## FLOW 1: FIRST LOGIN & ONBOARDING WELCOME

### Screen 1.1: Login Screen (Initial Load)

**State:** App opened for first time by retailer

**Visual Layout:**
```
┌─────────────────────────────────┐
│          [Platform Logo]         │
│                                 │
│    Welcome to [Platform Name]   │  (h1, 24pt)
│                                 │
│    Sign in below to get started │  (p, 14pt, gray)
│                                 │
│  ┌─────────────────────────────┐│
│  │ Email/Username [_________]  ││  (text input, placeholder)
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ Password [______________]   ││  (password input, placeholder)
│  └─────────────────────────────┘│
│                                 │
│  [ SIGN IN ] (blue, bold)       │
│                                 │
│  ┌─────────────────────────────┐│
│  │ ⓘ First time? We sent your  ││  (info box, light blue)
│  │   login details via email.   ││
│  │   Check spam if you don't    ││
│  │   see it.                    ││
│  │ [ Contact Support ]          ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

**Key Features:**
- Placeholder text hints at what goes in each field
- Info box explains where credentials came from (email)
- "Contact Support" link offers help path; no dead ends
- Submit button prominent, high contrast (blue)

**Copy:**
- **Email/Username placeholder:** "name@email.com"
- **Password placeholder:** "●●●●●●●●"
- **Info box:** "ⓘ First time? We sent your login details via email. Check spam if you don't see it. [Contact Support]"
- **Button:** "SIGN IN"

**Error States:**

*Username/Password Incorrect:*
```
┌─────────────────────────────────┐
│          [Platform Logo]         │
│                                 │
│    Welcome to [Platform Name]   │
│                                 │
│  ⚠️ Login Failed                 │  (red banner, top of form)
│     Check your email and         │
│     password, then try again.    │
│                                 │
│  ┌─────────────────────────────┐│
│  │ Email/Username [_________]  ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ Password [______________]   ││
│  └─────────────────────────────┘│
│                                 │
│  [ SIGN IN ]                    │
│                                 │
│  [ Forgot Password? ]           │  (link)
│  [ Contact Support ]            │  (link)
└─────────────────────────────────┘
```

*Network Connection Error:*
```
┌─────────────────────────────────┐
│          [Platform Logo]         │
│                                 │
│  ⚠️ Connection Error             │  (yellow banner)
│     Check your internet          │
│     connection and try again.    │
│                                 │
│  ┌─────────────────────────────┐│
│  │ Email/Username [_________]  ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ Password [______________]   ││
│  └─────────────────────────────┘│
│                                 │
│  [ SIGN IN ]  [ RETRY ]         │
│  [ Contact Support ]            │
└─────────────────────────────────┘
```

**Interaction:**
- User enters credentials (email provided by onboarding rep)
- Taps "SIGN IN"
- Loading spinner for 2–3 seconds
- On success → Screen 1.2

---

### Screen 1.2: Welcome & Onboarding Intro

**State:** User logged in for first time; dashboard loads

**Visual Layout:**
```
┌─────────────────────────────────┐
│  [Platform Logo]  Account ⋮     │  (header)
│                                 │
│  🎉 Welcome! Let's Get Started   │  (h1, 26pt, celebratory)
│                                 │
│  Hi [Retailer Name],            │  (personalized greeting)
│  We're excited to help you       │
│  streamline ordering.            │
│                                 │
│  ┌─────────────────────────────┐│
│  │ Here's what we'll do today: ││  (card, light gray bg)
│  │                             ││
│  │ 1️⃣ Tour the platform      ││
│  │    See how easy it is      ││
│  │                             ││
│  │ 2️⃣ Build your first order ││
│  │    Add 3-4 products         ││
│  │                             ││
│  │ 3️⃣ Submit your order      ││
│  │    Get order # in hand     ││
│  │                             ││
│  │ 4️⃣ Set up for next time   ││
│  │    Favorites, alerts        ││
│  │                             ││
│  └─────────────────────────────┘│
│                                 │
│  [ LET'S GO! ]  [ TELL ME MORE ]│
│                                 │
│  ┌─────────────────────────────┐│
│  │ ⓘ See a Tip?               ││  (optional)
│  │   Look for 💡 icons        ││
│  │   throughout the app—      ││
│  │   we'll guide you.          ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

**Key Features:**
- Celebratory tone (🎉, "Let's Get Started")
- Clear 4-step agenda
- "LET'S GO!" button prominent (action, momentum)
- Tip about help icons (preps user for guidance)

**Copy:**
- **Heading:** "🎉 Welcome! Let's Get Started"
- **Greeting:** "Hi [Retailer Name], we're excited to help you streamline ordering."
- **Steps:**
  1. "1️⃣ Tour the platform – See how easy it is"
  2. "2️⃣ Build your first order – Add 3–4 products"
  3. "3️⃣ Submit your order – Get order # in hand"
  4. "4️⃣ Set up for next time – Favorites, alerts"
- **Buttons:** "LET'S GO!" | "TELL ME MORE"
- **Tip:** "💡 See a Tip? Look for 💡 icons throughout the app—we'll guide you."

**Interaction:**
- User taps "LET'S GO!" → Screen 2.1 (Dashboard Tour)
- OR taps "TELL ME MORE" → Expands FAQ section (collapsible)
- Back button disabled (no escape until first order placed, or explicit "Skip" option)

---

## FLOW 2: GUIDED DASHBOARD TOUR

### Screen 2.1: Dashboard Overview (Annotated)

**State:** First-time user lands on main dashboard

**Visual Layout:**
```
┌─────────────────────────────────┐
│  [Logo]  Home  🔔  Account  ⋮   │  (header with nav tabs)
│                                 │
│  👋 Your Dashboard              │  (h2, with casual wave)
│  [Personalized greeting]        │
│                                 │
│  ┌─ Quick Stats ────────────────┐│
│  │ 💰 Year-to-Date Spend        ││  (card, mini stats)
│  │    $0 (New account)          ││
│  │                              ││
│  │ 📦 Total Orders              ││
│  │    0 (First order coming!)   ││
│  │                              ││
│  │ ⏱️ Time Saved                ││
│  │    ~5 min/order avg          ││
│  └──────────────────────────────┘│
│                                 │
│  ┌─ Navigation Guide ───────────┐│
│  │ 💡 Let's take a quick tour   ││  (guided hint card)
│  │                              ││
│  │ Tap "Catalog" → Browse       ││
│  │ products & search             ││
│  │ [ Next → ]                   ││
│  └──────────────────────────────┘│
│                                 │
│  ┌─ Bottom Navigation ──────────┐│
│  │ [Home] [Catalog] [Orders]    ││  (tabs, highlighted)
│  │        [Account]              ││
│  └──────────────────────────────┘│
│                                 │
│  ┌─ Info: Key Features ─────────┐│
│  │ 🔍 Search – Find products    ││
│  │ ❤️ Favorites – Save items    ││
│  │ 🛒 Cart – Build orders       ││
│  │ 📊 Reports – Track spending  ││
│  └──────────────────────────────┘│
└─────────────────────────────────┘
```

**Key Features:**
- **Personalization:** Greeting uses retailer name; stats are tailored
- **Guided Hint:** Card with clear next step ("Tap Catalog")
- **Visual Hierarchy:** Dashboard tab highlighted; other tabs visible but secondary
- **Navigation Labels:** Each bottom-nav item has simple label
- **Onboarding Rep Role:** Rep points and says "See the Catalog tab? Tap that and we'll see products."

**Copy:**
- **Heading:** "👋 Your Dashboard"
- **Stats Cards:**
  - "💰 Year-to-Date Spend: $0 (New account)"
  - "📦 Total Orders: 0 (First order coming!)"
  - "⏱️ Time Saved: ~5 min/order avg"
- **Guided Hint:**
  - "💡 Let's take a quick tour"
  - "Tap 'Catalog' → Browse products & search"
  - "[ Next → ]"
- **Info Box:**
  - "🔍 Search – Find products"
  - "❤️ Favorites – Save items"
  - "🛒 Cart – Build orders"
  - "📊 Reports – Track spending"

**Interaction:**
- "[ Next → ]" button appears in guided hint
- Tapping it highlights the "Catalog" tab with pulsing animation
- Tapping "Catalog" → Screen 3.1

---

## FLOW 3: GUIDED PRODUCT CATALOG & SEARCH

### Screen 3.1: Catalog Home (Browse View)

**State:** User lands on Catalog; first product browsing

**Visual Layout:**
```
┌─────────────────────────────────┐
│  [Logo]  Catalog  🔔  Account   │  (header)
│                                 │
│  📦 Your Product Catalog        │  (h2)
│                                 │
│  ┌─ Search & Filter ────────────┐│
│  │ 🔍 [Search products...____] ││  (search bar, active)
│  │                              ││
│  │ [ All Categories ▼ ]         ││  (dropdown, can expand)
│  │ [ Price ▼ ] [ Supplier ▼ ]  ││  (filter shortcuts)
│  └──────────────────────────────┘│
│                                 │
│  ┌─ Featured Categories ────────┐│  (with onboarding context)
│  │                              ││
│  │ [Dairy]  [Beverages]         ││
│  │ [Frozen]  [Snacks]           ││
│  │ [Produce]  [Bakery]          ││
│  │                              ││
│  └──────────────────────────────┘│
│                                 │
│  ┌─ Guided Hint ────────────────┐│
│  │ 💡 Try searching for        ││  (coaching tip)
│  │    something you order      ││
│  │    regularly. E.g., "milk"  ││
│  │ [ Search Now ]              ││
│  └──────────────────────────────┘│
│                                 │
│  ┌─ Pro Tip ────────────────────┐│
│  │ ⭐ Use the search bar—       ││
│  │    it's the fastest way     ││
│  │    to find products.        ││
│  └──────────────────────────────┘│
└─────────────────────────────────┘
```

**Key Features:**
- **Search Emphasized:** Search bar is prominent, focused, ready to type
- **Categories Visible:** But secondary to search (search is faster for first-time)
- **Guided Hint:** Encourages search with example ("milk")
- **Pro Tip:** Reinforces best practice

**Copy:**
- **Heading:** "📦 Your Product Catalog"
- **Search Placeholder:** "Search products..."
- **Dropdowns:** "All Categories ▼", "Price ▼", "Supplier ▼"
- **Categories:** Dairy, Beverages, Frozen, Snacks, Produce, Bakery
- **Guided Hint:**
  - "💡 Try searching for something you order regularly. E.g., 'milk'"
  - "[ Search Now ]"
- **Pro Tip:**
  - "⭐ Use the search bar—it's the fastest way to find products."

**Interaction:**
- Rep says: "Search for something you order regularly. Let's try milk."
- User taps search bar (cursor appears)
- Types "milk"
- → Screen 3.2

---

### Screen 3.2: Search Results

**State:** User typed search query; results displayed

**Visual Layout:**
```
┌─────────────────────────────────┐
│  [Logo]  Catalog  🔔  Account   │
│                                 │
│  🔍 Search: "milk"              │  (shows query)
│  Found 12 results               │
│                                 │
│  ┌─ Result Filters ─────────────┐│
│  │ [ All Suppliers ▼ ]          ││  (refine results)
│  │ [ Price: Low-High ▼ ]        ││
│  └──────────────────────────────┘│
│                                 │
│  ┌─ Result #1 ──────────────────┐│
│  │ [Product Image]              ││
│  │ Brand Whole Milk 2L          ││
│  │ Supplier: Dairy Co           ││
│  │ $3.50 / unit  |  $18/case    ││
│  │ ✓ In stock                   ││
│  │ [ Add to Cart ▼ ]            ││  (primary button)
│  └──────────────────────────────┘│
│                                 │
│  ┌─ Result #2 ──────────────────┐│
│  │ [Product Image]              ││
│  │ Premium Whole Milk 2L        ││
│  │ Supplier: Fresh Dairies      ││
│  │ $4.20 / unit  |  $21/case    ││
│  │ ✓ In stock                   ││
│  │ [ Add to Cart ▼ ]            ││
│  └──────────────────────────────┘│
│                                 │
│  ┌─ Result #3 ──────────────────┐│
│  │ [Product Image]              ││
│  │ Organic Milk 2L              ││
│  │ Supplier: Happy Cows         ││
│  │ $5.10 / unit  |  $25/case    ││
│  │ ✓ In stock                   │  (low stock)
│  │ [ Add to Cart ▼ ]            ││
│  └──────────────────────────────┘│
│                                 │
│  ┌─ Guided Hint ────────────────┐│
│  │ 💡 Compare these options:    ││
│  │    Brand vs Premium vs Org   ││
│  │    Pick your favorite!       ││
│  │ [ Compare ]  [ Details ]     ││
│  └──────────────────────────────┘│
│                                 │
│  [ Load More Results ]           │
└─────────────────────────────────┘
```

**Key Features:**
- **Clear Comparison:** Product cards show price, supplier, stock status side-by-side
- **"Add to Cart" Prominent:** Primary action per product
- **Guided Hint:** Encourages picking one (removes decision paralysis)
- **Details Link:** Allows deep-dive if retailer is curious

**Copy:**
- **Header:** "🔍 Search: 'milk' | Found 12 results"
- **Filters:** "All Suppliers ▼", "Price: Low-High ▼"
- **Product Card Example:**
  - "Brand Whole Milk 2L"
  - "Supplier: Dairy Co"
  - "$3.50 / unit | $18/case"
  - "✓ In stock"
  - "[ Add to Cart ▼ ]"
- **Guided Hint:**
  - "💡 Compare these options: Brand vs Premium vs Org"
  - "Pick your favorite!"
  - "[ Compare ] [ Details ]"

**Interaction:**
- Rep says: "See these three options? They're all 2-liter milk. The first one is the cheapest. Let's add 2 cases of that to your cart."
- User taps "[ Add to Cart ]" under Result #1
- → Screen 3.3 (Quantity Selection)

---

### Screen 3.3: Quantity Selection & Add to Cart

**State:** User selected a product; now choosing quantity

**Visual Layout:**
```
┌─────────────────────────────────┐
│  [Logo]  Catalog  🔔  Account   │
│                                 │
│  ✏️ Add to Order                 │  (h2)
│                                 │
│  [Product Image]                │
│  Brand Whole Milk 2L            │
│  Supplier: Dairy Co             │
│                                 │
│  ┌─ Product Details ────────────┐│
│  │ Price per unit: $3.50        ││
│  │ Price per case (6 units): $18││
│  │ Package: 6 units/case        ││
│  │ Delivery: 5–7 days (std)     ││
│  └──────────────────────────────┘│
│                                 │
│  ┌─ Quantity Selection ─────────┐│
│  │ How many cases do you need?  ││
│  │                              ││
│  │    [ − ]  [ 2 cases ]  [ + ] ││  (qty selector, pre-filled)
│  │                              ││
│  │ Total for this item: $36     ││
│  │ (2 cases × $18)              ││
│  └──────────────────────────────┘│
│                                 │
│  ┌─ Guided Hint ────────────────┐│
│  │ 💡 Start with 2 cases.      ││
│  │    You can always order      ││
│  │    more next week if needed. ││
│  └──────────────────────────────┘│
│                                 │
│  [ Add to Cart ]  [ Cancel ]    │
│                                 │
│  ┌─ Cart Preview ───────────────┐│
│  │ 🛒 Cart: 1 item, $36         ││
│  └──────────────────────────────┘│
└─────────────────────────────────┘
```

**Key Features:**
- **Pre-filled Quantity:** Set to 2 (rep's suggestion) → reduces friction
- **Clear Pricing:** Shows unit price + case price; total calculated instantly
- **Quantity Selector:** +/− buttons intuitive; shows number clearly
- **Cart Preview:** Always visible at bottom, shows running total
- **Guided Hint:** Reinforces starting conservative (no overcommit)

**Copy:**
- **Heading:** "✏️ Add to Order"
- **Product Details:**
  - "Price per unit: $3.50"
  - "Price per case (6 units): $18"
  - "Package: 6 units/case"
  - "Delivery: 5–7 days (std)"
- **Quantity Label:** "How many cases do you need?"
- **Quantity Display:** "[ − ] [ 2 cases ] [ + ]"
- **Total:** "Total for this item: $36 (2 cases × $18)"
- **Guided Hint:** "💡 Start with 2 cases. You can always order more next week if needed."
- **Buttons:** "[ Add to Cart ] [ Cancel ]"
- **Cart Preview:** "🛒 Cart: 1 item, $36"

**Interaction:**
- User can tap +/− to adjust qty (defaults 2)
- Taps "[ Add to Cart ]"
- → Screen 3.4 (Confirmation & "Add More?")

---

### Screen 3.4: Item Added Confirmation

**State:** Product added to cart; confirm or add more

**Visual Layout:**
```
┌─────────────────────────────────┐
│  [Logo]  Catalog  🔔  Account   │
│                                 │
│  ✅ Added to Cart!              │  (confirmation, celebratory)
│                                 │
│  Brand Whole Milk 2L            │
│  2 cases → $36 ✓                │
│                                 │
│  ┌─────────────────────────────┐│
│  │ Would you like to add       ││  (CTAs)
│  │ more products?              ││
│  │                              ││
│  │ [ Continue Shopping ] 🛍️   │  (primary: momentum)
│  │ [ View Cart & Review ] 🛒  │  (secondary: ready to order)
│  │                              ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─ Cart Summary ───────────────┐│
│  │ Items: 1                     ││  (floating preview)
│  │ Subtotal: $36                ││
│  │ [ View Full Cart ]           ││
│  └──────────────────────────────┘│
│                                 │
│  ┌─ Guided Hint ────────────────┐│
│  │ 💡 Add 2–3 more items       ││
│  │    so your first order      ││
│  │    feels complete.          ││
│  │    [ Add Beverages ]        ││
│  │    [ Add Frozen Items ]     ││
│  └──────────────────────────────┘│
└─────────────────────────────────┘
```

**Key Features:**
- **Celebration:** Checkmark, "Added to Cart!"
- **Clear CTAs:** Two paths—continue (momentum) or review (ready)
- **Cart Preview:** Running total always visible
- **Guided Hint:** Suggests adding 2–3 items (size credibility)
- **Quick Links:** Suggest categories (reduces friction for next search)

**Copy:**
- **Heading:** "✅ Added to Cart!"
- **Confirmation:** "Brand Whole Milk 2L | 2 cases → $36 ✓"
- **CTAs:**
  - "[ Continue Shopping ] 🛍️"
  - "[ View Cart & Review ] 🛒"
- **Cart Summary:**
  - "Items: 1"
  - "Subtotal: $36"
  - "[ View Full Cart ]"
- **Guided Hint:**
  - "💡 Add 2–3 more items so your first order feels complete."
  - "[ Add Beverages ] [ Add Frozen Items ]"

**Interaction:**
- User taps "[ Continue Shopping ]" → Back to Screen 3.1 (Catalog)
- User adds 2 more items (beverage, frozen) → Screens 3.2–3.4 repeat
- After 3–4 items in cart, guide hints: "Ready to review? [ View Cart ]"
- User taps "[ View Cart & Review ]" → Screen 4.1

---

## FLOW 4: CART REVIEW & ORDER CHECKOUT

### Screen 4.1: Cart Review

**State:** User has 3–4 items; reviewing before checkout

**Visual Layout:**
```
┌─────────────────────────────────┐
│  [Logo]  Orders  🔔  Account    │
│                                 │
│  🛒 Your Cart (3 items)         │  (h2, item count)
│                                 │
│  ┌─ Item #1 ────────────────────┐│
│  │ Brand Whole Milk 2L          ││
│  │ Dairy Co | $18/case          ││
│  │ Qty: 2 cases = $36 ✓         ││  (can edit)
│  │ [ Edit ] [ Remove ]          ││
│  └──────────────────────────────┘│
│                                 │
│  ┌─ Item #2 ────────────────────┐│
│  │ Fresh Orange Juice 1L        ││
│  │ Beverage Pro | $5/bottle     ││
│  │ Qty: 4 bottles = $20 ✓       ││
│  │ [ Edit ] [ Remove ]          ││
│  └──────────────────────────────┘│
│                                 │
│  ┌─ Item #3 ────────────────────┐│
│  │ Frozen Broccoli 2lb bags     ││
│  │ Fresh Foods | $2.50/bag      ││
│  │ Qty: 6 bags = $15 ✓          ││
│  │ [ Edit ] [ Remove ]          ││
│  └──────────────────────────────┘│
│                                 │
│  ┌─ Order Summary ───────────────┐│
│  │ Subtotal .................. $71││  (line item summary)
│  │ Estimated Tax ............ $5.5││
│  │ Delivery (Std, Free) ....... $0││
│  │                               ││
│  │ ORDER TOTAL ............. $76.5││
│  └──────────────────────────────┘│
│                                 │
│  ┌─ Delivery Info ───────────────┐│
│  │ Deliver to:                  ││
│  │ [Location Name]              ││
│  │ [Address]                    ││
│  │ [ Change Address ]           ││
│  └──────────────────────────────┘│
│                                 │
│  ┌─ Promo Code ──────────────────┐│
│  │ Have a code? [ Enter ]       ││  (optional)
│  └──────────────────────────────┘│
│                                 │
│  [ Continue to Payment ] (blue)  │
│  [ Keep Shopping ]              │
└─────────────────────────────────┘
```

**Key Features:**
- **Cart Transparency:** Each item shows product, supplier, qty, price
- **Edit Options:** Quick [ Edit ] / [ Remove ] per item
- **Order Summary:** Subtotal, tax, delivery, total—line-by-line clarity
- **Delivery Address:** Editable; clear what's being shipped
- **Promo Code:** Optional, unobtrusive
- **Clear CTA:** "Continue to Payment" prominent (next step)

**Copy:**
- **Heading:** "🛒 Your Cart (3 items)"
- **Item Card:** "[Product Name] | [Supplier] | [Price] | Qty: [#] = [Total] ✓"
- **Order Summary:**
  - "Subtotal ..................... $71"
  - "Estimated Tax ............... $5.50"
  - "Delivery (Std, Free) .......... $0"
  - "ORDER TOTAL ................ $76.50"
- **Delivery Info:**
  - "Deliver to:"
  - "[Location Name]"
  - "[Address]"
  - "[ Change Address ]"
- **Promo:** "Have a code? [ Enter ]"
- **Buttons:**
  - "[ Continue to Payment ]"
  - "[ Keep Shopping ]"

**Interaction:**
- User reviews items (rep can point out items, total)
- If changes needed: user taps [ Edit ] or [ Remove ]
- Once happy: taps "[ Continue to Payment ]" → Screen 4.2

---

### Screen 4.2: Payment Method Selection

**State:** Ready to confirm payment; choose method

**Visual Layout:**
```
┌─────────────────────────────────┐
│  [Logo]  Orders  🔔  Account    │
│                                 │
│  💳 Payment Method              │  (h2)
│                                 │
│  ┌─ Payment Options ─────────────┐│
│  │ ◉ Credit Card on File        ││  (selected by default)
│  │   Last 4 digits: 4242         ││
│  │   Expires: 12/2026            ││
│  │   [Change Card]               ││
│  │                               ││
│  │ ○ Add New Credit Card         ││
│  │   [ Add Card ]                ││
│  │                               ││
│  │ ○ ACH Transfer (Bank)         ││
│  │   [ Set Up ACH ]              ││
│  │                               ││
│  │ ○ Purchase Order / Invoice    ││
│  │   [ Use PO ]                  ││
│  │                               ││
│  └──────────────────────────────┘│
│                                 │
│  ┌─ Order Summary ───────────────┐│
│  │ 3 items ..................... ││
│  │ Subtotal ................. $71 │
│  │ Tax ..................... $5.5 │
│  │ Delivery .................. $0 │
│  │ TOTAL .................. $76.5 │
│  └──────────────────────────────┘│
│                                 │
│  ┌─ Security & Privacy ──────────┐│
│  │ 🔒 Your payment is secure    ││  (trust builder)
│  │    Bank-level encryption      ││
│  │    PCI-DSS Level 1 compliant  ││
│  └──────────────────────────────┘│
│                                 │
│  [ Place Order ]  [ Cancel ]    │  (primary action)
└─────────────────────────────────┘
```

**Key Features:**
- **Default Method:** Card on file pre-selected (reduces steps)
- **Options Clear:** Multiple payment methods listed; easy to switch
- **Order Summary:** Reconfirm total before final action
- **Security Info:** Builds trust (encryption, compliance)
- **Clear CTA:** "[ Place Order ]" prominent

**Copy:**
- **Heading:** "💳 Payment Method"
- **Options:**
  - "◉ Credit Card on File"
  - "Last 4 digits: 4242"
  - "Expires: 12/2026"
  - "[Change Card]"
  - "○ Add New Credit Card | [ Add Card ]"
  - "○ ACH Transfer (Bank) | [ Set Up ACH ]"
  - "○ Purchase Order / Invoice | [ Use PO ]"
- **Summary:** (same as Screen 4.1)
- **Security:**
  - "🔒 Your payment is secure"
  - "Bank-level encryption"
  - "PCI-DSS Level 1 compliant"
- **Buttons:** "[ Place Order ] [ Cancel ]"

**Interaction:**
- Rep says: "Okay, payment is set to your card on file. When you're ready, tap 'Place Order' and we're done!"
- User taps "[ Place Order ]"
- → Screen 4.3

---

### Screen 4.3: Order Confirmation (Success)

**State:** Order successfully submitted

**Visual Layout:**
```
┌─────────────────────────────────┐
│  [Logo]  Orders  🔔  Account    │
│                                 │
│  🎉🎉 Order Placed! 🎉🎉        │  (celebratory!)
│                                 │
│  Your order has been received   │
│  and sent to our warehouse.     │
│                                 │
│  ┌─ Order Confirmation ──────────┐│
│  │ Order #: ORD-2026-051342      ││  (prominent, easy to copy)
│  │                               ││
│  │ Order Date: May 13, 2026      ││
│  │ Time: 2:34 PM PT             ││
│  │                               ││
│  │ Expected Delivery:            ││
│  │ May 18–20, 2026               ││
│  │ [ Track Shipment ]            ││
│  │                               ││
│  │ Total Charged: $76.50         ││
│  │                               ││
│  └──────────────────────────────┘│
│                                 │
│  ┌─ What's Next? ────────────────┐│
│  │ ✅ Confirmation email sent    ││  (next steps)
│  │    (Check inbox)              ││
│  │                               ││
│  │ ✅ Warehouse processing       ││
│  │    (Usually within 2 hours)   ││
│  │                               ││
│  │ ✅ Delivery tracking          ││
│  │    (You'll get updates)       ││
│  │                               │
│  └──────────────────────────────┘│
│                                 │
│  ┌─ Next Order Tip ──────────────┐│
│  │ 💡 Next week, you'll be able ││
│  │    to reorder in ~5 minutes  ││
│  │    using Favorites. Try it!  ││
│  └──────────────────────────────┘│
│                                 │
│  [ View Order Details ]         │
│  [ Done - Go to Dashboard ]  ← main CTA
└─────────────────────────────────┘
```

**Key Features:**
- **Celebration:** Emojis, large heading "🎉 Order Placed! 🎉"
- **Clear Order #:** Prominent, easy to reference
- **Expected Delivery:** Concrete date range (builds confidence)
- **Next Steps Timeline:** Shows what happens next (transparency)
- **Future-Looking:** Mentions how fast next order will be
- **Clear Exit:** Button to dashboard to complete flow

**Copy:**
- **Heading:** "🎉🎉 Order Placed! 🎉🎉"
- **Subheading:** "Your order has been received and sent to our warehouse."
- **Confirmation Block:**
  - "Order #: ORD-2026-051342"
  - "Order Date: May 13, 2026 | Time: 2:34 PM PT"
  - "Expected Delivery: May 18–20, 2026"
  - "[ Track Shipment ]"
  - "Total Charged: $76.50"
- **What's Next:**
  - "✅ Confirmation email sent (Check inbox)"
  - "✅ Warehouse processing (Usually within 2 hours)"
  - "✅ Delivery tracking (You'll get updates)"
- **Next Order Tip:**
  - "💡 Next week, you'll be able to reorder in ~5 minutes using Favorites. Try it!"
- **Buttons:**
  - "[ View Order Details ]"
  - "[ Done - Go to Dashboard ]"

**Interaction:**
- Rep says: "BOOM! 🎉 You did it! Your first order is in the system. See the order number? [Points to screen.] That's your reference. You'll get an email confirmation in a minute."
- User can tap "[ Track Shipment ]" to see live tracking
- OR taps "[ Done - Go to Dashboard ]" to return home
- → End of onboarding flow (see post-onboarding checklist in main doc)

---

## APPENDIX: ERROR HANDLING & EDGE CASES

### Payment Declined

**Visual:**
```
┌─────────────────────────────────┐
│  [Logo]  Orders  🔔  Account    │
│                                 │
│  ⚠️ Payment Failed               │  (red banner)
│                                 │
│  Your card was declined.        │
│  This could be because:         │
│  • Card is expired              │
│  • Insufficient funds           │
│  • Bank blocked the transaction │
│                                 │
│  What to do:                    │
│  1. Try a different card        │
│  2. Contact your bank           │
│  3. Call us for help            │
│                                 │
│  [ Try Different Card ]         │
│  [ Call Support: XXX-XXX-XXXX ] │
│  [ Cancel Order ]               │
└─────────────────────────────────┘
```

**Copy:**
- "⚠️ Payment Failed"
- "Your card was declined. This could be because:"
- "• Card is expired"
- "• Insufficient funds"
- "• Bank blocked the transaction"
- "What to do:"
- "1. Try a different card"
- "2. Contact your bank"
- "3. Call us for help"

---

### Connection Error During Checkout

**Visual:**
```
┌─────────────────────────────────┐
│  [Logo]  Orders  🔔  Account    │
│                                 │
│  ⚠️ Connection Lost              │  (yellow banner)
│                                 │
│  We lost connection to the      │
│  server. Your order is safe,    │
│  but we can't confirm it yet.   │
│                                 │
│  [ Retry ]  [ Go Home ]         │
│             [ Call Support ]    │
└─────────────────────────────────┘
```

---

**Document Version:** 1.0  
**Last Updated:** [Current Date]
