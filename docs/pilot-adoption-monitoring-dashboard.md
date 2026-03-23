# Pilot Adoption Monitoring: Metrics & Dashboard Design

## Executive Summary

This document defines the monitoring framework for tracking pilot retailer adoption. The admin panel will surface **7 core KPIs** organized into **4 dashboard card categories**, with automated alert logic to flag underperforming retailers/segments early.

**Key Principle:** Prioritize *action-oriented* metrics over vanity metrics. Every KPI should drive a decision or intervention.

**Update Frequency:** Real-time (data refreshes every 15 min)  
**Alert Latency:** 2–4 hours from event to notification  
**Stakeholders:** Pilot PM, Support Manager, Distributor Operations Lead

---

## PART 1: CORE PILOT ADOPTION METRICS

### 1.1 Metric Definitions

#### Metric #1: Total Pilot Retailers Onboarded (Counter)

**Definition:** Cumulative count of retailers who have completed onboarding (account created + first login successful).

**Formula:**
```
Total Onboarded = COUNT(retailers WHERE account_status = 'active' AND first_login_date IS NOT NULL)
```

**Data Points Captured:**
- Retailer ID
- Retailer Name
- Account Created Date
- First Login Date
- Onboarding Rep Name
- Batch Assignment (A/B/C)
- Readiness Score (from pilot selection)

**Update:** Real-time (upon first login)  
**Target (Week 1):** 25–40 retailers | (Week 2): 90–100% of target cohort  
**Dashboard Display:**
```
┌─────────────────────┐
│ Retailers Onboarded │
│                     │
│      28 / 35        │  (count / target)
│      80% Progress   │
│                     │
│ 🟢 On Track         │  (status indicator)
└─────────────────────┘
```

---

#### Metric #2: First Order Placement Rate (Percentage)

**Definition:** % of onboarded retailers who have placed at least one order.

**Formula:**
```
First Order Rate = (COUNT(retailers WHERE order_count ≥ 1) / Total Onboarded) × 100
```

**Dimensions Tracked:**
- By Batch (A, B, C separately)
- By Frequency Segment (High, Medium, Low)
- By Readiness Tier (1, 2, 3)
- By Onboarding Rep
- Cumulative (all-time) + by week

**Event Capture:**
- Retailer ID → Order ID → Order Date → Order Status

**Critical Thresholds:**
- Batch A: Target ≥90% by Day 7
- Batch B: Target ≥85% by Day 10
- Batch C: Target ≥75% by Day 14

**Dashboard Display:**
```
┌──────────────────────────┐
│ First Orders Placed      │
│                          │
│ Overall: 24/28 (86%)     │  (prominent %)
│ 🟢 Exceeds Target (80%)   │  (status)
│                          │
│ Batch A: 16/16 (100%)    │ (breakdown by batch)
│ Batch B:  6/8   (75%)    │
│ Batch C:  2/4   (50%)    │
└──────────────────────────┘
```

---

#### Metric #3: Weekly Active Ordering Retailers (Gauge)

**Definition:** Count of unique retailers who placed ≥1 order in the current week (Mon–Sun).

**Formula:**
```
Weekly Active = COUNT(DISTINCT retailer_id WHERE order_date BETWEEN week_start AND week_end)
```

**Dimensions:**
- Current week (live)
- Previous 4 weeks (trend)
- By Batch
- By Frequency Segment
- Repeat vs. new first-time orderers

**Event Capture:**
- Order placed (timestamp, retailer_id, channel: app vs. WhatsApp vs. phone)

**Calculation Logic:**
- Counts *unique retailers* (if a retailer places 5 orders, counted once)
- Resets weekly (Sunday end-of-day UTC)
- Backfilled for all prior weeks of pilot

**Dashboard Display:**
```
┌──────────────────────────┐
│ Weekly Active Retailers  │
│                          │
│  This Week: 18 / 28      │  (active / onboarded)
│  📊 64% Active           │
│  🟡 Declining Trend      │  (alert if <60%)
│                          │
│ Last 4 Weeks:            │
│ Week 1: 24 (86%)         │  (sparkline trend)
│ Week 2: 22 (79%)         │
│ Week 3: 20 (71%)         │
│ Week 4: 18 (64%) ← THIS  │
│                          │
│ 🚨 Alert: 2 retailers    │  (inactive >7 days)
│    inactive >7 days      │
└──────────────────────────┘
```

---

#### Metric #4: Average Order Frequency Change (YoY Baseline or Pilot-Period Comparison)

**Definition:** Average # of orders per retailer per week, comparing pre-pilot baseline vs. pilot period.

**Formula:**
```
Pilot Frequency = SUM(order_count per retailer) / COUNT(retailers) / weeks_in_pilot

Frequency Change = (Pilot Frequency - Pre-Pilot Frequency) / Pre-Pilot Frequency × 100
```

**Scenario A: Pre-Pilot Baseline Available**
- For retailers with 6+ months order history: Calculate avg orders/week before pilot
- Compare to avg orders/week during pilot
- Report % change (e.g., "+12%" means ordering 12% more often)

**Scenario B: No Pre-Pilot Baseline**
- For new/low-history retailers: Track orders/week from Week 1 → current
- Report trend (increasing, stable, declining)

**Data Points:**
- Retailer ID
- Order count (per week, cumulative)
- Week-over-week changes
- Frequency trajectory (slope)

**Dashboard Display:**
```
┌──────────────────────────┐
│ Order Frequency Change   │
│                          │
│ Avg Orders/Week:         │
│ Pre-Pilot: 2.1/week      │  (baseline)
│ During Pilot: 2.4/week   │
│ Change: +14% ✅          │  (positive)
│                          │
│ Distribution:            │
│ ▲ Increased: 18 retailers│  (growing)
│ → Stable: 8 retailers    │
│ ▼ Decreased: 2 retailers │  (churn risk)
│                          │
│ Trend:                   │
│  ╱╱╱  (upward slope)     │  (sparkline)
└──────────────────────────┘
```

---

#### Metric #5: Platform Channel Mix (Adoption vs. Legacy Channels)

**Definition:** % of orders placed via app vs. WhatsApp/phone (legacy channels).

**Formula:**
```
App Order % = (COUNT(orders WHERE channel = 'app') / Total Orders) × 100
WhatsApp % = (COUNT(orders WHERE channel = 'whatsapp') / Total Orders) × 100
Phone % = (COUNT(orders WHERE channel = 'phone') / Total Orders) × 100
```

**Dimensions:**
- By Batch
- By Frequency Segment
- Week-over-week trend
- Per-retailer breakdown (which retailers still using WhatsApp?)

**Data Capture:**
- Every order tagged with channel source (app / WhatsApp / phone / email / other)
- Retailer ID → Channel → Order ID → Order Date

**Target:**
- Week 1: 70%+ orders via app (pilot cohort is early adopters)
- Week 2: 75%+ via app
- Week 4: 80%+ via app
- Steady state (post-pilot): 80–85% via app (legacy channels will always exist)

**Dashboard Display:**
```
┌──────────────────────────┐
│ Channel Mix (All Orders) │
│                          │
│ 📱 App:      58/74 (78%) │  (✅ exceeds target)
│ 💬 WhatsApp: 12/74 (16%) │
│ ☎️  Phone:    4/74  (5%) │
│                          │
│ Trend (Last 4 Weeks):    │
│ Week 1: 65% app ▲        │  (trend up)
│ Week 2: 70% app ▲        │
│ Week 3: 75% app ▲        │
│ Week 4: 78% app ← THIS   │
│                          │
│ Retailers still using    │
│ WhatsApp for >50% orders:│
│ • RetailerID_023 (67%)   │  (intervention target)
│ • RetailerID_041 (100%)  │
│                          │
│ Action: Contact these 2  │
│ for support re: app usage│
└──────────────────────────┘
```

---

#### Metric #6: Retailer Retention / Churn Rate (Percentage)

**Definition:** % of onboarded retailers who have NOT churned (defined as inactive >14 days).

**Formula:**
```
Active Retailers = COUNT(retailers WHERE last_order_date OR last_login_date > 14 days ago)
Retention Rate = (Active Retailers / Total Onboarded) × 100
Churn Rate = 100 - Retention Rate
```

**Churn Tiers:**
- **Dormant (no activity ≥7 days):** Requires outreach check-in
- **Churned (no activity ≥14 days):** At-risk; escalate to PM
- **Departed (explicitly deactivated):** Terminal churn; capture exit feedback

**Dashboard Display:**
```
┌──────────────────────────┐
│ Retailer Retention       │
│                          │
│ Active (last 14 days):   │
│ 26 / 28 retailers        │
│ Retention: 93% ✅        │  (good)
│ Churn: 7%                │
│                          │
│ Status Breakdown:        │
│ 🟢 Active: 26            │  (ordered in 7 days)
│ 🟡 Dormant: 2            │  (no activity 7–14 days)
│ 🔴 Churned: 0            │  (no activity >14 days)
│                          │
│ Dormant Retailers:       │
│ • RetailerID_012         │  (with intervention link)
│ • RetailerID_035         │
│ [ Contact Now ]          │
└──────────────────────────┘
```

---

#### Metric #7: Average Order Value & Order Metrics (Add-on Context)

**Definition:** Avg value per order; avg items per order; avg order completion time (from creation to payment).

**Formulas:**
```
Avg Order Value = SUM(order_totals) / COUNT(orders)
Avg Items/Order = SUM(items_per_order) / COUNT(orders)
Avg Time-to-Complete = median(checkout_seconds)
```

**Dimensions:**
- By Batch
- By Retailer Frequency Segment
- Week-over-week trend

**Dashboard Display:**
```
┌──────────────────────────┐
│ Order Metrics            │
│                          │
│ Avg Order Value: $87.50  │
│ Avg Items/Order: 4.2     │
│ Avg Time to Checkout:    │
│ 8.5 minutes ✅           │  (target <10 min)
│                          │
│ Batch Comparison:        │
│ Batch A: $92 avg, 7m     │
│ Batch B: $85 avg, 9m     │
│ Batch C: $72 avg, 12m    │
│                          │
│ Week-over-Week:          │
│ Avg Value: ↑ +3%         │  (growing order size)
│ Avg Items: ↑ +2%         │
│ Time: → stable           │
└──────────────────────────┘
```

---

### 1.2 Metric Hierarchy & Importance

**Primary Metrics (Always Visible):**
1. First Order Placement Rate (% of onboarded retailers with ≥1 order)
2. Weekly Active Ordering Retailers (count + % of onboarded)
3. Churn Rate (% inactive >14 days)

**Secondary Metrics (Tab/Drill-Down):**
4. Average Order Frequency Change (trend vs. baseline)
5. Channel Mix (% app vs. legacy channels)
6. Avg Order Value & fulfillment metrics

**Tertiary Metrics (For Analysis/Export):**
7. Total Onboarded (counter; mainly for sanity check)

---

## PART 2: ADOPTION KPI DASHBOARD CARDS

### 2.1 Dashboard Layout (Admin Panel)

```
╔════════════════════════════════════════════════════════════════════════╗
║ PILOT ADOPTION DASHBOARD (Real-Time)                                   ║
║ Last Updated: 2 min ago | Refresh: Auto (15 min)                       ║
║ Date Range: Week 1–4 of Pilot (May 12–June 9, 2026)                   ║
╠════════════════════════════════════════════════════════════════════════╣
║                                                                         ║
║  ┌─ FIRST-LOOK SUMMARY ─────────────────────────────────────────────┐ ║
║  │                                                                   │ ║
║  │  Pilot Status: ACTIVE ✅ | 28/35 Onboarded | Week 2 of 4        │ ║
║  │                                                                   │ ║
║  │ ┌─────────────────┬─────────────────┬─────────────────┐         │ ║
║  │ │ First Orders    │ Weekly Active   │ Retention       │         │ ║
║  │ │ 24 / 28 (86%)   │ 18 / 28 (64%)   │ 26 / 28 (93%)   │         │ ║
║  │ │ 🟢 On Track     │ 🟡 Declining    │ 🟢 Healthy      │         │ ║
║  │ └─────────────────┴─────────────────┴─────────────────┘         │ ║
║  │                                                                   │ ║
║  │ Alerts: 🚨 2 retailers inactive >7 days                          │ ║
║  │         ⚠️  Low app adoption in Batch C (40%)                    │ ║
║  │                                                                   │ ║
║  └─────────────────────────────────────────────────────────────────┘ ║
║                                                                         ║
║  ┌──────────────────────────────┐  ┌──────────────────────────────┐   ║
║  │ CARD 1: ONBOARDING PROGRESS  │  │ CARD 2: ACTIVE RETAILERS     │   ║
║  │ (Week-by-Week Trajectory)    │  │ (Strength & Trend)           │   ║
║  │                              │  │                              │   ║
║  │ Total Onboarded: 28/35       │  │ This Week: 18 active (64%)   │   ║
║  │ 🟢 On Track (+3 this week)   │  │ 🟡 Declining (-2 vs. last wk)│   ║
║  │                              │  │                              │   ║
║  │ Week-by-Week:                │  │ Last 4 Weeks:                │   ║
║  │ W1: 8  (planned)             │  │ W1: 24 (86%) ██████████░░   │   ║
║  │ W2: 28 (28 complete) ✅     │  │ W2: 22 (79%) █████████░░░   │   ║
║  │ W3: + onboarding...          │  │ W3: 20 (71%) ████████░░░░   │   ║
║  │ W4: + onboarding...          │  │ W4: 18 (64%) ███████░░░░░   │   ║
║  │                              │  │                              │   ║
║  │ [View by Batch A/B/C]        │  │ [Drill Into Inactive List]   │   ║
║  │                              │  │                              │   ║
║  └──────────────────────────────┘  └──────────────────────────────┘   ║
║                                                                         ║
║  ┌──────────────────────────────┐  ┌──────────────────────────────┐   ║
║  │ CARD 3: FIRST ORDERS PLACED  │  │ CARD 4: CHANNEL MIX          │   ║
║  │ (Conversion Rate)            │  │ (Platform Adoption)          │   ║
║  │                              │  │                              │   ║
║  │ Placed ≥1 Order: 24/28 (86%) │  │ 📱 App:    58/74 (78%)       │   ║
║  │ 🟢 Exceeds Target (80%)      │  │ 💬 WhatsApp: 12/74 (16%)     │   ║
║  │                              │  │ ☎️ Phone:   4/74 (5%)        │   ║
║  │ By Batch:                    │  │                              │   ║
║  │ A: 16/16 (100%) ██████████   │  │ Trend (4 Weeks):             │   ║
║  │ B: 6/8 (75%)   ███████░░░    │  │     65% → 70% → 75% → 78% ↗  │   ║
║  │ C: 2/4 (50%)   █████░░░░░    │  │ 🟢 Trending Up               │   ║
║  │                              │  │                              │   ║
║  │ [View by Frequency Segment]  │  │ [Retailers still on WhatsApp]│   ║
║  │                              │  │                              │   ║
║  └──────────────────────────────┘  └──────────────────────────────┘   ║
║                                                                         ║
║  ┌──────────────────────────────┐  ┌──────────────────────────────┐   ║
║  │ CARD 5: RETENTION & CHURN    │  │ CARD 6: ORDER FREQUENCY      │   ║
║  │ (Engagement Strength)        │  │ (Adoption Momentum)          │   ║
║  │                              │  │                              │   ║
║  │ Active (≤14 days): 26 (93%)  │  │ Avg Orders/Week:             │   ║
║  │ 🟢 Healthy Retention         │  │ Pre-Pilot: 2.1/week          │   ║
║  │                              │  │ During: 2.4/week             │   ║
║  │ Status Breakdown:            │  │ Change: +14% ✅              │   ║
║  │ 🟢 Active: 26 (93%)          │  │                              │   ║
║  │ 🟡 Dormant: 2 (7%)           │  │ Distribution:                │   ║
║  │ 🔴 Churned: 0 (0%)           │  │ ▲ Increased: 18 retailers    │   ║
║  │                              │  │ → Stable: 8 retailers        │   ║
║  │ [View Dormant Retailers]     │  │ ▼ Decreased: 2 retailers     │   ║
║  │                              │  │                              │   ║
║  └──────────────────────────────┘  └──────────────────────────────┘   ║
║                                                                         ║
║  ┌──────────────────────────────────────────────────────────────────┐ ║
║  │ CARD 7: OPTIONAL - ORDER METRICS & PERFORMANCE                  │ ║
║  │                                                                  │ ║
║  │ Avg Order Value: $87.50 ↑ +3%                                   │ ║
║  │ Avg Items/Order: 4.2 ↑ +2%                                      │ ║
║  │ Avg Checkout Time: 8.5 min ✅ (target <10)                      │ ║
║  │                                                                  │ ║
║  │ [Export Data] [View Detailed Breakdown]                         │ ║
║  │                                                                  │ ║
║  └──────────────────────────────────────────────────────────────────┘ ║
║                                                                         ║
╚════════════════════════════════════════════════════════════════════════╝
```

---

### 2.2 Individual Dashboard Card Specifications

#### Card 1: Onboarding Progress

**Purpose:** Track how many retailers are successfully getting through account setup.

**Visual Layout:**
```
┌─────────────────────────────────────┐
│ ONBOARDING PROGRESS                 │
│                                     │
│ Total Onboarded: 28 / 35            │  (count / plan)
│ Progress: ████████░░ 80%            │  (bar)
│ Status: 🟢 ON TRACK                 │  (badge)
│                                     │
│ Week-by-Week Breakdown:             │
│ Week 1: 8/8 (100%) ✅              │  (8 planned, 8 done)
│ Week 2: 16/16 (100%) ✅            │  (onboard more)
│ Week 3: 4/8 (50%) in progress...   │  (ongoing)
│ Week 4: planned (depends on pace)  │
│                                     │
│ 📈 Trend: On Pace for 35 by EOW    │  (forecast)
│                                     │
│ [ View by Batch A/B/C ]             │
│ [ Export Onboarding List ]          │
│                                     │
└─────────────────────────────────────┘
```

**Data Points:**
- Total Onboarded (count)
- Target Onboarded (count, from plan)
- % Complete
- Week-by-week breakdown
- Forecast (trajectory-based, when will we hit 35?)
- Button: Drill by batch (see which batch is behind)

**Update Frequency:** Real-time (when new account created + first login)

**Alert Condition:** If forecast shows <32 retailers by end of pilot, flag PM

---

#### Card 2: Weekly Active Ordering Retailers (Weekly Gauge)

**Purpose:** Detect if retailers are ordering regularly or going dormant.

**Visual Layout:**
```
┌─────────────────────────────────────┐
│ WEEKLY ACTIVE RETAILERS             │
│                                     │
│ This Week (May 19–25): 18 / 28      │
│ Active Rate: 64%                    │
│ 🟡 DECLINING TREND ⚠️               │
│                                     │
│ 4-Week Trend:                       │
│ ║████████████░░░  Week 1: 24        │
│ ║███████████░░░░  Week 2: 22 ↓2     │
│ ║██████████░░░░░  Week 3: 20 ↓2     │
│ ║█████████░░░░░░  Week 4: 18 ↓2     │ ← THIS WEEK
│                                     │
│ 📉 Declining -6 retailers/week      │
│ ⚠️  At this rate, <5 active by W8   │
│                                     │
│ [ View Inactive Retailers ]         │
│ [ Send Check-in Campaign ]          │
│                                     │
└─────────────────────────────────────┘
```

**Data Points:**
- Current week active count
- % of total onboarded
- Last 4 weeks (sparkline trend)
- Week-over-week delta
- Slope calculation (avg change per week)
- Forecast (if trend continues, when do we hit critical threshold?)
- Link to inactive retailers (drill-down)

**Update Frequency:** Daily (recalculated Sunday EOD for each week)

**Alert Threshold:**
- 🟢 GREEN: ≥70% weekly active
- 🟡 YELLOW: 60–69% weekly active
- 🔴 RED: <60% weekly active

---

#### Card 3: First Order Placement Rate

**Purpose:** Indicator of platform conversion—did retailer get value on first try?

**Visual Layout:**
```
┌─────────────────────────────────────┐
│ FIRST ORDERS PLACED                 │
│                                     │
│ Overall: 24 / 28 (86%)              │
│ Status: 🟢 EXCEEDS TARGET (80%)     │
│                                     │
│ By Batch:                           │
│ Batch A: 16 / 16 (100%) ✅         │
│ Batch B: 6 / 8   (75%)              │
│ Batch C: 2 / 4   (50%) ⚠️           │
│                                     │
│ By Frequency Segment:               │
│ High-freq: 18/20 (90%) ✅           │
│ Med-freq:  5/6   (83%)              │
│ Low-freq:  1/2   (50%) ⚠️           │
│                                     │
│ Days to First Order (Median):       │
│ Batch A: 0.5 days ⚡               │
│ Batch B: 1.2 days                   │
│ Batch C: 3.1 days                   │
│                                     │
│ [ View Retailers Without Orders ]   │
│ [ Send Nudge Campaign ]             │
│                                     │
└─────────────────────────────────────┘
```

**Data Points:**
- Overall % (primary)
- By batch (breakdown)
- By frequency segment
- Days to first order (median)
- Retailers who haven't ordered yet (list)
- Links: send nudge, view details

**Update Frequency:** Real-time (when order is placed)

**Alert Threshold:**
- 🟢 GREEN: ≥85% overall
- 🟡 YELLOW: 75–84%
- 🔴 RED: <75%

---

#### Card 4: Channel Mix (Platform Adoption)

**Purpose:** Measure if retailers are adopting the app or still using legacy channels.

**Visual Layout:**
```
┌─────────────────────────────────────┐
│ CHANNEL MIX (ALL ORDERS)            │
│                                     │
│ 📱 App:      58 / 74 (78%)          │
│    ████████░░ 🟢 TRENDING UP       │
│                                     │
│ 💬 WhatsApp: 12 / 74 (16%)          │
│    ██░░░░░░░░░░                     │
│                                     │
│ ☎️ Phone:    4 / 74 (5%)            │
│    █░░░░░░░░░░░░                    │
│                                     │
│ 📧 Other:    0 / 74 (0%)            │
│                                     │
│ 4-Week Trend (App %):               │
│ W1: 65% ↗ W2: 70% ↗ W3: 75% ↗      │
│ W4: 78% ← THIS WEEK                 │
│ Target: 80% (by end of pilot)       │
│                                     │
│ Retailers Still Ordering via        │
│ WhatsApp (>50% of their orders):    │
│ • RetailerID_023: 67% WhatsApp      │
│ • RetailerID_041: 100% WhatsApp     │
│                                     │
│ [ Contact These 2 for Support ]     │
│ [ Send "Switch to App" Campaign ]   │
│                                     │
└─────────────────────────────────────┘
```

**Data Points:**
- Percent by channel (pie or stacked bar)
- 4-week trend (sparkline)
- Retailers heavy on legacy channels (list)
- Links: contact them, run campaign

**Update Frequency:** Real-time (when order is placed with channel tag)

**Alert Threshold:**
- 🟢 GREEN: ≥75% app orders
- 🟡 YELLOW: 65–74% app orders
- 🔴 RED: <65% app orders

---

#### Card 5: Retention / Churn

**Purpose:** Long-term viability—are retailers likely to keep using the platform?

**Visual Layout:**
```
┌─────────────────────────────────────┐
│ RETENTION & CHURN STATUS            │
│                                     │
│ Active (ordered ≤14 days): 26/28    │
│ Retention Rate: 93% 🟢 HEALTHY      │
│ Churn Rate: 7%                      │
│                                     │
│ Status Breakdown:                   │
│ 🟢 Active (≤7 days): 24 (86%)       │
│ 🟡 Dormant (7-14 days): 2 (7%)      │
│ 🔴 Churned (>14 days): 0 (0%)       │
│                                     │
│ Explicitly Deactivated: 0           │
│                                     │
│ 🟡 DORMANT RETAILERS (Needs Follow)│
│ • RetailerID_012                    │
│   Last activity: 9 days ago         │
│   Action: [ Send Check-in ]         │
│                                     │
│ • RetailerID_035                    │
│   Last activity: 8 days ago         │
│   Action: [ Send Check-in ]         │
│                                     │
│ [ View Churn Details ]              │
│ [ Export At-Risk List ]             │
│                                     │
└─────────────────────────────────────┘
```

**Data Points:**
- Active retailer count (primary)
- Status breakdown (active/dormant/churned)
- List of dormant retailers (>7 days no activity)
- Quick action links (send check-in, view details)

**Update Frequency:** Real-time (when order/login happens)

**Alert Threshold:**
- 🟢 GREEN: ≥90% retention
- 🟡 YELLOW: 80–89% retention
- 🔴 RED: <80% retention

---

#### Card 6: Average Order Frequency (Adoption Momentum Indicator)

**Purpose:** Is ordering behavior *increasing*? Key indicator of genuine adoption vs. trial.

**Visual Layout:**
```
┌─────────────────────────────────────┐
│ ORDER FREQUENCY (vs. Pre-Pilot)     │
│                                     │
│ Pre-Pilot Avg: 2.1 orders/week      │
│ During Pilot: 2.4 orders/week       │
│ Change: +14% ✅ POSITIVE            │
│                                     │
│ Distribution:                       │
│ ▲ Increased (>5% more): 18 (64%)    │
│ → Stable (±5%): 8 (29%)             │
│ ▼ Decreased (>5% less): 2 (7%)      │
│                                     │
│ Top Increasers (>50% increase):     │
│ • RetailerID_008: 1.2 → 2.1/week    │
│ • RetailerID_015: 1.8 → 3.0/week    │
│                                     │
│ Top Decreasers (<50% decrease):     │
│ • RetailerID_022: 3.0 → 2.0/week    │
│ • RetailerID_031: 2.5 → 1.8/week    │
│                                     │
│ [ View Week-over-Week Trend ]       │
│ [ Export Frequency Analysis ]       │
│                                     │
└─────────────────────────────────────┘
```

**Data Points:**
- Pre-pilot avg frequency (per retailer)
- Current avg frequency
- % change
- Distribution (who's up, who's down, who's stable)
- Top gainers / top losers
- Link to detailed trend

**Update Frequency:** Weekly (updated Monday AM)

**Alert Threshold:**
- 🟢 GREEN: ≥10% frequency increase overall
- 🟡 YELLOW: 0–9% increase (flat/slight growth)
- 🔴 RED: <0% (declining frequency)

---

### 2.3 Dashboard Status Badges & Color Coding

**Status Indicators (Top Right of Each Card):**

| Badge | Meaning | Color | Action |
|-------|---------|-------|--------|
| 🟢 ON TRACK | Metric meets/exceeds target | Green | Monitor; celebrate wins |
| 🟡 AT RISK | Metric approaching threshold | Yellow | Investigate; plan intervention |
| 🔴 CRITICAL | Metric below threshold | Red | Urgent action required; escalate |
| ↗️ TRENDING UP | Positive trend | Green arrow | Reinforce; celebrate momentum |
| → STABLE | No major change | Gray | Monitor; maintain |
| ↘️ TRENDING DOWN | Negative trend | Red arrow | Investigate root cause |
| ⚡ HIGH MOMENTUM | Rapid growth | Lightning | Excellent; capture case studies |
| ⏳ IN PROGRESS | Ongoing; not yet complete | Gray | Expected; track schedule |

---

## PART 3: TREND VISUALIZATION SPECIFICATIONS

### 3.1 Chart Types & Use Cases

#### Sparkline (Simple Trend at a Glance)

**Best For:** Weekly active retailers, channel mix over 4 weeks

**Example:**
```
Weekly Active Trend:
24 | •
22 |  •
20 |   •
18 |    •
   └─────────────► (Week 1 → Week 4)

OR (Text-based):
W1: ████████████░░░  24 active
W2: ███████████░░░░  22 active ↓
W3: ██████████░░░░░  20 active ↓
W4: █████████░░░░░░  18 active ↓
```

**Data Points Shown:** 4 most recent data points (usually weeks or days)

**Interaction:** Hover/tap to see exact value

---

#### Stacked Bar Chart (Channel Mix Composition)

**Best For:** Platform vs. legacy channel breakdown

**Example:**
```
Channel Distribution Over 4 Weeks:

Week 1: [████ app 65%][██ other 35%]
Week 2: [█████ app 70%][██ other 30%]
Week 3: [██████ app 75%][█ other 25%]
Week 4: [██████░ app 78%][░ other 22%]

Legend:
📱 App (Green)
💬 WhatsApp (Blue)
☎️ Phone (Yellow)
📧 Other (Gray)
```

**Data Points:** Breakdown by channel; 4 weeks historical

---

#### Progress Bar (Against Target)

**Best For:** Onboarding progress, first order rate

**Example:**
```
First Orders Placed:
Target: 80% ─────┤
Actual: 86% ──────┤ ✅ EXCEEDS TARGET

Onboarding Progress:
Target: 35 retailers ────────────┤
Actual: 28 retailers ──────────░░┤ (80%)
```

**Data Points:** Current vs. target, % complete

---

#### Status Gauge / Arc Chart (Single KPI Snapshot)

**Best For:** Overall health indicator (retention %, active %, etc.)

**Example:**
```
Retention Rate

   0%─────50%─────100%
     \    |    /
      \░░░|░░/  85%
       \░░|░/
        \░|/
         

Status: 🟢 HEALTHY
```

**Data Points:** Current value, target zone, color-coded range

---

### 3.2 Trend Line Behavior & Interpretation

**Green Trends (Positive):**
- First order rate increasing
- Weekly active stable or growing
- Channel mix shifting toward app
- Order frequency increasing
- Status: Expected in Week 1 → Week 2; maintain in later weeks

**Yellow Trends (Caution):**
- Weekly active flat or slightly declining
- Channel mix stalled (not moving toward app)
- Order frequency plateauing
- Status: Investigate; may need intervention

**Red Trends (Urgent):**
- First order rate declining
- Weekly active dropping >10% week-over-week
- Churn rate rising
- Order frequency declining >10%
- Status: Escalate; root-cause analysis needed

---

## PART 4: ALERT LOGIC FOR INACTIVE RETAILERS

### 4.1 Alert Definitions & Triggers

**Alert Type #1: No Activity for 7+ Days (Dormant)**

**Trigger Condition:**
```
WHERE (LAST_ORDER_DATE < TODAY - 7 days) 
  AND (LAST_LOGIN_DATE < TODAY - 7 days)
  AND (account_status = 'active')
```

**Who Gets Alerted:**
- Support Manager (primary)
- Assigned Onboarding Rep (secondary)

**Alert Content:**
```
🟡 DORMANT RETAILER ALERT

RetailerID_012 • Tony's Market (Austin, TX)
Last Activity: 9 days ago (May 14 @ 2:34 PM)
Orders Placed: 1 (zero orders in last 7 days)
First Order Date: May 13

Readiness Score: 85 (Tier 1) - Should be active!
Batch: A (Fast-Track)

Recommendation: Send friendly check-in email/call
Template: "Hey! Just checking in—how's the app going?"

[ Send Check-in Email ] [ Call Retailer ] [ View Details ]
```

**Action Options:**
- [ Send pre-templated check-in email ]
- [ Send SMS reminder ]
- [ Call retailer directly ]
- [ View order history & recent activity ]
- [ Mark as "checked" with timestamp ]

**Wait Time Before Alert:** 7 days (gives time for slow adopters)

**Re-alert Schedule:** Every 2 days if still dormant

---

**Alert Type #2: No Orders in 14 Days (Churned/At-Risk)**

**Trigger Condition:**
```
WHERE (LAST_ORDER_DATE < TODAY - 14 days) 
  AND (account_status = 'active')
  AND (Alerted_dormant < 14 days ago)
```

**Who Gets Alerted:**
- Support Manager (primary)
- Pilot PM (secondary)
- Assigned Onboarding Rep (cc)

**Alert Content:**
```
🔴 CHURN RISK: ESCALATION ALERT

RetailerID_035 • Fresh Mart (Denver, CO)
🚨 NO ORDERS IN 14 DAYS
Last Activity: 14 days ago (May 11 @ 3:22 PM)
First Order Date: May 13 (1 order, then gone)
Readiness Score: 71 (Tier 2)
Batch: B (Core)

Previous Alert: 2 x dormant check-ins sent (May 18, 20)
Status: No response to outreach

Recommendation: Schedule urgent 1:1 call
⚠️  Risk of permanent churn if not addressed this week

[ Schedule Call Now ] [ Send Final Check-in ] [ View Analysis ]
[ Mark for Exit Interview ]
```

**Action Options:**
- [ Schedule 1:1 call with PM ]
- [ Send escalation email ("We miss you!") ]
- [ Request exit feedback if deactivating ]
- [ Reassign support contact ]
- [ Move to "at-risk" tracking dashboard ]

**Wait Time Before Alert:** 14 days

**Re-alert Schedule:** Every 3 days until resolved

---

**Alert Type #3: First Order Not Placed By Day 7 (Conversion Failure)**

**Trigger Condition:**
```
WHERE (account_created_date < TODAY - 7 days) 
  AND (order_count = 0)
  AND (Adoption_Confidence_Score < 50)
```

**Who Gets Alerted:**
- Assigned Onboarding Rep (primary)
- Support Manager (secondary)

**Alert Content:**
```
⚠️  CONVERSION ALERT: No First Order Yet

RetailerID_027 • Corner Store (Portland, OR)
Account Created: May 18 (7 days ago)
First Login: Yes (May 18 @ 4:15 PM)
Orders Placed: 0
Readiness Score: 45 (Tier 3)
Batch: C (Learner)
Adoption Confidence: 42/100 (LOW RISK)

Activity: Logged in once; no cart activity since

Recommendation: Send 1:1 retraining call
Possible Barriers: Tech confusion? App UX friction? Busy schedule?

[ Schedule Retraining Call ] [ Send Nudge Email ] [ View Activity Log ]
```

**Action Options:**
- [ Schedule 1:1 support call ]
- [ Send app intro + demo video ]
- [ Offer phone-in order (hybrid) ]
- [ Check for app crashes/errors ]
- [ Move to "high-touch" queue ]

**Wait Time Before Alert:** 7 days after onboarding

**Re-alert Schedule:** Every 2 days until first order or churn decision

---

**Alert Type #4: Heavy Reliance on Legacy Channels (App Adoption Failure)**

**Trigger Condition:**
```
WHERE order_count >= 5
  AND (app_order_count / total_orders) < 0.3
  AND (whatsapp_order_count / total_orders) > 0.5
```

**Who Gets Alerted:**
- Support Manager (primary)
- Pilot PM (secondary)

**Alert Content:**
```
🟡 CHANNEL ADOPTION ALERT

RetailerID_041 • Busy Convenience (Los Angeles, CA)
Platform Adoption: WEAK
30% App | 70% WhatsApp

Orders Summary:
Total Orders: 7
App Orders: 2 (29%)
WhatsApp Orders: 5 (71%)
Phone Orders: 0

Activity: Last app login 12 days ago; but still ordering via WhatsApp weekly

Recommendation: Investigate barrier to app usage
Possible Issues: App UX issue? Team preference for WhatsApp? Habit?

[ Send "Why Not App?" Survey ] [ Schedule UX Call ] [ Offer Training ]
```

**Action Options:**
- [ Send short survey ("What's missing in the app?") ]
- [ Schedule 15-min app walkthrough ]
- [ Offer to customize app workflow ]
- [ Check for app errors/crashes ]

**Wait Time Before Alert:** After 5+ total orders with skewed channel mix

**Re-alert Schedule:** Weekly if still <50% app usage

---

### 4.2 Alert Configuration

**Where Alerts Appear:**
1. **Alert Bell Icon** (top of dashboard) - Shows count of active alerts
2. **Dashboard Cards** - Inline within cards (e.g., "🚨 2 dormant retailers")
3. **Dedicated Alert Panel** - Slide-out or separate tab
4. **Email Notification** - Daily digest or real-time (configurable)
5. **SMS (Optional)** - For critical/urgent alerts only

**Alert Panel View:**
```
┌─────────────────────────────────────┐
│ ALERTS (6 Active)                   │
│                                     │
│ 🔴 CRITICAL (1):                    │
│ ├─ RetailerID_035: No orders 14+ d  │
│                                     │
│ 🟡 CAUTION (3):                     │
│ ├─ RetailerID_012: Dormant 9d       │
│ ├─ RetailerID_051: Dormant 8d       │
│ ├─ RetailerID_041: 70% WhatsApp     │
│                                     │
│ ⚠️  ACTION NEEDED (2):               │
│ ├─ RetailerID_027: No first order 7d│
│ ├─ RetailerID_019: Low adoption (42)│
│                                     │
│ [ View All ] [ Dismiss ] [ Config ] │
│                                     │
└─────────────────────────────────────┘
```

**Alert Bell Counter:**
```
🔔 (6)  ← Indicates 6 active alerts
```

---

### 4.3 Alert Response Workflows

**Workflow #1: Dormant Retailer (7+ Days)**

```
1. Alert Generated (Day 7 with no activity)
                 ↓
2. Support Assigned
   → [ Send Email ] or [ Call ]
                 ↓
3a. Response Received
    → Retailer explains, issue resolved
    → Log resolution, archive alert
    
3b. No Response (Days 9–12)
    → Re-alert sent (2nd nudge)
    → [ Mark as Contacted ]
                 ↓
3c. Still No Response (Day 14)
    → Escalate to Churn-Risk alert
    → PM to call directly
```

**Workflow #2: Conversion Failure (No Orders by Day 7)**

```
1. Alert Generated (Day 7, no orders)
                 ↓
2. Rep Assigned
   → Check: App errors? User confusion? Busy?
   → [ Schedule Retraining ]
                 ↓
3a. Call Completed
    → Retailer places order
    → Alert resolved
    
3b. Retailer Declines Help
    → Note in CRM
    → Watch for churn pattern
    
3c. No Response (Days 8–10)
    → 2nd attempt via email
    → If still unresponsive by Day 14 → churn tracking
```

**Workflow #3: Channel Adoption Failure (70%+ WhatsApp)**

```
1. Alert Generated (After 5 orders, <30% app usage)
                 ↓
2. Support Investigates
   → [ Send survey ] "Why prefer WhatsApp?"
   → [ Check for app issues ]
                 ↓
3a. Feedback Received
    → UI friction? Habit? Pain point?
    → Take action (UX fix, training, workaround)
    → Re-train if needed
    
3b. No Issues Found
    → Document as "preference"
    → Monitor for future adoption opportunity
    
3c. App Issues Found
    → Fix + notify retailer
    → Offer retraining
```

---

### 4.4 Alert Fatigue Prevention

**Rules to Avoid Over-Alerting:**

1. **Dont Alert Same Retailer More Than 1x Per Day**
   - Even if multiple conditions trigger, consolidate into 1 alert

2. **Clear Alerts When Action Taken**
   - Mark "[ Contacted ] [ Date/Time ]" to suppress re-alerts for 48h

3. **Graduated Escalation**
   - Day 7: Support check-in (gentle)
   - Day 14: PM check-in (moderate)
   - Day 21: Exit interview (final)

4. **Dismiss / Snooze Option**
   - Allow support to snooze alert up to 7 days (with note)
   - "Contacted on [date], waiting for response by [date]"

5. **Weekly Digest Option**
   - Allow stakeholders to choose: Real-time OR Daily Digest
   - Default: Real-time for critical (🔴), Digest for caution (🟡)

---

## PART 5: ALERT CONFIGURATION & ADMIN SETUP

### 5.1 Alert Threshold Configuration (Admin Panel)

**Settings accessible to Pilot PM / Operations Lead:**

```
┌─────────────────────────────────────┐
│ ALERT CONFIGURATION                 │
│                                     │
│ ┌─ DORMANCY THRESHOLDS ────────────┐│
│ │ Alert after X days inactive:     ││
│ │ [ 7 days ] ← default              ││
│ │ (can adjust: 5–14 days)           ││
│ │                                  ││
│ │ Re-alert every X days:           ││
│ │ [ 2 days ] ← default              ││
│ │ (can adjust: 1–7 days)            ││
│ └──────────────────────────────────┘│
│                                     │
│ ┌─ CHURN THRESHOLDS ───────────────┐│
│ │ Escalate from Dormant → Churned: ││
│ │ [ 14 days ] ← default             ││
│ │ (can adjust: 10–21 days)          ││
│ │                                  ││
│ │ Notify PM after:                 ││
│ │ [ Check ] Dormant 7+ days        ││
│ │ [ Check ] Churn 14+ days         ││
│ │ [ Check ] Zero orders after 7d   ││
│ └──────────────────────────────────┘│
│                                     │
│ ┌─ CHANNEL ADOPTION THRESHOLDS─────┐│
│ │ Alert if non-app orders exceed:  ││
│ │ [ 70% ] of total ← default        ││
│ │ (can adjust: 50–90%)              ││
│ │                                  ││
│ │ After X minimum orders:          ││
│ │ [ 5 orders ] ← default            ││
│ │ (can adjust: 3–10 orders)         ││
│ └──────────────────────────────────┘│
│                                     │
│ ┌─ ALERT DELIVERY ─────────────────┐│
│ │ [ Check ] Email to Support Mgr   ││
│ │ [ Check ] Email to Pilot PM      ││
│ │ [ Check ] SMS to Pilot PM        ││
│ │ [ Check ] In-app notification    ││
│ │ [ ] SMS to Onboarding Rep        ││
│ │                                  ││
│ │ Frequency:                       ││
│ │ ◉ Real-time (critical only)      ││
│ │ ○ Daily digest                   ││
│ │ ○ Weekly digest                  ││
│ └──────────────────────────────────┘│
│                                     │
│ [ Save Configuration ] [ Reset ]    │
│                                     │
└─────────────────────────────────────┘
```

---

### 5.2 Alert Recipient Management

**Who Gets Alerts (Configurable):**

| Alert Type | Support Manager | Pilot PM | Onboarding Rep | Distributor Lead |
|---|---|---|---|---|
| Dormant (7–14 days) | ✅ Primary | ✅ CC | ⚠️ If assigned | Optional |
| Churned (14+ days) | ✅ CC | ✅ Primary | ✅ If assigned | ✅ FYI |
| No First Order (7 days) | ⚠️ Optional | Optional | ✅ Primary | Optional |
| Channel Adoption (low app %) | ✅ Primary | ✅ CC | ⚠️ Optional | Optional |
| Batch/Segment Alerts | Optional | ✅ Primary | ⚠️ Optional | ✅ Primary |

---

## PART 6: ALERT INTEGRATION WITH INTERVENTION PLAYBOOKS

### 6.1 Automated Interventions (Low-Touch)

**When Dormant Alert Triggers → Auto-Executed (if enabled):**

1. **Day 7 (Automatic):**
   - Email: "We miss you! How's [Platform Name] going?"
   - Include 2-min app walkthrough video
   - Link: "Need help? Reply or click here"

2. **Day 10 (If no response):**
   - SMS (if opt-in): "Quick check-in: using the app? Any questions?"

3. **Day 14 (If still no response):**
   - Manual intervention triggered (support calls)

**Auto-Email Template:**

```
Subject: How's [Platform Name] Going? We're Here to Help 👋

Hi [RetailerName],

It's been about a week since you logged in! We just wanted to 
check in and see how everything's going with [Platform Name].

We know adoption can take a little time, so here are a few quick 
resources that might help:

📱 2-Min App Walkthrough Video: [link]
❓ FAQ: [link]
📞 Live Support: [phone] (Mon–Fri, 8am–6pm)
💬 Chat: In-app or [link]

Questions about:
• Placing an order? [link]
• Finding products? [link]
• Delivery tracking? [link]

Let us know how we can help!

Cheers,
Support Team @ [Company]
```

---

### 6.2 Semi-Automated Interventions (Suggested Actions)

**When Alert Triggers → Prompt Support with Actions:**

```
┌─────────────────────────────────────┐
│ ALERT: RetailerID_012 DORMANT       │
│                                     │
│ Last Activity: 9 days ago           │
│ Orders: 1 (May 13)                  │
│                                     │
│ Suggested Actions:                  │
│                                     │
│ [ ] Send Check-in Email             │
│     (auto-template, 2 min)          │
│                                     │
│ [ ] Call Retailer                   │
│     (estimated 10 min)              │
│     Script: [view]                  │
│                                     │
│ [ ] Schedule Video Call             │
│     (full retraining, 30 min)       │
│                                     │
│ [ ] Send App Tutorial Video         │
│     + FAQ Link                      │
│                                     │
│ [ ] Snooze (until [date] if         │
│     already contacted)              │
│                                     │
│ Last Action: [none]                 │
│ Reason: Not yet contacted           │
│                                     │
│ [ Take Action ] [ Mark Done ]       │
│                                     │
└─────────────────────────────────────┘
```

---

## PART 7: DASHBOARD EXPORT & REPORTING

### 7.1 Export Options

**From Dashboard, users can export:**

1. **Summary Report (1 page PDF)**
   - All 7 KPIs, current status, benchmarks
   - Trend graphics (4-week)
   - Alert summary (# dormant, # churned, etc.)

2. **Detailed Retailer List (CSV/Excel)**
   - Every retailer + all their metrics
   - Sortable by: Frequency, Batch, Status, Last Order, ACS Score
   - Columns: Name, Onboarded Date, First Order Date, Weekly Active?, Channel %, Retention Status

3. **Alert Export (CSV)**
   - All active & resolved alerts
   - Timestamp, action taken, resolution date

4. **Trend Data (Excel with Graphs)**
   - Week-by-week metrics
   - Charts: adoption curve, channel mix evolution, churn trajectory

**Export Access:**
- Pilot PM: All reports
- Support Manager: Retailer list + alerts only (no financial data)
- Distributor Lead: Summary + high-level trends

---

## PART 8: EXAMPLE DASHBOARD WALKTHROUGH (Live Scenario)

**Scenario: Tuesday, Week 2 of Pilot (May 21, 2026, 10:15 AM)**

---

**Pilot PM Opens Dashboard:**

```
╔════════════════════════════════════════════════════════════════════╗
║ PILOT ADOPTION DASHBOARD (Read-Time)                               ║
║ Last Updated: 2 min ago | Timestamp: May 21, 2026, 10:13 AM       ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║ 🟢 PILOT STATUS: HEALTHY (Week 2 of 4)                            ║
║                                                                    ║
║ ┌─────────────────┬──────────────────┬──────────────────┐         ║
║ │ FIRST LOOK METRICS                                   │         ║
║ ├─────────────────┼──────────────────┼──────────────────┤         ║
║ │ Onboarded:      │ Active This Week:│ Retention:       │         ║
║ │ 28 / 35 (80%)   │ 18 / 28 (64%)    │ 26 / 28 (93%)    │         ║
║ │ 🟢 On Track     │ 🟡 Declining     │ 🟢 Healthy       │         ║
║ └─────────────────┴──────────────────┴──────────────────┘         ║
║                                                                    ║
║ 🚨 ALERTS (3 Active):                                              ║
║  • RetailerID_035: No orders 14 days (🔴 CHURN RISK)              ║
║  • RetailerID_012: Dormant 9 days (🟡 CAUTION)                    ║
║  • RetailerID_051: Dormant 8 days (🟡 CAUTION)                    ║
║                                                                    ║
║ ┌────────────────────────────┐ ┌────────────────────────────┐    ║
║ │ CARD 1: ONBOARDING        │ │ CARD 2: WEEKLY ACTIVE      │    ║
║ │ 28/35 (80%) 🟢            │ │ 18 / 28 (64%) 🟡           │    ║
║ │                            │ │                            │    ║
║ │ Week 1: 8/8 ✅            │ │ Trend (4 weeks):           │    ║
║ │ Week 2: 20/20 ✅          │ │ W1: 24 ↘ W2: 22 ↘          │    ║
║ │ Week 3: onboarding 7/15   │ │ W3: 20 ↘ W4: 18 (THIS)     │    ║
║ │                            │ │                            │    ║
║ │ Forecast: +35 by EOWeek4  │ │ Alert: 🟡 Declining 2/wk   │    ║
║ │                            │ │                            │    ║
║ │ [View by Batch]            │ │ [Contact Dormant] [Details]│    ║
║ └────────────────────────────┘ └────────────────────────────┘    ║
║                                                                    ║
║ ┌────────────────────────────┐ ┌────────────────────────────┐    ║
║ │ CARD 3: FIRST ORDERS       │ │ CARD 4: CHANNEL MIX        │    ║
║ │ 24 / 28 (86%) 🟢           │ │ 📱 App: 78% 🟢             │    ║
║ │                            │ │ 💬 WhatsApp: 16%           │    ║
║ │ Batch A: 16/16 (100%) ✅   │ │ 📧 Phone: 5%               │    ║
║ │ Batch B: 6/8 (75%)         │ │                            │    ║
║ │ Batch C: 2/4 (50%) ⚠️      │ │ Trend: 65% → 78% ✅        │    ║
║ │                            │ │ Target: 80% (close!)       │    ║
║ │ [View Non-Converting]      │ │                            │    ║
║ │                            │ │ [Heavy WhatsApp Users: 2]  │    ║
║ └────────────────────────────┘ └────────────────────────────┘    ║
║                                                                    ║
║ ┌────────────────────────────┐ ┌────────────────────────────┐    ║
║ │ CARD 5: RETENTION          │ │ CARD 6: ORDER FREQUENCY    │    ║
║ │ Active: 26/28 (93%) 🟢     │ │ +14% vs Baseline 🟢        │    ║
║ │                            │ │                            │    ║
║ │ 🟢 Active: 24 (86%)        │ │ Pre-pilot: 2.1/week        │    ║
║ │ 🟡 Dormant: 2 (7%)         │ │ Current: 2.4/week          │    ║
║ │ 🔴 Churned: 0 (0%)         │ │                            │    ║
║ │                            │ │ Distribution:              │    ║
║ │ [Contact Dormant: 2]       │ │ ▲ +14: 18 (64%)            │    ║
║ │                            │ │ →  ±5: 8 (29%)             │    ║
║ │                            │ │ ▼ -14: 2 (7%)              │    ║
║ └────────────────────────────┘ └────────────────────────────┘    ║
║                                                                    ║
║ [ Export Report ] [ View Alerts ] [ Drill Down ] [ Config ]       ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

**PM's Observations:**
- ✅ Onboarding on track (28/35)
- ✅ First orders strong (86%, beating 80% target)
- ✅ Channel mix excellent (78% app, trending toward 80% goal)
- ⚠️ Weekly active declining (64%, slipping from 86% Week 1)
- ⚠️ 2 retailers dormant; 1 potential churn risk
- ⚠️ Batch C slower (50% first orders vs. C's 75% target)

**PM's Next Steps:**
1. Click "[ Contact Dormant: 2 ]" → Send check-in emails
2. Click "[ View Alerts ]" → Escalate RetailerID_035 to support manager
3. Check Batch C performance → May need retraining for slower adopters
4. Export weekly report to share with Distributor Lead

---

**Document Version:** 1.0  
**Last Updated:** [Current Date]  
**Next Review:** Weekly (during pilot)
