# Pilot Salesman Behavioral Reinforcement Workflow

## Overview

This document designs the daily operational framework to transform salesmen from order-takers into **active digital adoption drivers**. Success depends on clear daily priorities, achievable assisted-order targets, aligned incentives, and structured resistance handling.

**Core Hypothesis:** Salesmen who actively participate in pilot onboarding (guiding first orders, troubleshooting objections) will:
- Increase first-order conversion rates (90%+ vs. 70% without guidance)
- Accelerate time-to-first-order (same-visit vs. 3–5 days)
- Build justification case for platform ("I walked 5 retailers through today, all successful")
- Become advocates at scale-out (vs. skeptics if underutilized during pilot)

---

## PART 1: DAILY PILOT RETAILER VISIT PRIORITY LIST

### 1.1 Priority Matrix Framework

**Daily Prioritization Logic** (run every morning at 7 AM):

```
TIER 1 (CRITICAL): Must visit today
├─ Status: Onboarded but no first order (Day 1–3 since account creation)
├─ Status: Dormant 4–6 days (order activity but no recent order)
├─ Reason: Conversion/reactivation window highest first 48–72h
└─ Target: 3–5 Tier-1 visits per salesman per day

TIER 2 (HIGH): Should visit today or tomorrow
├─ Status: First order placed, but not using app (all WhatsApp orders)
├─ Status: Onboarded 7–10 days ago, but no order yet
├─ Reason: Channel adoption + slower converters need guidance
└─ Target: 2–3 Tier-2 visits per salesman per day

TIER 3 (MEDIUM): Visit this week
├─ Status: Active but order frequency declining week-over-week
├─ Status: Any retailer flagged for "learning curve" support
├─ Reason: Engagement maintenance + relationship building
└─ Target: 1–2 Tier-3 visits per salesman per week
```

---

### 1.2 Automated Daily Priority List (Dashboard Integration)

**System Input:** Pilot monitoring dashboard (real-time order + login data)

**System Output:** By 7 AM UTC each day, each salesman receives:

```
DAILY PRIORITY LIST – Salesman: [Name]
Generated: [Date] 7:00 AM
Assigned Retailers: 8 total

═══════════════════════════════════════════════════════════════
TIER 1 – MUST VISIT TODAY (Critical Conversion Window) [3 retailers]
═══════════════════════════════════════════════════════════════

1. FRESH MART (ID: rtl-042)
   Status: Onboarded 2 days ago, no order yet
   Batch: B (Core)
   Onboarding Rep: Sarah Chen
   Account Created: [Date] 10:30 AM
   Logins: 1x (Day 1 only)
   Readiness Score: 71 (moderate)
   
   Why Tier-1: Conversion window critical (48–72h best)
   Your Action: Guide first order today
   Assisted Order Target: YES (priority #1)
   
   Quick Context:
   - Store: 150 SKU retailer, medium frequency
   - Sarah's notes: "Retailer seemed confused by catalog search"
   - Recommended Approach: Walk through 3–5 top-sellers (pre-loaded in prep)
   
   ✓ Suggested Route: Fresh Mart is at [Address] – 15 min from your last stop
   ✓ Support Backup: Call Sarah (onboarding rep) if they need additional help

─────────────────────────────────────────────────────────────

2. TONY'S CORNER (ID: rtl-015)
   Status: Dormant 5 days (Last order: [Date])
   Batch: A (Fast-Track)
   Onboarding Rep: Marco Liu
   First Order: [Date] (successful)
   Total Orders: 1 (then silence)
   Readiness Score: 85 (high)
   
   Why Tier-1: Reactivation window (5d dormant = at-risk)
   Your Action: Check-in + encourage 2nd order
   Assisted Order Target: If possible (priority #2)
   
   Quick Context:
   - Previous order via app (80% app adoption ideal for Batch A)
   - Marco's notes: "Retailer showed strong mobile comfort"
   - Why went silent? Unknown – could be seasonality or forgot
   
   ✓ Your Call Script: "Hey [Name], Marco told me your first order went great.
                       How's the app working? Need me to walk through order #2?"

─────────────────────────────────────────────────────────────

3. PREM STORE (ID: rtl-028)
   Status: Onboarded 1 day ago, has logged in 3x, no order
   Batch: C (Learner)
   Onboarding Rep: Janet Williams
   Account Created: [Date] 9:15 AM
   Logins: 3x (engaged but still exploring)
   Readiness Score: 54 (lower but trying)
   
   Why Tier-1: Highest engagement signal (3x logins) = ready to convert
   Your Action: Assisted order (phone coaching style)
   Assisted Order Target: YES (priority #3)
   
   Quick Context:
   - Batch C learner; needs hand-holding but eager
   - Janet's notes: "Retailer asked about payment types, inventory visibility"
   - Recommended Approach: Simple 2–3 item order (confidence builder)
   
   ✓ Your Assisted Order Approach: "I saw you poking around the app.
                                    Want to place your first order right now?
                                    I'll walk you through—takes 2 minutes."

═══════════════════════════════════════════════════════════════
TIER 2 – HIGH PRIORITY (This Week) [3 retailers]
═══════════════════════════════════════════════════════════════

4. VALLEY TRADERS (ID: rtl-009)
   Status: 2 orders, both via WhatsApp (0% app adoption)
   Batch: B (Core)
   First Order: [Date]
   App Usage: 0x (never logged in after onboarding)
   
   Why Tier-2: Channel adoption blocker; may not be comfortable with app
   Your Action: "Channel preference" re-education visit
   Assisted Order Target: Next app order (Tier-2, not priority vs Tier-1)
   
   Quick Context:
   - Comfortable enough to order 2x, but all via WhatsApp
   - May indicate: App confusion, WhatsApp habit, or support preference
   - Your differentiation: "Show them app is 3x faster than WhatsApp for bulk item ordering"

─────────────────────────────────────────────────────────────

5. [NEXT 2 TIER-2 RETAILERS...]

═══════════════════════════════════════════════════════════════
TIER 3 – NICE TO HAVE (This Week) [2 retailers]
═══════════════════════════════════════════════════════════════

7. [Examples of relationship maintenance, frequency decline alerts...]

═══════════════════════════════════════════════════════════════
DAILY STATS & TARGETS
═══════════════════════════════════════════════════════════════

Your Today's Focus:
  ✓ Assisted Order Target: 2–3 assisted orders today (Tier-1 prioritized)
  ✓ Time Estimate: 90 minutes for all 3 Tier-1 visits
  ✓ Expected Retail Stops: 3 physical visits + 1 phone order
  
Your This-Week Focus:
  ✓ Tier-1 Conversions: Target 100% (all converts to first order)
  ✓ Tier-2 Channel Shift: Target 1 WhatsApp→app convert
  ✓ Tier-3 Retention: Target 100% "stayed active" by week end

═══════════════════════════════════════════════════════════════
COMMUNICATION PREFERENCES & BEST TIMES
═══════════════════════════════════════════════════════════════

Fresh Mart:    Store opens 8 AM, visit preferred 10–11 AM
Tony's Corner: Owner usually available 2–4 PM over phone
Prem Store:    Walk-in any time, fastest at lunch (12–1 PM)

═══════════════════════════════════════════════════════════════
ESCALATION: If you need support
═══════════════════════════════════════════════════════════════

  📞 Question about app? Call Tech Support: [link]
  📞 Question about incentives? Call Sales Manager: [link]
  📞 Retailer refuses to engage? Escalate to Pilot PM: [link]
```

---

### 1.3 Priority Calculation Logic (for Dashboard Algorithm)

**Inputs:**

```python
def calculate_visit_priority(retailer_id, pilot_data):
    """
    Assigns Tier 1–3 priority based on adoption risk signal
    """
    
    # Fetch retailer data
    retailer = get_retailer(retailer_id)
    order_history = get_order_history(retailer_id, last_30_days=True)
    login_history = get_login_history(retailer_id, last_7_days=True)
    
    # Calculate risk score (0–100, lower = more at-risk)
    risk_score = 100
    
    # Deduct for: Account age without first order
    days_since_account_creation = (today() - retailer.account_created_at).days
    if days_since_account_creation <= 3 and order_history.count() == 0:
        risk_score -= 30  # Tier 1 critical window
    elif days_since_account_creation <= 7 and order_history.count() == 0:
        risk_score -= 20  # Tier 2 extended window
    
    # Deduct for: Recent dormancy (no activity >5 days)
    days_since_last_activity = (today() - retailer.last_activity_at).days
    if 3 < days_since_last_activity <= 7:
        risk_score -= 15  # Tier 1 reactivation
    elif 7 < days_since_last_activity <= 14:
        risk_score -= 10  # Tier 2 at-risk
    
    # Deduct for: Low app adoption (only 1–2 orders, none via app)
    app_orders = order_history.filter(channel='app').count()
    total_orders = order_history.count()
    if total_orders >= 2 and app_orders == 0:
        risk_score -= 20  # Tier 2 – channel mismatch
    
    # Deduct for: Declining frequency (order rate slowing week-over-week)
    w1_orders = order_history.filter(date >= today() - 14 days, date < today() - 7 days).count()
    w2_orders = order_history.filter(date >= today() - 7 days).count()
    if w1_orders > 0 and w2_orders < w1_orders * 0.8:
        risk_score -= 8  # Tier 3 engagement watch
    
    # Map risk score to tier
    tier = TIER_3  # Default
    if risk_score <= 60:
        tier = TIER_1
    elif risk_score <= 75:
        tier = TIER_2
    
    return {
        'retailer_id': retailer_id,
        'tier': tier,
        'risk_score': risk_score,
        'reason': [list of reasons],
        'recommended_action': [action_type]
    }
```

---

### 1.4 Examples: Daily Priority List Variations

**Example 1: Early Pilot (Day 4 of Batch A)**
```
TIER 1 (5 retailers):
- 3 retailers: No first order yet (account 1–3 days old)
- 2 retailers: First order placed, now dormant 4–5 days

TIER 2 (2 retailers):
- All high-frequency segment (baseline 2+ orders/week)

TIER 3 (1 retailer):
- Relationship check (first batch, want momentum)
```

**Example 2: Mid-Pilot (Day 14, all 3 batches active)**
```
TIER 1 (3 retailers):
- 1 retailer: Batch B, no order yet (Day 10)
- 1 retailer: Batch A, dormant 7 days
- 1 retailer: Batch C, engaged (3 logins) but no order

TIER 2 (3 retailers):
- 2 retailers: All WhatsApp orders (channel conversion)
- 1 retailer: Order frequency declined (pre-pilot 2.5/wk → now 1.2/wk)

TIER 3 (2 retailers):
- Batch C learner segment (engagement maintenance)
```

---

## PART 2: ASSISTED ORDER TARGET PER DAY

### 2.1 Target Definition & Rationale

**Definition:** An "assisted order" = Salesman actively involved in retailer placing an order (either same-visit or same-day phone/video guidance)

**Why This Matters:**
- First order is highest-friction moment in adoption curve
- Salesman presence during first order: 95% converts vs. 60–70% without
- Every assisted order is a "proof point" for salesman credibility ("I successfully helped 5 retailers today")
- Assisted orders are observable, trackable, and create accountability

---

### 2.2 Daily Assisted Order Targets (By Salesman Seniority)

| Salesman Tier | Daily Target | Weekly Target | Monthly Target | Rationale |
|---|---|---|---|---|
| **Tier 1 (Trainer/Lead)** | 2–3 | 12–15 | 48–60 | Design workflow, train others; quality > quantity |
| **Tier 2 (Experienced)** | 3–4 | 15–20 | 60–80 | Core pilot driver; highest utilization |
| **Tier 3 (New/Learning)** | 2–3 | 10–15 | 40–60 | Learning curve; close supervision recommended |
| **On-Call (Ad-hoc)** | 1–2/day | 5–10 | 20–40 | Backup support; flexible based on demand |

**Example Daily Scenario (Experienced Tier-2 Salesman):**

```
ASSISTED ORDER TARGET: 3–4 today

Visit 1: Fresh Mart (Tier 1) – Assisted First Order
  └─ Status: Account 2 days old, no order
  └─ Duration: 45 min (onboarding + walk-through)
  └─ Success: ✅ Placed 1 order (4 items, $68)
  └─ Assisted Order Count: +1

Visit 2: Tony's Corner (Tier 1) – Assisted Reactivation
  └─ Status: Dormant 5 days, previous app user
  └─ Duration: 20 min (quick call + app reorder)
  └─ Success: ✅ Placed 1 order (3 items, $45)
  └─ Assisted Order Count: +2

Visit 3: Prem Store (Tier 1) – Assisted First Order (Phone)
  └─ Status: Account 1 day old, 3 logins, no order
  └─ Method: Phone screen-share (retailer on app, salesman narrating)
  └─ Duration: 25 min
  └─ Success: ✅ Placed 1 order (2 items, $32)
  └─ Assisted Order Count: +3

Visit 4: Valley Traders (Tier 2) – Channel Preference Check-in
  └─ Status: 2 WhatsApp orders, 0 app orders
  └─ Duration: 15 min (soft demo, not pushy)
  └─ Success: ❌ Not ordered today, but agreed to try app next order
  └─ Assisted Order Count: +3 (no increment, but relationship maintained)

DAILY RESULT: 3 assisted orders (target 3–4 met)
TIME INVESTED: 105 min in pilot activities (~2 hours, reasonable for 3–4 visits)
RETAIL STOP EFFICIENCY: 1.5 orders per stop (excellent)
```

---

### 2.3 Assisted Order Types & Variations

**Type 1: Same-Visit Assisted Order (Ideal)**
```
Salesman arrives at retailer store during onboarding or reactivation visit
Retailer logs into app on their phone (or iPad if store has one)
Salesman narrates: "Tap Catalog… Search for Milk… Add 2 cartons…"
Retailer completes checkout themselves (salesman provides gentle guidance)
Order submitted
Salesman celebrates: "You just saved yourself 15 minutes vs. calling WhatsApp!"

Time: 20–40 min per assisted order
Success Rate: 95%+ (salesman present to answer questions)
Confidence for Retailer: High (proven it works)
```

**Type 2: Phone-Guided Assisted Order**
```
Salesman calls retailer who is already on the app
Retailer: "I'm looking at the Catalog but don't know where milk is"
Salesman: "Okay, that's the first step. Tap the search bar at top; type 'milk'…"
Salesman walks through 5–10 min until order placed
No video call needed; voice + app narration sufficient

Time: 15–25 min per assisted order
Success Rate: 80–90% (visual feedback missing, more misunderstandings)
Use When: Retailer too busy for visit, or follow-up to booked appointment
```

**Type 3: Video Screen-Share Assisted Order**
```
Salesman initiates video call (WhatsApp, Google Meet, etc.)
Retailer shows phone screen with app open
Salesman sees what retailer sees, provides real-time guidance
Retailer maintains control (taps buttons), salesman advises

Time: 20–30 min per assisted order
Success Rate: 90%+
Use When: Retailer nervous or app issue suspected
```

**Type 4: Assisted Order with App Troubleshooting**
```
Retailer: "Your app keeps crashing when I try to search"
Salesman: "Let's debug; click Home → Settings → Clear Cache… Now retry"
If issue persists: "Try WhatsApp for today; I'll file a tech ticket and call you tonight"
(Not a full assisted order, but prevents dropped retailer)

Time: 10–20 min per assisted order
Success Rate: Varies (50–80% depending on issue)
Backup Value: High (retailer doesn't churn, trusts support)
```

---

### 2.4 Assisted Order Tracking Dashboard

**Real-Time Tracking (for Salesman Accountability):**

```
╔═════════════════════════════════════════════════════════════╗
║           ASSISTED ORDERS – TODAY'S PROGRESS                ║
║                                                             ║
║  Salesman: Marco Liu                                        ║
║  Date: [Date]                                               ║
║  Target: 3–4 orders                                         ║
╠═════════════════════════════════════════════════════════════╣
║                                                             ║
║  Completed Today: 🟢 3 / 4 target                           ║
║                                                             ║
║  ✅ Fresh Mart – First Order (1:15 PM)                      ║
║     • Order ID: ORD-2026-051342                             ║
║     • Items: 4 | Value: $68.50                              ║
║     • Channel: APP                                          ║
║     • Time Invested: 45 min                                 ║
║                                                             ║
║  ✅ Tony's Corner – Reactivation (2:40 PM)                  ║
║     • Order ID: ORD-2026-051343                             ║
║     • Items: 3 | Value: $45.00                              ║
║     • Channel: APP                                          ║
║     • Time Invested: 20 min                                 ║
║                                                             ║
║  ✅ Prem Store – First Order via Phone (3:20 PM)            ║
║     • Order ID: ORD-2026-051344                             ║
║     • Items: 2 | Value: $31.80                              ║
║     • Channel: APP (phone-guided)                           ║
║     • Time Invested: 25 min                                 ║
║                                                             ║
║  ⏳ Valley Traders – Check-in (4:00 PM)                     ║
║     • No order today (Tier 2, lower priority)               ║
║     • Relationship: ✅ Maintained                           ║
║     • Next Action: "Try app for next order"                 ║
║     • Time Invested: 15 min                                 ║
║                                                             ║
║  WEEKLY TALLY:                                              ║
║  Mon: 3 | Tue: 4 | Wed: 3 | Thu: — | Fri: —                ║
║  Week Total: 10 / 15 target (67%)                           ║
║                                                             ║
║  💰 Revenue from Assisted Orders (Today):                   ║
║  $145.30 in orders from 3 retailers                         ║
║                                                             ║
╚═════════════════════════════════════════════════════════════╝
```

---

## PART 3: INCENTIVE SUGGESTION LOGIC

### 3.1 Incentive Philosophy

**Goal:** Align salesman personal success with pilot success (adoption % + order velocity)

**Principle:** Incentive should **reward behaviors we want**, not just output we measure

```
❌ DON'T INCENTIVIZE:        ✅ DO INCENTIVIZE:
└─ # of visits                └─ Assisted orders (quality engagement)
└─ # of retailers talked to   └─ First-order conversions (friction removal)
└─ App downloads              └─ Weekly active retention (stickiness)
└─ Orders placed              └─ App channel adoption % (platform shift)
                              └─ Customer satisfaction (support quality)
```

---

### 3.2 Recommended Incentive Structure

### **Primary Incentive: "Assisted Order Bonus"**

```
Tier-2 Experienced Salesman (Example):
  Base Monthly Salary: $1,500
  Target: 60 assisted orders / month
  
  Bonus Structure:
  ├─ 50–59 assisted orders: 0% bonus (below target)
  ├─ 60–69 assisted orders: $300 bonus (on-target range)
  ├─ 70–79 assisted orders: $500 bonus (above-target)
  ├─ 80+ assisted orders:   $750 bonus (excellence)
  
  Example Scenario:
  └─ Salesman executes 72 assisted orders in month
  └─ Bonus: $500 (above-target)
  └─ Monthly Total: $1,500 + $500 = $2,000 (133% of base)
```

**Rationale:**
- Assisted orders are observable + verifiable (order data confirms salesman involvement)
- High barrier to gaming (can't claim assist without retailer placing order via app during salesman visit)
- Aligns with pilot KPIs (first-order conversion + app adoption)

---

### **Secondary Incentive: "Adoption Health Bonus"**

```
Monthly Bonus tied to KPI Targets (Portfolio of assigned retailers):

For salesman's assigned cohort, track:
1. First Order Rate: Target ≥90% (bonus +$50/month if met)
2. Weekly Active Rate: Target ≥70% (bonus +$50/month if met)
3. App Channel %: Target ≥70% (bonus +$50/month if met)

Example Scenario:
└─ Salesman's portfolio: 15 assigned retailers
└─ Metric 1 (First Orders): 14/15 = 93% ✅ → +$50
└─ Metric 2 (Weekly Active): 10/15 = 67% ❌ → +$0
└─ Metric 3 (App Channel): 11/15 orders via app = 73% ✅ → +$50
└─ Adoption Health Bonus: $100/month
```

**Rationale:**
- Incentivizes long-term retailer health, not just one-time conversions
- Encourages follow-up support, repeat engagement
- Aligns with retention KPIs (not just first order)

---

### **Tertiary Incentive: "Excellence Tier" (Top Performer Recognition)**

```
Top 3 salesmen by assisted orders each month:
1st Place:  $200 bonus + public recognition in team meeting
2nd Place:  $100 bonus + public recognition
3rd Place:  $50 bonus

+ Quarterly trip or gift card ($500) for salesman with highest retail satisfaction score
```

**Rationale:**
- Creates aspiration + healthy peer competition
- Recognition motivates beyond money
- Sustainability focus (satisfaction-based, not just transactional)

---

### 3.3 Incentive Pacing & Communication

**Announcement Timing:**
- Week 0 (before pilot starts): Full incentive structure explained + training
- Week 1–2: Daily progress dashboards showing "assisted orders YTD" + pace to target
- Mid-Month (Week 2): Interim bonus projection ("If you maintain pace, you'll earn $400 bonus")
- End-of-Month: Actual bonus calculated + paid out with paycheck

**Weekly Standup Communication:**

```
WEEKLY INCENTIVE CHECK-IN (Friday 2 PM)

"Okay team, let's talk money. Here's where everyone stands:

ASSISTED ORDERS (Weekly Target: 12–15):
  Marco Liu:     14 ✅ (on track for $500+ monthly)
  Sarah Chen:    10 ⚠️  (pace suggests $300 bonus at month-end)
  Ahmed Hassan:   8 🔴 (needs 2 more this week to hit target pace)
  Janet Williams: 11 ✅ (solid pace)

TOP OPPORTUNITY:
  → Marco is at 14. If he maintains 14/week, monthly bonus will be $500–750.
  → Ahmed, let's talk strategy. You're at 8/week; need 15 next week?
     What's blocking? App issues? Retailer feedback? Tech support? Let's solve it.

HAPPY NEWS:
  Sarah & Janet: Your assigned cohorts show 75% app adoption (above 70% target).
  That's $50 'Adoption Health Bonus' locked in for you both. Great work.
"
```

---

### 3.4 Edge Cases & Safeguards

**Scenario 1: Salesman "Forces" Assisted Order (Gaming the System)**

```
Red Flag: Retailer calls support: "Marco kept pushing me to order via app
         even though I was fine with WhatsApp. Felt like pressure."

Investigation:
1. Review retailer satisfaction score (post-visit survey)
2. Review order details (was it a real order or did it get cancelled?)
3. Review: Was this first order or repeat? (first order = good, repeat = pressure)

Action:
└─ If confirmed pressure tactic: Remove that order from assisted-order count
└─ Coaching: "We want adoption, not coercion. Focus on helping, not hitting targets."
└─ Escalate: If pattern repeats, remove salesman from pilot
```

---

**Scenario 2: Technical Issue Blocks Salesman from Hitting Target**

```
Salesman: "The app went down for 3 hours yesterday. I had 4 retailers ready
          to place orders; had to defer to WhatsApp. Lost 4 assisted orders."

Response:
1. Verify: Check app uptime logs; confirm 3-hour outage
2. Action: Add 2–3 bonus assisted orders to salesman's count (adjust for tech failure)
3. Prevention: Improve app reliability; add WhatsApp fallback workflow
```

---

**Scenario 3: Salesman Complains: "My Retailers Are Harder Than Others"**

```
Salesman: "Marco has 14 assisted orders; I have 8. But my retailers are
          all Tier-3 learners who need hand-holding. His are Tier-1 fast-track."

Analysis:
1. Compare actual difficulty (readiness score of assigned portfolios)
2. If true disparity: Adjust targets by portfolio composition
   └─ Tier-1 Heavy: 60 assisted orders/month
   └─ Mixed Tier 1–2: 70 assisted orders/month
   └─ Tier-2/3 Heavy: 80 assisted orders/month
3. Redistribute portfolios for equity if pattern observed
```

---

## PART 4: RESISTANCE HANDLING SCENARIOS

### 4.1 Resistance Types & Frequency

```
Top 10 Objections Salesmen Encounter:

1. "I prefer WhatsApp; it's what I know"              [35% of conversations]
2. "The app doesn't have this thing I need"           [20%]
3. "I don't have time to learn new things"            [18%]
4. "Payment on WhatsApp is faster / easier"           [15%]
5. "Your support on WhatsApp is better"               [12%]
6. "I'm worried about [security issue]"               [10%]
7. "Other suppliers have better prices"               [8%]
8. "The app crashes / is too slow"                    [8%]
9. "I need bulk ordering; app can't do it"            [7%]
10. "Let me try it later when I have time"            [6%]
```

---

### 4.2 Resistance Handling Scripts (By Scenario)

#### **Resistance #1: "I Prefer WhatsApp; It's What I Know"**

**Salesman Mindset:**
- This is natural. Familiar is comfortable. Don't fight it; acknowledge it.
- Transform into: "App is familiar once you use it 2x. Let me prove it to you."

**Script:**

```
RETAILER: "Look, I've been ordering via WhatsApp for 2 years. It works for me."

SALESMAN: "I totally get that. WhatsApp is comfortable. Here's the thing though—
         the app actually takes LESS time than WhatsApp, and here's why:
         
         WhatsApp: You type what you want → rep texts back confirmation → 
                   you confirm → they confirm → takes 10–15 minutes
         
         App: You click 5 items → tap Checkout → Submit → 2 minutes. Done.
         
         You save 10 minutes every order. If you order 2x a week, that's 1.5 
         hours per month just from time savings.
         
         Here's my ask: Try the app once. Just once. If you hate it, I'll 
         personally process your WhatsApp orders forever. But I bet you'll 
         prefer the app once you see it. Deal?"

[If still resistant]

SALESMAN: "Look, here's what I can do. I'll stay right here and walk you 
         through your first app order. Takes 5 minutes, I promise. And I'll 
         save you 15 minutes by doing it right now vs. WhatsApp back-and-forth."
```

---

#### **Resistance #2: "The App Doesn't Have This Feature I Need"**

**Salesman Mindset:**
- Legitimate concern. Don't dismiss it. Dig into: What feature? Why critical?
- Might be: App does have it but retailer hasn't found it yet (explore together)
- Might be: App truly missing it (acknowledge, escalate, provide workaround)

**Script:**

```
RETAILER: "I need to order partial cases, like 5 units of milk instead of 
          2 full cases. Your app won't let me do that."

SALESMAN: "Okay, that's a great question. Let me check... 
          [Opens app on phone]
          
          Actually, you can! Here's how:
          1. Tap Milk item
          2. You see 'Case Qty' field with 2 to start
          3. First time only: there's a 'Units' tab. Tap that.
          4. Now you can order 5 individual units instead of 2 full cases.
          [Shows on phone]
          
          See? You CAN do it. Try placing that order right now using units."

[If feature truly doesn't exist]

SALESMAN: "That's a real limitation right now, and I hear you. Here's what 
         we can do:
         
         Option A: Text me exactly what you want, and I'll modify it in the 
                   system for you. Takes me 1 minute. Workaround for now.
         
         Option B: Order in cases for now, and I'll log this request with 
                   engineering. We're adding unit-level ordering in Week 3—
                   you'll get it then.
         
         Which works better while we build it?"
```

---

#### **Resistance #3: "I Don't Have Time to Learn New Things"**

**Salesman Mindset:**
- This is fear masked as busyness. Reframe: Learning takes 5 minutes, saves 20 min/week.
- Position YOU (salesman) as learning buddy, not burden

**Script:**

```
RETAILER: "I'm too busy. I run a store, not a tech company. Can't spend 
          time figuring out apps."

SALESMAN: "I hear you. You're busy—I get it. But here's the thing: This 
         doesn't take time. It saves time.
         
         Right now, you spend 10–15 minutes ordering via WhatsApp.
         With the app, it's 2–3 minutes. That's 12 minutes back per order.
         
         If you order twice a week, that's 2 hours per month you get back.
         
         But I get it—learning new things feels like work. So here's my 
         offer: I'm going to walk you through placing ONE order right now. 
         It'll take 5 minutes. You'll see it's actually simpler than WhatsApp. 
         And then from now on, it's just faster for you. No learning curve.
         
         Sound fair? Let's do it right now while I'm here."
```

---

#### **Resistance #4: "Your App Payment is More Complicated Than WhatsApp"**

**Salesman Mindset:**
- Dig deeper: Is app payment actually complicated, or is WhatsApp "frictionless" (they saved their card)?
- Reframe: App security is actually better; explain briefly

**Script:**

```
RETAILER: "On WhatsApp I just message what I want, they send an invoice, 
          I pay. Simple. Your app has all these screens."

SALESMAN: "I see what you mean. Here's what's happening: Your rep on 
         WhatsApp already has your payment details saved, so they just send 
         you the invoice and you pay—feels seamless.
         
         On the app, it looks like more steps because we're being transparent 
         about what you're buying and why it costs what it does. But it's 
         actually just as fast.
         
         Here's what we did: First time you order on the app, you enter your 
         card or payment details. But then—just like WhatsApp—we save it. 
         So from Order #2 onward, it's one-tap checkout. Actually faster.
         
         Let's do your first order together right now, and I'll show you."
```

---

#### **Resistance #5: "Your Support on WhatsApp is Better Than Email/App Support"**

**Salesman Mindset:**
- Valid concern. Acknowledge the WhatsApp rep IS responsive.
- Reframe: App support is just as responsive, plus you have options

**Script:**

```
RETAILER: "When I message my WhatsApp rep, they respond in 2 minutes. 
          I don't trust that your app support will be that fast."

SALESMAN: "You know what, you're right. Your rep on WhatsApp IS super 
         responsive, and that's great. Here's the good news though:
         
         You're not losing that. Your rep is STILL responsive on WhatsApp.
         
         But we've also added in-app support. If you have a question while 
         ordering on the app, you can:
         1. Tap the Help icon
         2. Send a message directly
         3. Your rep responds in the app (same 2-minute SLA)
         
         So you get both: Your familiar WhatsApp rep on WhatsApp + 
         In-app help while you're ordering. Best of both worlds.
         
         The app doesn't take away your WhatsApp support; it adds to it."
```

---

#### **Resistance #6: "I'm Worried About Security / Payment Fraud"**

**Salesman Mindset:**
- Legitimate security concern. Take it seriously. Don't dismiss.
- Have answers prepared (PCI compliance, encryption, etc.)
- If unsure, connect to security team; don't make up answers

**Script:**

```
RETAILER: "I hear horror stories about app hacks and stolen payment info. 
          Why should I trust your app with my card?"

SALESMAN: "That's a really smart question. Security matters, and I want to 
         be honest with you. Here's what we did:
         
         1. Our app is PCI-DSS compliant (that's the payment industry 
            security standard—same as banks use).
         2. Your payment info is encrypted on our servers.
         3. We have a fraud protection team monitoring for suspicious activity.
         4. If fraud DOES happen (unlikely, but theoretically), we're insured 
            and you're protected.
         
         In fact, the app is MORE secure than WhatsApp because your card 
         info isn't sitting in a chat thread.
         
         But here's the real thing: Your rep on WhatsApp also has your 
         payment details (they had to get them somehow to process WhatsApp 
         orders, right?). Our app has the same info, just encrypted. 
         
         Do you trust your rep?"

[If yes]

SALESMAN: "Great. Then you can trust the app, because we have the same trust 
         + encryption on top."
```

---

#### **Resistance #7: "Let Me Try It Later When I Have Time"**

**Salesman Mindset:**
- "Later" rarely comes. They're busy. This is a blocking objection that kills adoption.
- Strategy: Create urgency + remove friction by doing it NOW together

**Script:**

```
RETAILER: "Yeah, I'll try the app sometime next week when I'm less busy."

SALESMAN: "I love that you want to try it. Here's my concern though: 
         You're going to be just as busy next week. Life doesn't slow down, 
         right?
         
         Here's what I suggest: Let's use the 5 minutes I'm here RIGHT NOW 
         to do it together. I'll walk you through, and then you'll know 
         it's easy. Next time you need to order, you'll just do it yourself 
         because you know it works.
         
         If we don't do it today, I promise you're not going to do it next 
         week when: You're managing the store, dealing with customers, 
         handling inventory...
         
         But RIGHT NOW, you have me, and it takes 5 minutes. Let's do it 
         now so you don't have to think about it later."

[If still resists]

SALESMAN: "Tell you what: I'm coming back to the area Wednesday at 3 PM. 
         If you haven't tried it by then, I'll pop in and we'll do it together 
         in real quick. That way, by Friday, you'll be an app user. Deal?"
```

---

### 4.3 Resistance Escalation Protocol

**When Salesman Can't Close (After 2 Attempts):**

```
Scenario: Retail has been objecting for 15 minutes. Salesman has tried 
         primary script + one pivot. Not converting.

Salesman Action:
1. Stop trying to convince (creates frustration)
2. Say: "I can tell this isn't the right time. Let me be honest—I think 
         you'd love this once you tried it, but I don't want to push. 
         Here's what I'll do..."
3. Call Support Manager (LIVE, in front of retailer—builds confidence)
4. Support Manager explains via phone: "Hi [Retailer], I hear you're 
   concerned about [specific objection]. Let me address that..."
5. If Support Manager can't close: Escalate to Pilot PM for 1:1 outreach
```

**Escalation Triggers:**

| Scenario | Escalate To | SLA | Action |
|---|---|---|---|
| Retailer doubts app security | Tech Lead | Same-day | Arrange tech security call |
| Retailer needs bulk-order feature | Product Manager | 24h | Demo feature roadmap |
| Retailer complains app crashes | Engineering | Immediately | Debug + provide workaround |
| Retailer refuses to engage | Pilot PM | 12h | Decision: Force adoption vs. accept churn |

---

## PART 5: DAILY REPORTING FORMAT

### 5.1 End-of-Day Salesman Report

**Timing:** 6 PM daily (not later than 7 PM)

**Format:** Mobile form (5-minute fill-out)

```
═══════════════════════════════════════════════════════════════
DAILY PILOT REPORT – [Salesman Name]
Date: [Date]
═══════════════════════════════════════════════════════════════

SECTION 1: ASSISTED ORDERS
─────────────────────────────────────────────────────────────

Q1: How many assisted orders did you complete today?
(Answer: Number)
→ 3

Q2: List each assisted order:

Order 1:
  Retailer: Fresh Mart (rtl-042)
  Retailer Contact: [Name]
  Items Ordered: 4
  Order Value: $68.50
  Channel: App (same-visit guidance)
  Time Invested: 45 min
  Outcome: ✅ Successful (order placed)

Order 2:
  Retailer: Tony's Corner (rtl-015)
  ...

Order 3:
  Retailer: Prem Store (rtl-028)
  ...

─────────────────────────────────────────────────────────────

SECTION 2: RETAILER VISITS & ENGAGEMENT
─────────────────────────────────────────────────────────────

Q3: How many retailer visits/calls did you make today (total)?
→ 4 visits + 1 phone call = 5 total touches

Q4: Which retailers did you visit/contact (including non-assisted-order visits)?

Visit 1: Fresh Mart (Assisted Order)
Visit 2: Tony's Corner (Assisted Order)
Visit 3: Prem Store (Assisted Order)
Visit 4: Valley Traders (Channel advice, no assist)
Call 1: [Follow-up with previous retailer]

─────────────────────────────────────────────────────────────

SECTION 3: OBJECTIONS & RESISTANCE OBSERVED
─────────────────────────────────────────────────────────────

Q5: What were the top objections you heard today?
(Select all that apply; rank top 3)

[Checkbox List]:
☑ "I prefer WhatsApp, it's familiar"              [Rank: 1]
☑ "App payment process too complicated"           [Rank: 2]
☐ "I'm worried about security"
☐ "I don't have time to learn"
☐ "Other suppliers have better prices"
☐ "Support not responsive enough"
☐ "App features missing [specify: ___]"
☐ Other: [text field]                             [Rank: 3]
       → "Wants bulk ordering, not available yet"

─────────────────────────────────────────────────────────────

SECTION 4: WHAT WORKED TODAY
─────────────────────────────────────────────────────────────

Q6: What's one thing that REALLY WORKED in converting a retailer today?

"When I showed Fresh Mart that app takes 2 min vs. WhatsApp 15 min 
and calculated their time savings (1.5 hours/month), they got it. 
Impact was: clear ROI."

[Other salesmen will read this; learn from each other]

─────────────────────────────────────────────────────────────

SECTION 5: BLOCKERS & SUPPORT NEEDED
─────────────────────────────────────────────────────────────

Q7: Did you encounter any blockers today? (Technical issues, policy questions, etc.)

☐ No blockers
☑ Yes, describe: "Payment button broken for one retailer when they 
                 tried to pay via Samsung Pay. App defaulted to 'Card' 
                 only. Escalated to tech support."

Q8: Do you need support from anyone for tomorrow?

☐ No
☑ Yes:
  → Tech Support: Follow-up on Samsung Pay issue (for Valley Traders follow-up)
  → Sales Manager: Clarify: Can we offer discount codes to drive first order?

─────────────────────────────────────────────────────────────

SECTION 6: FEEDBACK & COACHING NEEDS
─────────────────────────────────────────────────────────────

Q9: Any feedback on today's priority list?

"Priority list was accurate. All Tier-1 retailers were ready to convert. 
However, travel time between retailers was long—consider geographic 
clustering when assigning tomorrow's list?"

Q10: Any coaching needs or questions for tomorrow?

"I want to improve my objection handling on 'no time to learn' objection. 
Can we do 10-min coaching call tonight?"

═══════════════════════════════════════════════════════════════
SECTION 7: AUTO-SUMMARY (System-Generated)
═══════════════════════════════════════════════════════════════

Assisted Orders: 3 (Target 3–4: ✅ On Track)
Retail Touches: 5 (Conversion Rate: 60%)
Objections Heard: 3 types
Time Invested: 130 min (2.2 hours in pilot activities)
Blockers: 1 (escalated)
Daily Efficiency: 1.7 assisted orders per visit


═══════════════════════════════════════════════════════════════
```

---

### 5.2 Weekly Aggregate Report (For Sales Manager)

**Timing:** Friday 5 PM (summary of Mon–Fri)

```
WEEKLY PILOT REPORT – [Week #]
Team: [Sales Manager Name]
Period: [Mon Date]–[Fri Date]

═══════════════════════════════════════════════════════════════

TEAM PERFORMANCE SUMMARY
─────────────────────────────────────────────────────────────

Salesman Name      | Mon | Tue | Wed | Thu | Fri | Weekly | Target | % Target |
─────────────────────────────────────────────────────────────────────────────
Marco Liu          |  3  |  4  |  3  |  3  |  2  |   15   |   15   | ✅ 100% |
Sarah Chen         |  2  |  2  |  3  |  2  |  1  |   10   |   15   | 🟡 67%  |
Ahmed Hassan       |  1  |  2  |  2  |  1  |  2  |    8   |   15   | 🔴 53%  |
Janet Williams     |  3  |  3  |  2  |  3  |  3  |   14   |   15   | ✅ 93%  |
─────────────────────────────────────────────────────────────────────────────
TEAM TOTAL         |  9  | 11  | 10  |  9  |  8  |   47   |   60   | 🟡 78%  |

─────────────────────────────────────────────────────────────

TEAM STATS
  • Total Assisted Orders: 47 (vs. 60 target, 78% progress)
  • Retail Touches: ~235 (4–5 per salesman per day)
  • First-Order Conversion Rate: 82% (excellent)
  • App Channel Adoption: 79% (on target for 80%)
  • Top Performer: Marco Liu (15 / 15, +$500 bonus track)
  • Needs Support: Ahmed Hassan (8 / 15, only 53% pace)

─────────────────────────────────────────────────────────────

TOP OBJECTIONS HEARD THIS WEEK (Ranked)
  1. "I prefer WhatsApp; it's familiar"              [~25 mentions]
  2. "The app doesn't have [feature]"                [~12 mentions]
  3. "I don't have time to learn"                    [~8 mentions]
  4. "Payment process too complicated"               [~5 mentions]
  5. [Others < 5 mentions]

→ ACTION: Prepare "WhatsApp vs. App Speed Demo" for next week's training

─────────────────────────────────────────────────────────────

WHAT WORKED (Best Practices This Week)
  ✅ Marco's Approach: "I'll time you—app is faster than WhatsApp. Bet $1?"
     Result: 80% of retailers tried the app when gamified
  
  ✅ Janet's Approach: "I'm here 5 minutes. Let's do your first order together."
     Result: Removed "no time" objection by creating urgency
  
  ✅ Sarah's Phone-Guided Orders: Successful 3x this week (12 min avg per order)
     Result: Improved conversion for busy retailers who couldn't host in-store visit

─────────────────────────────────────────────────────────────

BLOCKERS & ESCALATIONS
  • Samsung Pay integration not working (1 retail, escalated to tech support)
  • Ahmed Hassan: Low confidence on objection handling (coaching scheduled)
  • Payment discount codes not approved yet (awaiting sales manager decision)

─────────────────────────────────────────────────────────────

NEXT WEEK FOCUS
  Week 3 Priorities:
  1. Ahmed: Intensive coaching (target 15 assisted orders, stretch to catch up)
  2. Tech: Fix Samsung Pay, add unit-level ordering
  3. Team: Objection handling drill on "WhatsApp preference" (role-play Fri standup)
  4. Pilot PM: Decision needed on discount code approval by Mon
```

---

## PART 6: FEEDBACK CAPTURE TEMPLATE

### 6.1 Post-Visit Retailer Feedback Form

**Timing:** Sent via SMS/WhatsApp immediately after salesman visit (or next morning)

**Format:** 2-minute mobile form (4–5 questions max)

```
═══════════════════════════════════════════════════════════════

Hi [Retailer Name]! 👋

Thanks for spending time with [Salesman Name] today. 
Quick 2-min feedback would help us improve. 

[FORM]

─────────────────────────────────────────────────────────────

Q1: How helpful was [Salesman Name]'s visit today?

(Star Rating: 1–5)
⭐⭐⭐⭐⭐ Extremely helpful (5)
⭐⭐⭐⭐ Very helpful (4)
⭐⭐⭐ Somewhat helpful (3)
⭐⭐ Not very helpful (2)
⭐ Not helpful at all (1)

→ [Retailer selects: ⭐⭐⭐⭐⭐]

─────────────────────────────────────────────────────────────

Q2: How confident do you feel using the app now?

(1–10 scale)
🔴 Not confident at all (1) ←→ 🟢 Very confident (10)

→ [Retailer selects: 8]

─────────────────────────────────────────────────────────────

Q3: What's ONE thing [Salesman Name] did well today?

[Text response]
→ "He showed me it was faster than WhatsApp by timing me. Made sense."

─────────────────────────────────────────────────────────────

Q4: What's ONE thing we could improve?

[Text response]
→ "The app should show estimated delivery date at checkout, not after."

─────────────────────────────────────────────────────────────

Q5: Will you place your next order via the app?

☑ Yes, definitely
☐ Maybe (not sure)
☐ Probably not (I'll stick with WhatsApp)

→ [Retailer selects: Yes, definitely]

═══════════════════════════════════════════════════════════════

Thanks! Your feedback helps us.

[Send button]
```

**Data Captured → Used For:**
1. **Salesman Coaching:** Aggregate feedback by salesman; share at weekly standup
2. **Product Feedback:** Themes (e.g., "show delivery date at checkout") escalated to product manager
3. **Retailer Sentiment:** Track confidence scores week-over-week (should increase as they use app)

---

### 6.2 Salesman Feedback for Manager (Weekly Coaching)

**Timing:** Friday 4 PM (pulled from daily reports + post-visit surveys)

```
COACHING SUMMARY – [Salesman Name]
Week: [Week #]

─────────────────────────────────────────────────────────────

PERFORMANCE HIGHLIGHTS ✅
  • Assisted Orders: 15 / 15 (100% of target)
  • Conversion Rate: 93% of retailers ordered after visit
  • Retailer Confidence (avg): 8.2 / 10 (+0.3 from last week)
  • Retailer Satisfaction: "Extremely helpful" 80% of visits

─────────────────────────────────────────────────────────────

WHAT'S WORKING (Strengths to Leverage)
  • Gamification Approach: "Bet $1 on app speed vs. WhatsApp" → 80% converts
  • Objection Response: WhatsApp preference → Time-savings ROI → Converts
  • Phone-Guided Orders: Successfully closed 3 retailers via phone this week
  • Relationship: Retailers asking for you by name (build on this!)

ACTION: Have you considered mentoring Ahmed Hassan on these techniques?

─────────────────────────────────────────────────────────────

GROWTH OPPORTUNITIES / Coaching Needs
  • One retailer feedback: "Moved too fast, didn't explain payment security"
    → Coaching: Add 1-min security explanation in visit #1
  
  • Your note: "Want to improve on bulk-ordering objection"
    → Action: Prepare 2-slide deck on bulk-order feature roadmap for Monday

─────────────────────────────────────────────────────────────

RETAILER FEEDBACK THEMES (From Post-Visit Surveys)
  • Highly praised: Your ability to relate / "felt like you were helping, not selling"
  • One request: "Wished he had shown me how to cancel or modify orders"
    → Suggestion: Add "Order Management" demo to your visit script

─────────────────────────────────────────────────────────────

NEXT WEEK STRETCH GOAL
  • Weekly Target: 15 assisted orders (you're hitting it)
  • Stretch: Can you close 1–2 "heavy legacy channel" retailers (all-WhatsApp)?
    → If yes: +$100 bonus + recognized at team standup
  • Mentoring: Co-visit with Ahmed Hassan on Wednesday?
    → Coaching + team building

─────────────────────────────────────────────────────────────
```

---

### 6.3 Weekly Team Retrospective Meeting (Friday 2 PM)

**Attendees:** All salesmen, Sales Manager, Pilot PM

**Format:** 60-minute standup

**Agenda:**

```
WEEKLY RETROSPECTIVE – [Week #]

1. WINS & CELEBRATIONS (10 min)
   ─────────────────────────────────────────
   "These salesmen crushed their assisted-order targets this week:
   
   🏆 Marco Liu: 15/15 (100%) – Bonus track $500+
       Highlight: Gamification approach ('speed bet') resonates
   
   🏆 Janet Williams: 14/15 (93%) – Strong pace
       Highlight: 'No time' objection handled beautifully
   
   Recognition: Team at 78% of target (47 assisted orders). 
   On pace to hit 190+ for full pilot month. Great progress!"

─────────────────────────────────────────────────────────────

2. OBJECTION PATTERNS (15 min)
   ─────────────────────────────────────────
   "Top 3 objections this week:
   
   1. 'I prefer WhatsApp' (25 mentions)
      → Current win rate: 65% (convert to app first order)
      → Gap: 35% still hesitant
      → Action: We need a better script. Marco's gamification works.
                Next week: Let's do role-play on Monday.
   
   2. 'App doesn't have [feature]' (12 mentions)
      → Most common: Bulk ordering, unit-level orders, estimated delivery
      → Action: Product manager is adding delivery estimate by Wed.
                Bulk ordering is in backlog (Week 3).
                Unit-level: Can do NOW as manual workaround.
   
   3. 'I don't have time' (8 mentions)
      → Win rate: 85% (urgency + 'I'm here now' works)
      → Janet's approach is best practice here"

─────────────────────────────────────────────────────────────

3. COACHING CONVERSATIONS (15 min)
   ─────────────────────────────────────────
   Sales Manager: "Ahmed, let's talk. You're at 8/15 pace (53%). 
                 What's happening?"
   
   Ahmed: "I'm hitting some hard retailers who don't want to engage. 
          I feel like my objection handling isn't working."
   
   Sales Manager: "Okay, here's what we'll do:
                  1. Monday 9 AM: 10-min coaching call
                  2. Tuesday: You co-visit with Marco to learn his approach
                  3. Rest of week: Apply new techniques
                  Target by Friday: 3-4 assisted orders
                  
                  Sound good?"
   
   [Repeat for any other salesmen needing support]

─────────────────────────────────────────────────────────────

4. TECH BLOCKERS & ESCALATIONS (10 min)
   ─────────────────────────────────────────
   "Blockers reported this week:
   
   1. Samsung Pay integration broken (1 retailer)
      → Status: Engineering prioritizing, fix by Wed
      → Workaround: Default to card entry (has been communicated)
   
   2. Bulk ordering not available yet
      → Retailer complaint count: 2
      → Feature ETA: Week 3
      → Workaround: Order in cases; we'll adjust invoice if needed
   
   3. Unit-level ordering (5 units vs. 2 cases)
      → Can do NOW: Manual order entry by support
      → Better UX coming Week 3"

─────────────────────────────────────────────────────────────

5. BEST PRACTICES TO REPLICATE (10 min)
   ─────────────────────────────────────────
   "Three best practices observed:
   
   ✅ Marco's 'Speed Bet' Gamification
      Script: 'I'll time you. App vs. WhatsApp. Loser buys coffee.' 
      Result: 80% retailers try the app
      → All salesmen: Practice this next week
   
   ✅ Janet's 'I'm Here Now' Urgency
      Script: 'I have 5 minutes right now. Let's do it together. 
              You won't do it later when you're busy.'
      Result: Breaks procrastination objection 85% of time
      → All salesmen: Add to your visit opening
   
   ✅ Phone-Guided Orders (Sarah's technique)
      Method: Call + screen-share while retailer on app
      Result: 80% conversion rate for busy retailers
      → All salesmen: Practice this for Tuesday/Wed follow-ups"

─────────────────────────────────────────────────────────────

6. MONDAY TRAINING (10 min)
   ─────────────────────────────────────────
   "Monday 8 AM (before we hit the field):
   
   1. Role-play: 'I prefer WhatsApp' objection
      → Marco demonstrates speed-bet approach
      → Everyone gets 2 reps to practice
   
   2. Demo: Unit-level ordering workaround
      → Support team shows how to request this via app
   
   3. Update: Samsung Pay fix coming by Wed
      → Use card entry in meantime
   
   4. Coaching: Ahmed + Marco co-visit
      → Ahmed observes Marco's approach Tuesday
   
   Attendance: Required"

─────────────────────────────────────────────────────────────

7. NEXT WEEK TARGETS & STRETCH GOALS (5 min)
   ─────────────────────────────────────────
   "Week 3 Targets:
   
   Team Assisted Orders: 60+ (we need to hit pace)
     → Last week: 47 (78% progress)
     → This week: Aim for 60+ to build momentum
   
   Individual Targets:
     Marco: 15–18 (maintain + mentor Ahmed)
     Janet: 14–16
     Sarah: 12–15 (improve from 10)
     Ahmed: 12–15 (coaching week; stretch but achievable)
   
   Stretch Goals (bonus-eligible):
     - Convert 1 'all-WhatsApp' retailer to app-first order (+$100 each)
     - Retailer satisfaction 9+/10 from post-visit survey (+$50 each)
     - Zero blockers / escalations if possible"

═══════════════════════════════════════════════════════════════
```

---

**DOCUMENT VERSION:** 1.0  
**EFFECTIVE DATE:** [Pilot Week 0]  
**LAST UPDATED:** [Current Date]
