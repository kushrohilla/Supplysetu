# Salesman Mode Dashboard – Mobile App Design Specification

**Version:** 1.0  
**Platform:** React Native (Expo)  
**Target Devices:** iOS (13+), Android (API 30+)  
**Performance Target:** <2 sec dashboard load, 60 FPS scrolling for 100+ retailers  

---

## PART 1: DESIGN SYSTEM & PHILOSOPHY

### 1.1 Core UX Principles for Salesman

```
PRINCIPLE 1: One-Handed Navigation
├─ All primary CTAs within thumb reach (bottom 60% of screen)
├─ Large touch targets (min 48pt for buttons/cards)
├─ No deep navigation nesting (max 3 levels)

PRINCIPLE 2: Minimal Cognitive Load
├─ Show ONLY essential info per screen
├─ Hide advanced options in collapsible sections
├─ Use icons + color coding instead of text labels where possible

PRINCIPLE 3: High Interruption Recovery
├─ Salesman gets interrupted mid-visit (retailer questions, phone calls)
├─ Must be able to resume workflow instantly
├─ Auto-save all state; resume from last screen

PRINCIPLE 4: Data Entry Minimization
├─ Pre-fill from last order ("Repeat Last Order" button)
├─ Quick selection tabs (Brand/Category)
├─ Large quantity controls (stepper vs. keyboard input)
└─ Confirm order with 1 tap (not multi-step form)

PRINCIPLE 5: Real-Time Feedback
├─ Screen load states (skeleton loaders, not spinners)
├─ Inline success confirmations (checkmarks, not toasts)
├─ Running total sticky footer (order value always visible)
```

---

### 1.2 Design Tokens & Visual Hierarchy

```
COLOR PALETTE:
├─ Primary Action: #2E7D32 (SupplySetu green)
├─ Secondary Action: #1976D2 (blue)
├─ Danger/Alert: #D32F2F (red)
├─ Warning/Caution: #F57C00 (orange)
├─ Inactive/Disabled: #9E9E9E (gray)
├─ Scheme Highlight: #FFC400 (gold/yellow)
└─ Background: #FAFAFA (light gray)

TYPOGRAPHY:
├─ Heading 1 (Route name): 28pt, Bold, #212121
├─ Heading 2 (Retailer name): 18pt, SemiBold, #212121
├─ Primary Body (Descriptions): 16pt, Regular, #424242
├─ Secondary Body (Hints/Metadata): 14pt, Regular, #757575
├─ Small Text (Timestamps): 12pt, Regular, #9E9E9E

SPACING:
├─ Card margin: 12pt
├─ Card padding: 16pt
├─ Container padding: 16pt
├─ Grid gap: 8pt

TOUCH TARGETS:
├─ Minimum button height: 48pt
├─ Minimum card height: 60pt (retailer list item)
├─ Icon size: 24pt (standard), 32pt (primary CTA)

SHADOWS & ELEVATION:
├─ Flat cards: 0px elevation (1px subtle border)
├─ Interactive cards: 2px shadow (on press: 4px)
├─ CTA buttons: 4px shadow (on press: 8px)
└─ Bottom action bar: 8px shadow (floating over content)
```

---

### 1.3 Navigation Structure

```
APP TAB STRUCTURE (Bottom Tab Bar):
├─ Tab 1: Retailer App (existing buyer-side flow)
├─ Tab 2: Salesman Mode ← FOCUS OF THIS SPEC
│   ├─ Screen 1: Salesman Dashboard (home)
│   ├─ Screen 2: Route Visit (retailer list + status)
│   ├─ Screen 3: Assisted Order (product selection)
│   ├─ Screen 4: Retailer Insights (side panel)
│   └─ Screen 5: Daily Summary (end-of-day report)
├─ Tab 3: Orders (order history)
└─ Tab 4: Profile

NAVIGATION FLOW:
Dashboard
  ↓ "Start Route Visit"
Route Visit Screen
  ├─ Swipe left ← → (between retailers)
  ├─ Tap retailer card ↓ (details panel)
  └─ Tap "Assisted Order" ↓
Assisted Order Screen
  ├─ Product selection + quantity
  ├─ Run running total (visible)
  └─ Tap "Place Order" or "Hold" or "Skip Retailer"
Back to Route Visit
  ↓ End of day
Daily Summary Screen
```

---

## PART 2: SCREEN 1 – SALESMAN DASHBOARD

### 2.1 Dashboard Screen Layout (Full Wireframe)

```
┌─────────────────────────────────────────────────────────┐
│                       STATUS BAR                        │
│  9:41  ┆ ○┆○┆○ [Cellular] │ [WiFi] │ [Battery]        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ [←] SALESMAN MODE                              [⋮]      │ ← Header (can minimize)
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐ ┐
│                                                         │ ├─ ROUTE CARD
│  TODAY'S ROUTE                                          │ │ (Height: 120pt)
│  ┌─────────────────────────────────────────────────────┐ │
│  │ North Zone Route #7                    [TODAY]      │ │
│  │ Assigned: 7:30 AM | Updated: 2 min ago             │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │ ┘
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐ ┐
│                 ROUTE PROGRESS (3 Cards)              │ ├─ STATS ROW
│                                                         │ │
│  ┌──────────────────┐  ┌──────────────────┐          │ │
│  │     TOTAL        │  │   YET TO VISIT   │          │ │
│  │                  │  │                  │          │ │
│  │       28         │  │        12        │          │ │
│  │   Retailers      │  │   Retailers      │          │ │
│  └──────────────────┘  └──────────────────┘          │ │
│                                                         │ │
│                ┌──────────────────┐                    │ │
│                │  ORDERS TODAY    │                    │ │
│                │                  │                    │ │
│                │        5         │                    │ │
│                │    Orders        │                    │ │
│                └──────────────────┘                    │ │
│                                                         │ ┘
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐ ┐
│           SCHEME HIGHLIGHT BANNER                     │ ├─ PROMOTION
│ ┌────────────────────────────────────────────────────┐ │ │ (Height: 100pt)
│ │  🎁 ACTIVE SCHEME: "Bulk Buy Bonus"             │ │ │
│ │                                                    │ │ │
│ │  5% discount on orders > ₹5000                   │ │ │
│ │  Valid until: Mar 31, 2026                       │ │ │
│ │                                                    │ │ │
│ │  [Details →]                                      │ │ │
│ └────────────────────────────────────────────────────┘ │ │
│                                                         │ ┘
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐ ┐
│        QUICK STATS (2 Columns)                        │ ├─ SECONDARY
│                                                         │ │ (Height: 90pt)
│  ┌──────────────────┐  ┌──────────────────┐          │ │
│  │   ACTIVE VISITS  │  │   AVG. VISIT     │          │ │
│  │        8         │  │     12 min       │          │ │
│  └──────────────────┘  └──────────────────┘          │ │
│                                                         │ ┘
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐ ┐
│        INACTIVE RETAILERS ALERT (If count > 3)       │ ├─ ALERT
│ ┌────────────────────────────────────────────────────┐ │ │ (Height: 80pt)
│ │  ⚠️  3 RETAILERS INACTIVE (>7 days)               │ │ │
│ │  Follow up today to boost adoption               │ │ │
│ │  [View List →]                                    │ │ │
│ └────────────────────────────────────────────────────┘ │ │
│                                                         │ ┘
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐ ┐
│        RETAILER VISIT PREVIEW (Scrollable List)       │ ├─ HERO LIST
│                                                         │ │ (Height: flexible)
│  Today's Retailer Previews:                            │ │
│                                                         │ │
│  ┌─────────────────────────────────────────────────────┐ │ │
│  │ ✅ Kirana Store #45                   09:15       │ │ │
│  │    Raj Nagar, Sector 3 | GMV: ₹850              │ │ │
│  │ [Details →]                                      │ │ │
│  └─────────────────────────────────────────────────────┘ │ │
│                                                         │ │
│  ┌─────────────────────────────────────────────────────┐ │ │
│  │ ⭕ Grocery Outlet #78                 NOT YET     │ │ │
│  │    Market Street | Last Order: 5 days ago        │ │ │
│  │ [Visit Now →]                                    │ │ │
│  └─────────────────────────────────────────────────────┘ │ │
│                                                         │ │
│  ┌─────────────────────────────────────────────────────┐ │ │
│  │ ⚠️  Fresh Supply Mart #22                NOT YET    │ │ │
│  │    Colony Road | NO ORDER IN 8 DAYS (Priority!)   │ │ │
│  │ [Prioritize →]                                    │ │ │
│  └─────────────────────────────────────────────────────┘ │ │
│                                                         │ │
│  ┌─────────────────────────────────────────────────────┐ │ │
│  │ ○ Corner Store #12                   NOT YET     │ │ │
│  │    East Lane | Last Order: 2 days ago            │ │ │
│  │ [Details →]                                      │ │ │
│  └─────────────────────────────────────────────────────┘ │ │
│                                                         │ │
│  ... (scroll for more)                                 │ │
│                                                         │ ┘
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐ ┐
│                 BOTTOM ACTION BAR                      │ ├─ STICKY CTA
│  ┌────────────────────────────────────────────────────┐ │ │
│  │    [▶] START ROUTE VISIT    OR    [View Map]     │ │ │
│  └────────────────────────────────────────────────────┘ │ │
│                                                         │ ┘
└─────────────────────────────────────────────────────────┘

(Tab Bar below not shown)
```

---

### 2.2 Dashboard Screen – Detailed Specifications

```
SCREEN NAME: Salesman Dashboard
ROUTE: /salesman/dashboard
PARENT: Salesman Tab (Tab 2)
LOADING STATE: <2 seconds (70th percentile)

DATA REQUIREMENTS:
├─ Route details (name, assigned_time, updated_at)
├─ Retailers list (id, name, lat, lng, status, last_order_date, last_order_value)
├─ Today's orders (count, total_gmv)
├─ Active schemes (banner, discount %, validity)
├─ Salesman stats (visits_completed, avg_visit_time)
├─ Inactive retailers (count, threshold: >7 days)
└─ Notification batch status (pending_deliveries)

PERFORMANCE REQUIREMENTS:
├─ Initial load: <2 seconds (cached route + basic stats)
├─ Retailer preview list: Virtual scroll (render 5 visible + 3 buffer)
├─ Image loading: Lazy load (retailer logo shows placeholder first)
├─ Transitions: 300ms fade (no janky slides)
└─ Memory: < 50MB (manage retailer cards in FlatList with recycling)

DATA REFRESH STRATEGY:
├─ Background refresh: Every 5 minutes (silent, unless new inactive alerts)
├─ Pull-to-refresh: Manual, 2-sec animation
├─ Real-time updates: WebSocket for order count + status changes
└─ Cache layer: Keep previous data while loading new (no flash)
```

---

### 2.3 Dashboard Component Hierarchy

```
<SalesmanDashboardScreen>
  ├─ <SafeAreaView>
  ├─ <StatusBar>
  ├─ <Header>
  │  ├─ "← SALESMAN MODE"
  │  └─ Menu (⋮)
  ├─ <ScrollView> [mainScroll]
  │  ├─ <RouteCardComponent>
  │  │  ├─ Route name (28pt bold)
  │  │  ├─ Assigned time (14pt gray)
  │  │  └─ Last updated (14pt gray)
  │  ├─ <StatsCardRow> [3 cards: Total, YetToVisit, OrdersToday]
  │  │  ├─ <StatCard>
  │  │  ├─ <StatCard>
  │  │  └─ <StatCard>
  │  ├─ <SchemeHighlightBanner>
  │  │  ├─ Icon (🎁)
  │  │  ├─ Scheme name (bold)
  │  │  ├─ Description (secondary text)
  │  │  ├─ Validity (small text)
  │  │  └─ [Details →] button
  │  ├─ <SecondaryStatsRow> [2 cards: ActiveVisits, AvgVisitTime]
  │  │  ├─ <StatCard>
  │  │  └─ <StatCard>
  │  ├─ <InactiveRetailersBanner> [conditional]
  │  │  ├─ Icon (⚠️)
  │  │  ├─ Count + description
  │  │  └─ [View List →] button
  │  ├─ <RetailerPreviewListSection>
  │  │  ├─ Title: "Today's Retailer Previews"
  │  │  └─ <FlatList> [virtualScrolling]
  │  │     ├─ <RetailerPreviewCard>
  │  │     ├─ <RetailerPreviewCard>
  │  │     ├─ <RetailerPreviewCard>
  │  │     └─ (... more cards, lazy-loaded)
  │  └─ <Spacer height={100}> [for bottom CTA visibility]
  └─ <BottomActionBar> [sticky]
     ├─ [▶ START ROUTE VISIT] (primary, green)
     └─ [View Map] (secondary text button)
```

---

### 2.4 Retailer Preview Card Component

```
RETAILER PREVIEW CARD (Inside FlatList)

Height: 80pt (fixed, for performance)

Layout:
┌─────────────────────────────────────────────────────┐
│ [Status Icon]  Retailer Name    [Time/Badge]  [>]  │
│ [Location Desc] | [LastOrderDate → GMV]            │
└─────────────────────────────────────────────────────┘

CODE STRUCTURE:
<View style={styles.previewCard}>
  <View style={styles.previewHeader}>
    <View style={styles.statusIcon}>
      {status === 'visited' ? <CheckIcon/> : <EmptyCircleIcon/>}
      {inactiveFlag && <WarningBadge/>}
    </View>
    <Text style={styles.retailerName}>{retailerName}</Text>
    <Text style={styles.visitTime}>
      {visitedTime || "NOT YET"}
    </Text>
    <ChevronIcon/>
  </View>
  
  <View style={styles.previewFooter}>
    <Text style={styles.location}>{shopLocation}</Text>
    <Separator>|</Separator>
    <Text style={styles.lastOrderHint}>
      {lastOrderDate} → ₹{lastOrderValue}
    </Text>
  </View>
</View>

STYLES:
├─ statusIcon: 32pt × 32pt (rounded, background = status color)
│  └─ Visited: ✅ Green badge
│  └─ Not Visited: ⭕ Gray circle
│  └─ Inactive (>7d): ⚠️ Orange badge (overlaid)
├─ retailerName: Left-align, 16pt SemiBold, #212121
├─ visitTime: Right-align, 14pt Regular, #757575 (gray)
├─ location: 12pt Regular, #9E9E9E (light gray)
├─ lastOrderHint: 12pt Regular, #9E9E9E
└─ Card border: 1px #E0E0E0 (light gray), 4pt radius

INTERACTION:
├─ Press card → Navigate to Route Visit screen (retailer selected)
├─ Long-press → Show context menu: [Call], [Skip], [Details]
└─ Swipe-left → Quick action: [Mark Visited], [Skip]
```

---

### 2.5 Dashboard Data Flow

```
COMPONENT MOUNT:
  ↓
useEffect(() => {
  // Load from cache first (instant UI)
  const cachedDashboard = getCachedDashboard();
  setDashboard(cachedDashboard);
  
  // Fetch fresh data in background
  fetchDashboardData().then(data => {
    updateCache(data);
    setDashboard(data);
  });
}, [])

DATA STRUCTURE SHAPE:
{
  route: {
    id: "route_7_20260321",
    name: "North Zone Route #7",
    assigned_at: "2026-03-21T07:30:00Z",
    updated_at: "2026-03-21T09:41:00Z",
    total_retailers: 28,
    retailers_visited: 16,
    retailers_yet_to_visit: 12
  },
  orders_today: {
    count: 5,
    total_gmv: 12500,
    avg_value: 2500
  },
  stats: {
    active_visits: 8,
    avg_visit_duration_minutes: 12
  },
  active_scheme: {
    id: "scheme_bulk_2026",
    name: "Bulk Buy Bonus",
    discount_percent: 5,
    min_order_value: 5000,
    valid_until: "2026-03-31",
    banner_color: "#FFC400"
  },
  inactive_retailers: {
    count: 3,
    threshold_days: 7,
    retailers: [
      {
        id: "retail_22",
        name: "Fresh Supply Mart #22",
        last_order_date: "2026-03-13",
        days_inactive: 8
      }
    ]
  },
  retailers_preview: [
    {
      id: "retail_45",
      name: "Kirana Store #45",
      location: "Raj Nagar, Sector 3",
      latitude: 28.4595,
      longitude: 77.0589,
      status: "visited",
      visited_time: "09:15",
      last_order_date: "2026-03-20",
      last_order_value: 850,
      logo_url: "https://cdn.supplysetu.com/retail_45_logo.png"
    },
    ... (27 more retailers)
  ]
}

REAL-TIME UPDATES (WebSocket):
  On 'order_placed' event:
  ├─ Update orders_today.count
  ├─ Update orders_today.total_gmv
  ├─ Flash success animation on stat card
  └─ No full screen refresh (only number change)

CACHE INVALIDATION:
  ├─ Cache expires: 5 minutes
  ├─ On navigate back to dashboard: Check cache age
  ├─ If >5 min old: Refresh silently in background
  └─ If <5 min old: Show cached data (no flicker)
```

---

## PART 3: SCREEN 2 – ROUTE VISIT SCREEN

### 3.1 Route Visit Screen Layout (Full Wireframe)

```
┌─────────────────────────────────────────────────────┐
│                       STATUS BAR                    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐ ┐
│ [←] RETAILER: Kirana Store #45    [☰ Details]     │ ├─ HEADER
│    Raj Nagar, Sector 3                             │ │
│    Last Order: 2 days ago | ₹850                   │ │
└─────────────────────────────────────────────────────┘ ┘

┌─────────────────────────────────────────────────────┐ ┐
│               RETAILER INFO PANEL                  │ ├─ QUICK INFO
│ ┌────────────────────────────────────────────────┐ │ │
│ │ 📍 [Open in Maps]                              │ │ │
│ │ ☎️  [Call Retailer]                            │ │ │
│ │ 📊 Last Order: ₹850 (2 days ago)             │ │ │
│ │ 📈 Avg Order: ₹720                           │ │ │
│ │ ⏱️  Pending Delivery: YES (Arrives Tomorrow) │ │ │
│ └────────────────────────────────────────────────┘ │ │
│                                                     │ ┘
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐ ┐
│          ROUTE POSITION INDICATOR                 │ ├─ PROGRESS
│ ┌────────────────────────────────────────────────┐ │ │
│ │ Progress: 16/28 visited (57%)                 │ │ │
│ │ ████████░░░░░░ (progress bar)                │ │ │
│ │ Prev Retailer ← Current → Next Retailer     │ │ │
│ └────────────────────────────────────────────────┘ │ │
│                                                     │ ┘
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐ ┐
│           QUICK ACTION PILLS                       │ ├─ ACTIONS
│ ┌────────────────────────────────────────────────┐ │ │
│ │ [🛒 Assisted Order]  [⏩ Skip]  [... Actions] │ │ │
│ └────────────────────────────────────────────────┘ │ │
│                                                     │ ┘
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐ ┐
│        PREVIOUS ORDER SUMMARY (Repeat CTA)        │ ├─ REPEAT ORDER
│ ┌────────────────────────────────────────────────┐ │ │
│ │  Last Order (Mar 20, 9:15 AM)                  │ │ │
│ │  ────────────────────────────────                │ │
│ │  • Milk (1L, Fresh) ............ ₹50 × 2      │ │ │
│ │  • Cheese Set ................. ₹150 × 1      │ │ │
│ │  • Butter (200g) .............. ₹120 × 1      │ │ │
│ │  ────────────────────────────────                │ │ │
│ │  Total: ₹370                                  │ │ │
│ │                                               │ │ │
│ │  [🔄 REPEAT THIS ORDER] [Customize →]        │ │ │
│ └────────────────────────────────────────────────┘ │ │
│                                                     │ ┘
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐ ┐
│      OTHER RETAILERS IN ROUTE (Swipeable)         │ ├─ NAVIGATION
│                                                     │ │
│  Scroll/Swipe left-right to navigate:             │ │
│                                                     │ │
│  ⟨  | [Grocery Outlet #78]  | [Fresh Market #22] ⟩ │ │
│      Currently Selected      (Swipe to see next)   │ │
│                                                     │ ┘
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐ ┐
│             BOTTOM ACTION BAR                      │ ├─ BOTTOM CTA
│ ┌────────────────────────────────────────────────┐ │ │
│ │   [✅ MARK VISITED]    [🛒 START ORDER]       │ │ │
│ └────────────────────────────────────────────────┘ │ │
└─────────────────────────────────────────────────────┘
```

---

### 3.2 Route Visit Screen – Data & Interactions

```
SCREEN NAME: Route Visit
ROUTE: /salesman/route/:routeId/retailer/:retailerId
PARENT: Salesman Mode
BACK: Salesman Dashboard

KEY INTERACTIONS:

1️⃣ SWIPE LEFT/RIGHT (Navigate between retailers):
   ├─ Each swipe loads next retailer in route
   ├─ Smooth animation (300ms)
   ├─ Preload adjacent retailers (previous + next) for instant swipe
   └─ Show gesture hint: "Swipe for next retailer"

2️⃣ TAP "REPEAT LAST ORDER":
   ├─ Auto-populate Assisted Order screen with previous items
   ├─ Jump to Assisted Order screen
   └─ Allow modification before confirming

3️⃣ TAP "ASSISTED ORDER":
   ├─ Navigate to Assisted Order screen
   ├─ Pass retailer ID + context
   └─ Pre-load product catalog for this retailer

4️⃣ TAP "MARK VISITED":
   ├─ If no order placed: Mark as "Visited" (status change)
   ├─ Update local state + backend (API call)
   ├─ Show success checkmark (brief animation)
   ├─ Auto-advance to next retailer (optional slide)
   └─ Update dashboard stats

5️⃣ TAP "SKIP":
   ├─ Mark as "Skipped" (reason optional)
   ├─ Move to next retailer in route
   └─ Can come back later (skip != visited)

6️⃣ TAP "DETAILS" / Details Panel:
   ├─ Show: Contact info, address, delivery status, notes
   ├─ Expandable / Collapsible
   └─ Access quick actions (Map, Call, Message)

DATA STRUCTURE:
{
  route_id: "route_7_20260321",
  current_retailer_index: 0, // position in retailer list
  retailers: [
    {
      id: "retail_45",
      name: "Kirana Store #45",
      location: "Raj Nagar, Sector 3",
      latitude: 28.4595,
      longitude: 77.0589,
      phone: "+91-9876543210",
      status: "not_visited", // not_visited | visited | skipped
      last_order: {
        date: "2026-03-20",
        time: "09:15",
        items: [
          { name: "Milk (1L, Fresh)", price: 50, qty: 2, total: 100 },
          { name: "Cheese Set", price: 150, qty: 1, total: 150 },
          { name: "Butter (200g)", price: 120, qty: 1, total: 120 }
        ],
        total_value: 370
      },
      average_order_value: 720,
      pending_delivery: {
        exists: true,
        delivery_date: "2026-03-22",
        status: "in_transit"
      },
      notes: "Prefer delivery before 6 PM" // merchant notes
    },
    { /* more retailers */ }
  ],
  position: "16/28 visited (57%)"
}

PERFORMANCE OPTIMIZATION:
├─ Preload Next/Prev Retailer Images (lazy)
├─ Memoize retailer cards to prevent re-renders
├─ Use FlatList with initialScrollIndex for fast navigation
├─ Cache last order data (avoid re-fetching on swipe back)
└─ Debounce "Mark Visited" API calls (no duplicate calls on double-tap)
```

---

## PART 4: SCREEN 3 – ASSISTED ORDER SCREEN

### 4.1 Assisted Order Screen Layout (Full Wireframe)

```
┌─────────────────────────────────────────────────────┐
│                       STATUS BAR                    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐ ┐
│ [←] ASSISTED ORDER: Kirana Store #45              │ ├─ HEADER
│    📊 Last Order: ₹850 | ⚠️  8 DAYS INACTIVE    │ │
└─────────────────────────────────────────────────────┘ ┘

┌─────────────────────────────────────────────────────┐ ┐
│    🎁 BULK BUY BONUS: 5% discount on ₹5000+      │ ├─ SCHEME
│    💡 ADVANCE PRICING: Milk (1L) → ₹48          │ │ (Auto-dismissible)
└─────────────────────────────────────────────────────┘ ┘

┌─────────────────────────────────────────────────────┐ ┐
│         QUICK SELECTION TABS (Scrollable)          │ ├─ CATEGORY
│                                                     │ │ TABS
│  [All] [Dairy ✓] [Beverages] [Pantry] [Frozen] │ │
│     ↑ currently selected (green underline)         │ │
└─────────────────────────────────────────────────────┘ ┘

┌─────────────────────────────────────────────────────┐ ┐
│          PRODUCT LIST (Scrollable)                 │ ├─ PRODUCTS
│                                                     │ │
│  ┌─────────────────────────────────────────────────┐ │ │
│  │ [Logo] Milk (1L, Fresh Brand)    ₹50 - ₹48*  │ │ │
│  │        Fresh | Best price                      │ │ │
│  │                                                 │ │ │
│  │        [-] 0 [+] [Quick Add ×5] [×10]         │ │ │
│  │        (Quantity stepper with presets)         │ │ │
│  └─────────────────────────────────────────────────┘ │ │
│                                                     │ │
│  ┌─────────────────────────────────────────────────┐ │ │
│  │ [Logo] Cheese Set (500g)         ₹150         │ │ │
│  │        Fresh Dairy | Trending                  │ │ │
│  │                                                 │ │ │
│  │        [-] 0 [+] [Quick Add ×2] [×5]          │ │ │
│  └─────────────────────────────────────────────────┘ │ │
│                                                     │ │
│  ┌─────────────────────────────────────────────────┐ │ │
│  │ [Logo] Butter (200g, Premium)    ₹120        │ │ │
│  │        Dairy | Popular                         │ │ │
│  │                                                 │ │ │
│  │        [-] 0 [+] [Quick Add ×2]               │ │ │
│  └─────────────────────────────────────────────────┘ │ │
│                                                     │ │
│  ┌─────────────────────────────────────────────────┐ │ │
│  │ [Logo] Yogurt (200ml Cup)        ₹40          │ │ │
│  │        Dairy | Best Seller                     │ │ │
│  │                                                 │ │ │
│  │        [-] 0 [+] [Quick Add ×5]               │ │ │
│  └─────────────────────────────────────────────────┘ │ │
│                                                     │ │
│  ... (scroll for more dairy products)              │ │
│                                                     │ ┘
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐ ┐
│           STICKY FOOTER (Always Visible)           │ ├─ FOOTER
│  ┌────────────────────────────────────────────────┐ │ │
│  │  Items: 3        │  Order Total: ₹520         │ │ │
│  │  ✓ Discount eligible (₹5000+)                 │ │ │
│  └────────────────────────────────────────────────┘ │ │
│  ┌────────────────────────────────────────────────┐ │ │
│  │  Payment Mode: [Cash ▼] | [Card ▼] | [UPI ▼] │ │ │
│  └────────────────────────────────────────────────┘ │ │
│  ┌────────────────────────────────────────────────┐ │ │
│  │       [✅ PLACE ORDER]     [Hold]     [Cancel]│ │ │
│  └────────────────────────────────────────────────┘ │ │
└─────────────────────────────────────────────────────┘ ┘

(If order placed → Show success overlay; stay for 2sec → Auto-close)
```

---

### 4.2 Assisted Order Screen – Detailed Specs

```
SCREEN NAME: Assisted Order
ROUTE: /salesman/order/:retailerId
CONTEXT: Opened from Route Visit screen

KEY COMPONENTS:

1. QUANTITY STEPPER:
   ├─ Display: [-] 2 [+]
   ├─ Large touch targets (48pt × 48pt)
   ├─ Quick-add buttons: [×5] [×10] (common quantities)
   ├─ On change: Update sticky footer total (real-time)
   └─ Min qty: 0, Max qty: 999 (or supplier limit)

2. PRODUCT CARD:
   ├─ Height: 90pt (fixed, for scrolling performance)
   ├─ Layout:
   │  ├─ Left: Product logo/image (40pt × 40pt)
   │  ├─ Middle: Name, desc, tags
   │  ├─ Right: Price (original) + Price (advance) + Stepper
   ├─ Advance pricing highlight: Show as ₹48* (smaller, gold)
   ├─ Badges: "Popular", "Best Seller", "New", "Trending"
   └─ On tap product name: Show full product details (modal)

3. STICKY FOOTER:
   ├─ Always visible (pinned at bottom)
   ├─ Shows:
   │  ├─ Items count: "Items: 3"
   │  ├─ Total: "Order Total: ₹520"
   │  ├─ Discount eligibility: "✓ Discount eligible (₹5000+)" OR "₹X more for discount"
   │  ├─ Payment mode selector: [Cash ▼] [Card ▼] [UPI ▼]
   │  └─ Action buttons: [✅ Place] [Hold] [Cancel]
   ├─ Background: Floating effect (shadow above)
   └─ Scrollable product list ends 100pt before footer (padding)

4. SCHEME BANNER (Top):
   ├─ Auto-dismissible (X button)
   ├─ Shows current active scheme + advance pricing
   ├─ Updates in real-time if user meets discount threshold

DATA STRUCTURE:
{
  retailer_id: "retail_45",
  retailer_name: "Kirana Store #45",
  last_order_value: 850,
  last_order_date: "2026-03-20",
  day_since_last_order: 1,
  inactivity_flag: false,
  active_scheme: {
    id: "scheme_bulk_2026",
    name: "Bulk Buy Bonus",
    discount_percent: 5,
    min_order_value: 5000
  },
  products: [
    {
      id: "prod_milk_1l",
      name: "Milk (1L, Fresh Brand)",
      description: "Fresh | Best price",
      category: "Dairy",
      tags: ["Fresh", "Best Seller"],
      standard_price: 50,
      advance_price: 48,
      image_url: "https://cdn.supplysetu.com/milk_1l.jpg",
      quantity_in_cart: 0
    },
    { /* more products */ }
  ],
  order_summary: {
    items_count: 3,
    total_amount: 520,
    discount_eligible: false, // becomes true if total >= 5000
    discount_amount: 0,
    final_amount: 520,
    payment_mode: "cash" // default
  }
}

QUANTITY STEPPER BEHAVIOR:
├─ On [-] tap:
│  ├─ If qty > 0: qty -= 1
│  ├─ Update order_summary (real-time)
│  └─ No animation (instant feedback)
├─ On [+] tap:
│  ├─ qty += 1
│  ├─ Update order_summary
│  └─ Check if discount threshold reached (visual update)
├─ On [×5] tap:
│  ├─ qty += 5 (or set to 5 if 0)
│  ├─ Haptic feedback (subtle vibration)
│  └─ Order total updates instantly
└─ Double-tap product: Bring up quantity picker (number input modal)

PRODUCT LIST PERFORMANCE:
├─ Virtual scroll: Render 3 visible carts + 2 buffer off-screen
├─ Fixed height per card (90pt): Enables smooth 60 FPS scrolling
├─ Image lazy-loading: Placeholder while loading
├─ Memoize product cards: Prevent unnecessary re-renders
├─ Debounce quantity changes: Wait 500ms before syncing backend
└─ Max 50 products per category tab

STICKY FOOTER BEHAVIOR:
├─ Always visible above tab bar
├─ On scroll: Stays pinned (no disappearing)
├─ On quantity change: Updates in real-time (<50ms latency)
├─ Payment mode selector: Dropdown menu (Cash/Card/UPI)
│  └─ Saves user preference (sticky across sessions)
├─ Place Order button:
│  ├─ Disabled if qty = 0 for all products
│  ├─ Enabled once any qty > 0
│  └─ On tap: Show confirmation → Success screen → Auto-close
└─ Hold button: Save order as draft (resume later)

ORDER SUCCESS FLOW:
  1. Tap [Place Order]
  2. Show overlay: "Processing order..."
  3. API call (async) → /order/create
  4. Success: Show checkmark + "Order placed! ✅"
  5. Order details displayed for 2 sec
  6. Auto-close overlay + return to Route Visit
  7. Auto-advance to next retailer (optional slide)
```

---

### 4.3 Product Category Tabs

```
TAB STRUCTURE:
├─ Tab 1: "All" (all products, 50 items max)
├─ Tab 2: "Dairy" (milk, cheese, butter, yogurt)
├─ Tab 3: "Beverages" (tea, coffee, juice)
├─ Tab 4: "Pantry" (flour, sugar, oil, spices)
├─ Tab 5: "Frozen" (ice cream, frozen veggies)
└─ [+] More (if additional categories)

INTERACTION:
├─ Tap tab: Switch product list (smooth scroll animation)
├─ Current tab: Green underline + highlight
├─ Scroll tabs left/right if >4 tabs (inline scrolling)
└─ Remember last selected tab (session memory)

PRODUCT COUNT BADGE:
├─ Show count next to category: "Dairy (12)"
├─ Update in real-time if salesman adds quantities
└─ Visual indicator if items already in cart for this category
```

---

## PART 5: RETAILER INSIGHTS PANEL (Side Context)

### 5.1 Retailer Insights Panel – During Assisted Order

```
DISPLAY CONTEXT:
├─ Visible during Assisted Order screen
├─ Can be toggled on/off (hidden by default, tap icon to show)
├─ Overlay from right side / Expandable panel
├─ Height: ~200pt (compact)

LAYOUT:
┌──────────────────────────────┐
│  RETAILER INSIGHTS           │ ← Title
├──────────────────────────────┤
│                              │
│  Last Order:  Mar 20, 9:15 AM│
│  Amount:      ₹850           │
│                              │
│  Average:     ₹720/order     │
│  Frequency:   Every 2.1 days │
│                              │
│  Pending:     1 delivery     │
│               Arrives: Mar 22│
│                              │
│  Status:      📈 Healthy    │
│               Last 30d: +8%  │
│               (grow)         │
│                              │
│  ⚠️  8 DAYS WITHOUT ORDER   │
│     Low priority for today   │
│                              │
└──────────────────────────────┘

INSIGHTS COMPONENTS:

1. Last Order Card:
   ├─ Date + time (human-readable)
   ├─ Amount (bold, ₹)
   └─ Tap to view details

2. Average Stats:
   ├─ Avg order value
   ├─ Order frequency (days between orders)
   └─ Trend indicator (↑ ↓ →)

3. Pending Deliveries:
   ├─ Count of pending orders
   ├─ Next delivery date
   ├─ Status (In Transit, Out for Delivery, etc.)
   └─ Tap to show on map

4. Health Status:
   ├─ Status badge: Healthy / At Risk / Inactive
   ├─ 30-day trend (growth %)
   ├─ Color-coded (🟢 Green / 🟡 Yellow / 🔴 Red)
   └─ Action prompt

5. Inactivity Warning (If >7 days):
   ├─ ⚠️  Icon
   ├─ "X DAYS WITHOUT ORDER"
   ├─ Recommendation: "High priority for follow-up today"
   └─ Motivational text

DATA STRUCTURE:
{
  retail_id: "retail_45",
  last_order: {
    date: "2026-03-20",
    time: "09:15",
    amount: 850
  },
  average: {
    order_value: 720,
    order_frequency_days: 2.1
  },
  pending_deliveries: {
    count: 1,
    next_delivery_date: "2026-03-22",
    status: "in_transit"
  },
  health: {
    status: "healthy", // healthy | at_risk | inactive
    trend_30d_percent: 8, // growth percentage
    inactivity_days: 1,
    inactivity_threshold: 7
  }
}

VISUAL STYLING:
├─ Background: White / Light gray
├─ Border: 1px left, #E0E0E0
├─ Typography:
│  ├─ Title: 14pt Bold, #212121
│  ├─ Labels: 12pt Regular, #757575
│  ├─ Values: 14pt SemiBold, #212121
│  └─ Warning: 12pt Bold, #D32F2F (red)
├─ Color coding:
│  ├─ Healthy: 🟢 #4CAF50 (green)
│  ├─ At Risk: 🟡 #F57C00 (orange)
│  └─ Inactive: 🔴 #D32F2F (red)
└─ Icons: 24pt, color-matched to status

INTERACTIONS:
├─ Tap last order: Show order details (modal)
├─ Tap pending delivery: Open in map app
├─ Tap health badge: Show detailed analysis (drill-down)
├─ Long-press: Show tooltip with more insights
└─ Swipe left to collapse panel
```

---

## PART 6: SCREEN 5 – DAILY SUMMARY SCREEN

### 6.1 Daily Summary Screen Layout (Full Wireframe)

```
┌─────────────────────────────────────────────────────┐
│                       STATUS BAR                    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐ ┐
│ [←] TODAY'S SUMMARY              [Share] [Download] │ ├─ HEADER
│    Friday, March 21, 2026 | 05:30 PM               │ │
└─────────────────────────────────────────────────────┘ ┘

┌─────────────────────────────────────────────────────┐ ┐
│         PRODUCTIVITY HIGHLIGHTS (Large Cards)      │ ├─ MAIN
│                                                     │ │ METRICS
│  ┌────────────────────┐  ┌────────────────────┐   │ │
│  │  RETAILERS VISITED │  │  ORDERS BOOKED    │   │ │
│  │                    │  │                    │   │ │
│  │      22/28         │  │        7           │   │ │
│  │    (79% Complete)  │  │   Orders          │   │ │
│  └────────────────────┘  └────────────────────┘   │ │
│                                                     │ │
│  ┌────────────────────┐  ┌────────────────────┐   │ │
│  │  TOTAL ORDER VALUE │  │  AVG. VISIT TIME   │   │ │
│  │                    │  │                    │   │ │
│  │    ₹5,450          │  │     13 minutes     │   │ │
│  │  (+12% vs avg)     │  │  (Well paced)      │   │ │
│  └────────────────────┘  └────────────────────┘   │ │
│                                                     │ ┘
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐ ┐
│     RETAILERS SKIPPED (Follow-up Needed)           │ ├─ DETAILS
│  ┌────────────────────────────────────────────────┐ │ │
│  │  6 retailer(s) skipped today                   │ │ │
│  │                                                 │ │ │
│  │  ⭕ Corner Store #12 (East Lane)              │ │ │
│  │     Reason: Not available today               │ │ │
│  │     → Follow up tomorrow                       │ │ │
│  │                                                 │ │ │
│  │  ⭕ Market Mart #88 (Colony Road)             │ │ │
│  │     Reason: Closed for renovation            │ │ │
│  │     → Check next week                         │ │ │
│  │                                                 │ │ │
│  │  ... (3 more skipped retailers)                │ │ │
│  │  [Show All ▼]                                  │ │ │
│  └────────────────────────────────────────────────┘ │ │
│                                                     │ ┘
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐ ┐
│           FOLLOW-UP RECOMMENDATIONS                │ ├─ ACTIONS
│ ┌────────────────────────────────────────────────┐ │ │
│ │  💡 SUGGESTIONS FOR TOMORROW                   │ │ │
│ │                                                 │ │ │
│ │  1️⃣ Follow up with 6 skipped retailers       │ │ │
│ │     → Estimated time: 30 min                  │ │ │
│ │                                                 │ │ │
│ │  2️⃣ Reactivate 3 inactive retailers (>7d) │ │ │
│ │     Priority: Fresh Supply Mart #22           │ │ │
│ │     → Estimated time: 45 min                  │ │ │
│ │                                                 │ │ │
│ │  3️⃣ Maximize order value (₹5000+ for discount)  │ │ │
│ │     Current avg: ₹778/order                   │ │ │
│ │     → Focus on high-value retailers           │ │ │
│ │                                                 │ │ │
│ └────────────────────────────────────────────────┘ │ │
│                                                     │ ┘
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐ ┐
│          PRODUCTIVITY NOTES                        │ ├─ FEEDBACK
│ ┌────────────────────────────────────────────────┐ │ │
│ │  🎯 Great day! 79% route completion.          │ │ │
│ │     You're above average pace (13 min/visit). │ │ │
│ │                                                 │ │ │
│ │  💰 ₹5,450 orders placed (+12% vs your avg). │ │ │
│ │     Keep pushing for more high-value orders.  │ │ │
│ │                                                 │ │ │
│ │  ⏰ End time: 5:30 PM (on schedule)           │ │ │
│ │     Plan: Continue tomorrow with skipped ones.│ │ │
│ │                                                 │ │ │
│ └────────────────────────────────────────────────┘ │ │
│                                                     │ ┘
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐ ┐
│           BOTTOM ACTION BUTTONS                    │ ├─ ACTIONS
│ ┌────────────────────────────────────────────────┐ │ │
│ │  [📤 Share Report]  [💾 Save as PDF]  [🏠 Home] │ │ │
│ └────────────────────────────────────────────────┘ │ │
└─────────────────────────────────────────────────────┘ ┘
```

---

### 6.2 Daily Summary Screen – Detailed Specs

```
SCREEN NAME: Daily Summary
ROUTE: /salesman/summary/:routeId
PARENT: Salesman Mode
TRIGGERED: End of day OR "End Route" CTA from Route Visit

DATA STRUCTURE:
{
  route_id: "route_7_20260321",
  date: "2026-03-21",
  end_time: "17:30",
  route_completion: {
    retailers_visited: 22,
    total_retailers: 28,
    completion_percent: 79,
    retailers_skipped: 6
  },
  orders: {
    total_count: 7,
    total_value: 5450,
    avg_value: 778,
    vs_salesman_avg_percent: 12 // +12% vs their average
  },
  visit_metrics: {
    avg_visit_duration_minutes: 13,
    total_time_on_route_minutes: 285,
    first_visit_time: "09:15",
    last_visit_time: "17:30"
  },
  skipped_retailers: [
    {
      id: "retail_12",
      name: "Corner Store #12",
      location: "East Lane",
      reason: "Not available today",
      recommendation: "Follow up tomorrow",
      priority: "normal"
    },
    { /* more skipped retailers */ }
  ],
  inactive_retailers_not_visited: [
    {
      id: "retail_22",
      name: "Fresh Supply Mart #22",
      days_inactive: 8,
      priority: "high"
    },
    { /* more */ }
  ],
  recommendations: [
    {
      priority: 1,
      title: "Follow up with 6 skipped retailers",
      estimated_time_minutes: 30
    },
    {
      priority: 2,
      title: "Reactivate 3 inactive retailers (>7d)",
      estimated_time_minutes: 45
    },
    {
      priority: 3,
      title: "Maximize order value (₹5000+ for discount)",
      current_avg: 778
    }
  ],
  feedback: {
    tone: "positive", // positive | neutral | concern
    message: "Great day! 79% route completion. You're above average pace (13 min/visit).",
    performance_indicators: [
      { metric: "Orders placed", value: "₹5,450", vs_avg: "+12%" },
      { metric: "Route completion", value: "79%", status: "above_target" },
      { metric: "Visit pace", value: "13 min/visit", status: "optimal" }
    ]
  }
}

KEY INTERACTIONS:

1️⃣ TAP "Show All" (Skipped Retailers):
   ├─ Expand section to show all 6 skipped
   ├─ Show reason for each skip
   └─ Tap any skipped → Schedule for tomorrow

2️⃣ TAP Recommendation Card:
   ├─ Show details of recommendation
   ├─ Option to "Schedule for Tomorrow"
   └─ Add to tomorrow's route priority

3️⃣ TAP "Share Report":
   ├─ Generate summary PDF/image
   ├─ Share via WhatsApp, Email, etc.
   └─ Or copy to clipboard

4️⃣ TAP "Save as PDF":
   ├─ Generate PDF with summary + skipped list
   ├─ Save to documents folder
   └─ Timestamp included

5️⃣ TAP "Home":
   ├─ Return to Salesman Dashboard
   ├─ Reset state for next route
   └─ Auto-load tomorrow's route (if available)

PERFORMANCE TARGETS:
├─ Summary screen load: <1.5 sec (cached data)
├─ PDF generation: <3 sec
├─ Share functionality: <2 sec (pre-rendered)
└─ Transitions: Smooth 300ms animations

RETENTION & ANALYTICS:
├─ Save summary to local storage (device)
├─ Sync to backend (async, no blocking)
├─ Display past summaries (last 30 days)
├─ Track trends (weekly productivity, etc.)
└─ Use for performance insights + leaderboards
```

---

## PART 7: TECHNICAL ARCHITECTURE

### 7.1 Component Hierarchy & File Structure

```
apps/mobile/src/
├─ features/
│  └─ salesman/
│     ├─ screens/
│     │  ├─ SalesmanDashboard.tsx (Screen 1)
│     │  ├─ RouteVisit.tsx (Screen 2)
│     │  ├─ AssistedOrder.tsx (Screen 3)
│     │  ├─ DailySummary.tsx (Screen 5)
│     │  └─ index.ts
│     ├─ components/
│     │  ├─ RouteCard.tsx ← Dashboard card
│     │  ├─ RetailerPreviewCard.tsx ← FlatList item
│     │  ├─ StatsCard.tsx ← Reusable stat display
│     │  ├─ SchemeHighlightBanner.tsx
│     │  ├─ InactiveRetailersBanner.tsx
│     │  ├─ ProductCard.tsx ← Assisted Order item
│     │  ├─ QuantityStepper.tsx ← Quantity controls
│     │  ├─ StickyFooter.tsx ← Order summary footer
│     │  ├─ RetailerInsightsPanel.tsx ← Insights side panel
│     │  ├─ CategoryTabs.tsx ← Product category tabs
│     │  └─ SuccessOverlay.tsx ← Order confirmation
│     ├─ hooks/
│     │  ├─ useDashboardData.ts ← Fetch dashboard
│     │  ├─ useRetailerRoute.ts ← Fetch route + retailers
│     │  ├─ useAssistedOrder.ts ← Order state management
│     │  ├─ useProductCatalog.ts ← Product fetching
│     │  └─ useDailySummary.ts ← Summary generation
│     ├─ services/
│     │  ├─ SalesmanAPI.ts ← API endpoints
│     │  ├─ OrderService.ts ← Order placement logic
│     │  ├─ CacheManager.ts ← Local cache + invalidation
│     │  └─ AnalyticsService.ts ← Track salesman actions
│     ├─ types/
│     │  ├─ index.ts ← TypeScript interfaces
│     │  └─ salesmanModels.ts
│     ├─ constants/
│     │  ├─ colors.ts ← Design tokens
│     │  ├─ spacing.ts
│     │  ├─ typography.ts
│     │  └─ performance.ts ← Thresholds (2sec load, etc)
│     ├─ utils/
│     │  ├─ formatters.ts ← Time, currency formatting
│     │  ├─ computeSummary.ts ← Daily summary calculation
│     │  └─ performanceOptimizations.ts
│     └─ navigation/
│        └─ SalesmanStackNavigator.tsx ← All 5 screens

shared/
├─ components/
│  ├─ BottomActionBar.tsx ← Reusable button bar
│  └─ NotificationBadge.tsx
├─ services/
│  ├─ api/ ← API clients (shared auth)
│  └─ cache/ ← Cache layer (shared)
└─ theme/
   └─ designTokens.ts ← Global design system
```

---

### 7.2 Performance Optimizations

```
RENDERING PERFORMANCE:

1. FlatList Virtual Scrolling (Retailer Preview List):
   ├─ renderItem: Memoized with React.memo
   ├─ initialNumToRender: 5
   ├─ maxToRenderPerBatch: 10
   ├─ updateCellsBatchingPeriod: 50ms
   ├─ removeClippedSubviews: true
   └─ Fixed height per item (80pt) → Enables indexing

2. Product List FlatList (Assisted Order):
   ├─ renderItem: Memoized component
   ├─ initialNumToRender: 3
   ├─ maxToRenderPerBatch: 8
   ├─ Fixed card height (90pt)
   ├─ Lazy image loading (Intersection Observer pattern)
   └─ Debounce quantity updates (500ms)

3. Memoization:
   ├─ RetailerPreviewCard: React.memo + custom comparator
   ├─ ProductCard: React.memo (skip re-render if qty unchanged)
   ├─ StatsCard: React.memo
   └─ Images: Cached at native layer (fast.image lib)

4. Image Optimization:
   ├─ Load format: WebP (if supported) → JPG fallback
   ├─ Size: 40pt card needs 1x, 2x images only (no 3x)
   ├─ Prefix: Cache before rendering (preloadImages API)
   └─ Fallback: Placeholder color while loading

DATA FETCHING STRATEGY:

1. Cache-First Approach:
   ├─ On mount: Load from AsyncStorage (instant UI)
   ├─ After mount: Fetch fresh data in background
   ├─ Update cache if new data differs
   ├─ Only update UI if data actually changed
   └─ User sees cached UI while network request happens

2. Request Batching:
   ├─ Dashboard load: Single API call (route + retailers + stats)
   ├─ Not separate calls for each metric
   └─ Reduces latency + reduces server load

3. Pagination (If 100+ retailers):
   ├─ Initial load: First 30 retailers
   ├─ Scroll to end: Load next batch (pagination)
   ├─ Keep previous batches in memory (no scroll jump)
   └─ Estimate: <2sec initial, incremental batches load <500ms

4. WebSocket (Real-time Updates):
   ├─ Subscribe to: order_placed, retailer_status_changed
   ├─ On event: Update local state only (no full refresh)
   ├─ Broadcast to UI: Re-render specific component (not full page)
   └─ Reduces latency to <1 sec for order confirmation

NETWORK OPTIMIZATION:

1. Request Compression:
   ├─ Enable gzip at HTTP level
   ├─ Payload sizes: <50KB (typical dashboard response)
   └─ API versioning: Use specific endpoints (not overfetch)

2. Request Cancellation:
   ├─ If user navigates away: Cancel pending requests
   ├─ Prevents: Stale state updates + wasted bandwidth
   └─ Use AbortController pattern

3. Offline Support:
   ├─ If offline: Show cached data + "Last updated X min ago"
   ├─ Queued actions: Save locally, sync when online
   └─ Graceful degradation (read-only mode if no network)

MEMORY OPTIMIZATION:

1. Object Pooling:
   ├─ Reuse component instances (especially cards)
   ├─ Don't create new objects in render
   └─ FlatList handles this with recycling (built-in)

2. Event Listener Cleanup:
   ├─ Remove all listeners on screen unmount
   ├─ WebSocket subscription: Unsubscribe on screen exit
   └─ Timers: Clear all on unmount (no memory leaks)

3. Memory Budget:
   ├─ Target: <50MB per screen
   ├─ Dashboard: ~30MB (30 retailer cards + data)
   ├─ Assisted Order: ~40MB (50 products + images)
   └─ Monitor: Use React Native Profiler

ANIMATION PERFORMANCE:

1. Use Native Driver:
   ├─ useNativeDriver: true for all Animated.value
   ├─ Runs on native thread (not JS thread)
   ├─ 60 FPS guaranteed (if not blocking main thread)
   └─ Never animate layout properties (use transform instead)

2. Transition Animations:
   ├─ Screen transitions: 300ms fade (built-in RNN rules)
   ├─ Card scale-in: 300ms easing.out cubic
   ├─ Scroll: Native (60 FPS by default)
   └─ Quantity changes: No animation (instant for speed)
```

---

### 7.3 API Endpoints Required

```
ENDPOINTS (Backend Requirements):

1. GET /salesman/dashboard/:salmanId
   ├─ Response: Route info, stats, retailers preview, schemes, alerts
   ├─ Cache: 5 minutes
   └─ Latency: <1 sec (70th percentile)

2. GET /salesman/route/:routeId/retailers
   ├─ Response: Full retailer list for route (with pagination)
   ├─ Params: route_id, offset, limit
   ├─ Sorting: By priority (visited first, then inactive)
   └─ Latency: <1 sec

3. POST /order/create
   ├─ Body: { retailer_id, items: [{id, qty}], payment_mode }
   ├─ Response: { order_id, success, total_value }
   ├─ Idempotency: Support retry with same order_id
   └─ Latency: <2 sec

4. GET /retailer/:retailerId/lastOrder
   ├─ Response: { items, total, date, time }
   ├─ Cache: 24 hours
   └─ Latency: <500ms

5. GET /products/:category
   ├─ Response: Product list with images, prices, stock
   ├─ Cache: 1 hour
   ├─ Params: category, limit, offset
   └─ Latency: <800ms

6. GET /retailer/:retailerId/insights
   ├─ Response: Last order, avg, pending, health, inactive_days
   ├─ Cache: 1 hour
   └─ Latency: <500ms

7. POST /salesman/visitStatus
   ├─ Body: { retailer_id, status: "visited" | "skipped", reason }
   ├─ Response: { success, updated_route_stats }
   └─ Latency: <500ms

8. GET /salesman/summary/:routeId
   ├─ Response: Daily summary (visited count, orders, skipped, recommendations)
   ├─ Cache: 30 min
   └─ Latency: <500ms

REAL-TIME EVENTS (WebSocket):
├─ order_placed (listeners: Dashboard, RouteVisit)
├─ retailer_status_changed (listeners: RouteVisit)
├─ scheme_updated (listeners: AssistedOrder)
└─ delivery_status_changed (listeners: RetailerInsights)

ERROR HANDLING:
├─ Network timeout: Show cached data + "Offline mode"
├─ Failed order creation: Show error + "Retry" button
├─ 4xx errors: Show user-friendly message
└─ 5xx errors: Retry with exponential backoff
```

---

## PART 8: IMPLEMENTATION ROADMAP

### 8.1 Development Phases

```
PHASE 1: MVP (Week 1–2)
├─ Screen 1: Salesman Dashboard (basic stats, retailer list)
├─ Screen 2: Route Visit (retailer details, swipe navigation)
├─ Screen 3: Assisted Order (basic product selection + quantity)
├─ Orders: Can place orders
├─ No offline support

PHASE 2: Polish & Performance (Week 3)
├─ Add Retailer Insights panel
├─ Add Daily Summary screen
├─ Performance optimizations (virtual scroll, caching)
├─ Improve error handling
├─ Add analytics tracking

PHASE 3: Advanced Features (Week 4+)
├─ Offline support
├─ Order draft saving (Hold functionality)
├─ Photo capture for visit verification
├─ Advanced analytics + leaderboards
├─ AI-powered recommendations
```

---

**NEXT STEP:** Hand this design spec to frontend dev team for implementation.  
**QUESTIONS?** Reach out to product team; design is open for iteration based on technical constraints.

