# Pilot Adoption Monitoring: Operations & Support Runbook

## Overview

This guide is for the **Pilot PM**, **Support Manager**, and **Onboarding Reps** who will use the dashboard daily and respond to alerts. It covers dashboard interpretation, alert response workflows, and escalation procedures.

---

## PART 1: DASHBOARD INTERPRETATION GUIDE

### 1.1 The Three-Second Rule

**Your Daily Dashboard Check (9 AM UTC):**

When you log in each morning, look at these three KPIs FIRST:

1. **Onboarding Progress** → Are we on track to onboard 35 retailers by Week 4?
2. **Weekly Active** → Did we retain momentum from last week? (Should be stable or growing)
3. **First Orders** → Has conversion slowed down? (Should be 80%+ overall)

**Decision Rule:**
- 🟢 All three green? → Continue current support level, monitor weekly trends
- 🟡 One yellow? → Investigate why; consider targeted support
- 🔴 Any red? → Emergency standup within 2 hours

---

### 1.2 Reading Each Dashboard Card

#### Card 1: Onboarding Progress

**Visual:** Bar chart showing Week 1, Week 2, Week 3, Week 4 (in-progress)

```
Week 1: ████████ 8/8 ✅ Batch A complete
Week 2: ██████████████████ 20/20 ✅ Batches A + B complete  
Week 3: ████ 4/8 ⏳ In progress (4 retailers still onboarding)
Week 4: — (not started)
```

**What It Means:**
- ✅ = Week complete; all assigned retailers onboarded
- ⏳ = Week in progress; expect completion within 3–5 days
- ⚠️ = Behind schedule; investigate if new retailers need additional support

**Action Trigger:**
- If Week 3 not complete by Friday, contact Batch C retailers individually
- If any week drops below 50% by mid-week, escalate blockers to PM

---

#### Card 2: Weekly Active Retailers

**Visual:** Gauge + Sparkline (last 4 weeks)

```
Current: 18 / 28 (64%)
Target: 70% (🟢 GREEN healthy | 🟡 YELLOW declining | 🔴 RED emergency)

Sparkline: 24 → 22 → 20 → 18  [declining trend ⚠️]
```

**What It Means:**
- **Gauge:** % of onboarded retailers who placed ≥1 order THIS WEEK
- **Sparkline:** Retention trend (should be stable or growing)
- **Declining Trend:** Means some retailers who ordered last week didn't order this week = early churn signal

**Action Trigger (Priority Order):**
1. If gauge drops 5+ points week-over-week → Review "Dormant Retailers" list; send check-ins
2. If sparkline shows 3-week decline → Escalate to deeper analysis (see 5.2 Cohort Analysis)
3. If any week <50% → This is "critical engagement problem" → Emergency intervention

---

#### Card 3: First Orders Placed

**Visual:** Breakdown by Batch (A | B | C)

```
Overall: 24 / 28 (86%) ✅ vs target 80%

By Batch:
  Batch A: 16/16 (100%) 🟢 
  Batch B: 6/8 (75%) 🟡
  Batch C: 2/4 (50%) 🔴
```

**What It Means:**
- **Overall:** % of all onboarded retailers who've placed ≥1 order (any time)
- **By Batch:** Shows which cohorts had harder onboarding → Tier C (learner) typically lower
- **Red Batch:** Indicates onboarding process issue or retailer readiness mismatch

**Action Trigger:**
- If Batch B drops below 70% → Contact onboarding reps; review session notes for blockers
- If Batch C drops below 50% → This is expected (learner segment); increases support frequency to 3x/week
- If ANY batch suddenly drops 10+ points → Likely system outage or app bug; check with engineering

---

#### Card 4: Channel Mix

**Visual:** Pie chart + 4-week trend line

```
Current: 🟢 78% app | 🟡 16% WhatsApp | 🔴 5% phone (target: 80% app)

4-Week Trend Line:
Week 1: 65%
Week 2: 70%
Week 3: 75%
Week 4: 78% ✅ (on track for 80% target)
```

**What It Means:**
- **Pie Chart:** Current distribution of all orders by channel (should be app-dominant)
- **Trend Line:** Migration from WhatsApp → app (adoption of new platform)
- **Goal:** Show that retailers are comfortable enough to switch from familiar channels

**Action Trigger:**
- If trend line flat/declining → App UX may be confusing; review recent support tickets
- If any retailer stuck at <30% app → Flag in "Low App Adoption" alert; schedule retraining call
- If overall app% drops week-over-week → Check for system outages (app performance degradation?)

---

#### Card 5: Retention Status

**Visual:** Breakdown of retailers by status

```
🟢 Active (last order/login ≤7 days):    26 retailers
🟡 Dormant (7–14 days inactive):        2 retailers [CONTACT NEEDED]
🔴 Churned (14+ days inactive):         0 retailers [ESCALATION READY]
```

**What It Means:**
- **Active:** Healthy; no action needed
- **Dormant:** Slipping away; need immediate outreach (email + call)
- **Churned:** Lost; emergency outreach or accept as loss

**Action Trigger:**
- Click "Contact Dormant" → Sends automated check-in email + SMS
- For each dormant retailer, assign a followup call within 2 hours (best done 11 AM local time)

---

#### Card 6: Order Frequency

**Visual:** Pre-pilot vs. Pilot average + Distribution

```
Pre-Pilot Avg: 2.1 orders/week
Current Avg:   2.4 orders/week
Change:        +14% ✅ (target: +14%)

Distribution:
  Increasing: 18 retailers (65%)
  Stable:     8 retailers (29%)
  Decreasing: 2 retailers (6%)
```

**What It Means:**
- **Avg Change:** Platform is driving MORE orders (retailers using it more than before)
- **Distribution:** Most retailers ↑ frequency; a few stable or ↓ (expected)
- **Goal:** Validate that platform reduces friction (takes less time to order)

**Action Trigger:**
- If average change drops below +10% → Investigate if app performance degraded
- If "Increasing" cohort drops below 60% → Review contact strategy; may need to refresh value prop

---

### 1.3 Drill-Down Navigation

**Starting Point:** Any card is clickable for deeper analysis

**Example Workflow:**
1. Click on "Weekly Active: 18/28" → Opens "Inactive Retailers" modal
2. Modal shows:
   - Retailer name | Last activity | Days inactive | Batch | App % | Next action
3. Click on a retailer → Opens "Retailer Profile" page with:
   - Order history (dates, channels, items, totals)
   - Login history (dates, device, duration, actions)
   - Support tickets
   - Adoption Confidence Score + readiness notes
   - **Quick Action Buttons:** "Send Email" | "Schedule Call" | "Review Notes"

---

## PART 2: ALERT RESPONSE WORKFLOWS

### 2.1 Alert Types & Response Priority

#### Alert Type #1: Dormant 7+ Days ⏰⏰

**When:** Retailer hasn't logged in or placed order for 7+ days

**Recipients:** 
- Primary: Support Manager
- Secondary: Onboarding Rep (for follow-up call)

**Response SLA:** 12 hours (same-day preferred)

**Response Workflow:**

| Time | Action | Owner | Details |
|------|--------|-------|---------|
| +0h | Receive email/SMS alert | Support Mgr | Alert includes retailer name + days inactive |
| +1h | Review retailer context | Support Mgr | Click "View Details" → see # orders, app usage %, last activity |
| +2h | Send auto check-in email | System | Template: "We miss you" (personalized with mobile app link) |
| +4h | Manual call attempt #1 | Onboarding Rep | Use script (see 2.2 below); goal = confirm retailer is ok + schedule reorder |
| +24h | If no response: Send SMS | System | SMS: "Fresh Mart – quick question: how's the app working?" |
| +48h | Manual call attempt #2 | Onboarding Rep | Deeper dive: "Any blockers I can help remove?" |
| +72h | Review & escalate | Support Mgr | If still dormant: mark as churn-risk; add to watch list |

**Success Criteria:** Retailer places order within 3 days of alert

---

#### Alert Type #2: Churned 14+ Days 🚨

**When:** Retailer hasn't logged in or placed order for 14+ days

**Recipients:**
- Primary: Pilot PM
- Secondary: Support Manager
- Tertiary: Onboarding Rep

**Response SLA:** 4 hours (escalation required)

**Response Workflow:**

| Time | Action | Owner | Details |
|------|--------|-------|---------|
| +0h | PM receives email alert | Pilot PM | Include: retailer name + total orders + readiness score |
| +30m | PM reviews context | Pilot PM | Why might they have churned? Low readiness? UX issues? |
| +1h | PM or Support calls retailer | Pilot PM | Script: (see 2.2 below); goal = understand reasons + re-engage |
| +2h | If reached: Follow-up email | Support Mgr | With tailored support offer (free training call, WhatsApp backup, etc.) |
| +4h | If not reached: Send SMS + email | System | "We value your business – let us help" + support contact |
| +7d | Final attempt or mark lost | Pilot PM | Update status to "churned_inactive"; document reason + learnings |

**Outreach Script (revised, see 2.2 for full detail):**
```
"Hi [Name], I'm [Your Name] from Supplysetup. I noticed we haven't seen orders 
from your store in a couple weeks. Is everything ok? Are you still finding value 
in the platform, or is there something we can do better?"

[Listen for reason]

"Got it. I really want to help solve that. Here are a few things I can do..."
```

---

#### Alert Type #3: No First Order After 7 Days 🎯

**When:** Retailer account 7+ days old, at least one login, but ZERO orders

**Recipients:**
- Primary: Onboarding Rep
- Secondary: Support Manager

**Response SLA:** 12 hours

**Response Workflow:**

| Time | Action | Owner | Details |
|------|--------|-------|---------|
| +0h | Alert received | Onboarding Rep | Includes: account created date + login history + readiness score |
| +2h | Review session notes | Onboarding Rep | Why didn't they order during onboarding? Document from ACS score |
| +4h | Send "first items" email | System | Template: Recommend easy first orders based on search history |
| +8h | Call with trial order offer | Onboarding Rep | "Let me walk you through placing your first order—I can help" |
| +12h | If interested: Assisted order | Onboarding Rep | Phone-in order using app (retailer has device ready, rep narrates) |
| +24h | If declined: Move to learning path | Support Mgr | Schedule 3x/week check-ins; offer WhatsApp support backup |

**Success Criteria:** First order placed within 2 days of alert

---

#### Alert Type #4: Heavy Legacy Channel Usage 📱

**When:** Retailer has 5+ total orders, but only 30% or less are via app (70%+ others)

**Recipients:**
- Primary: Support Manager
- Secondary: Pilot PM

**Response SLA:** 24 hours

**Response Workflow:**

| Time | Action | Owner | Details |
|------|--------|-------|---------|
| +0h | Alert received | Support Mgr | Shows: # orders | app % | WhatsApp % | phone % |
| +4h | Review behavior | Support Mgr | Are they using WhatsApp because it's easier? Or app has bugs? |
| +12h | Send app improvement email | System | "We noticed you prefer WhatsApp. Here's what we improved in the app..." |
| +18h | Schedule brief UX call | Support Mgr | 15-min call: "What's not working in the app? Let me show you faster way..." |
| +24h | Provide shortcut training | Support Mgr | Send 2-min video showing quickest app workflow (if they buy 3 items weekly) |
| +7d | Measure app % again | System | If still <30% app → Accept as multi-channel user; continue monitoring |

**Success Criteria:** App % increases by 10+ points within 2 weeks

---

### 2.2 Response Scripts & Templates

#### Script: Dormant Retailer Check-In Call

```
OPENING (Friendly, non-accusatory)
"Hi [Name], this is [Your Name] from Supplysetup. Do you have a quick minute? 
I wanted to check in—I haven't seen any orders from [Store Name] in about a week, 
and I just wanted to make sure everything's ok with the platform."

[Listen for response]

IF THEY SAY "FORGOT / JUST BUSY"
"Totally understand! Business gets hectic. The app's actually faster now than 
before. Can I walk you through placing an order quickly? Takes 2 minutes from 
your phone."

IF THEY SAY "THE APP ISN'T WORKING" 
"Oh, I'm sorry to hear that. Let me help. What specifically isn't working? 
[Listen.] Okay, here's what we can do: 
  1. I can walk you through it right now over this call, or
  2. You can use WhatsApp in the meantime—I'll send you my contact—and 
     we'll get the app working by tomorrow."

IF THEY SAY "I'M USING WHATSAPP INSTEAD"
"Great, so you're still ordering—that's awesome. But WhatsApp takes you longer, 
right? The app is faster: search, tap, done. Want me to show you the new feature 
I added? Takes 30 seconds, I promise."

IF THEY SAY "PRICES ARE TOO HIGH" 
"Ah, I hear that. Can I ask—compared to your old supplier, are they really 
higher? Or is the value-added (faster delivery, real-time tracking) worth it 
to you? Let me send you a price comparison doc."

CLOSING (Action-oriented)
"Okay [Name], here's what I'm going to do: I'm sending you a quick video 
on the fastest way to order via the app. Takes 30 seconds to watch. 
Try placing an order today, and if you hit ANY snags, you have my direct 
number. Deal?"

[Send video link via SMS immediately after call]
```

---

#### Script: Churn Recovery Call (14+ Days Inactive)

```
OPENING (Concerned, professional)
"Hi [Name], this is [Your Name] - the Pilot PM for Supplysetup. I'm reaching 
out because we haven't seen [Store Name] on the platform in about 14 days, 
and I wanted to personally check in."

[Listen for response]

EMPATHIZE & DIAGNOSE
"I really appreciate you picking up. I know the first few weeks can feel like 
a lot of change. Help me understand: what's made it hard to keep using the 
platform? Is it:
  → The app itself isn't working smoothly?
  → You prefer your old ordering method?
  → Prices or product selection issues?
  → Something with our support or service?
  → You're just busy right now?"

[Listen carefully – THIS is the key insight]

IF TECHNICAL ISSUE
"Okay, I'm going to personally fix this for you today. But in the meantime, 
you can order via WhatsApp with this phone number [provide]. By tomorrow, 
I'll ensure the app works perfectly. Sound good?"

IF PREFERENCE ("I like WhatsApp")
"I get it. WhatsApp is familiar. But here's the thing—the app actually saves 
you 10 minutes per order because you can see inventory in real time. Let me 
prove it to you. Can I do a quick screen share right now and show you?"

IF PRICE/SELECTION
"That's really valuable feedback. Let me record that and get our pricing team 
to look at your account. Sometimes there are bulk discounts we set up 
customized. Can I give you 24 hours, and I'll either improve your pricing 
or explain why it is what it is?"

IF BUSY
"I totally understand. You've got a store to run. Here's what—could I send 
you a 1-min video showing how to order in <60 seconds? Try it this week, 
and if you hate it, no pressure. But I really think you'll find it worth it 
for the time savings alone."

CLOSING (Rebuild trust)
"[Name], I want you to know: I'm here for this pilot, but more importantly, 
I want you to win. If the platform isn't delivering value, I need to know 
so we can fix it. But I genuinely believe it can, and I'd hate for you to 
miss out because of a bump in the road. Can we give it one more shot?"

[Offer immediate next action: call back in 2 hours, video link, WhatsApp support, etc.]
```

---

#### Template: Auto-Email for Dormant Retailers

**Subject:** "We Miss You ❤️ – Quick Demo of What's New"

```
Hi [Retailer Name],

Haven't seen an order from [Store Name] in about a week! Is everything okay 
with Supplysetup?

We just shipped a major update that makes ordering FASTER:
  ✅ See realtime inventory (no more guessing if items are in stock)
  ✅ Save your favorite items (reorder in 2 taps)
  ✅ Track deliveries live on a map

📺 Watch 60-second demo: [video link]

Not feeling the app? No worries—you can still use WhatsApp. 
Text my team here: [WhatsApp link]

Need help? Come find me:
  📞 Call/WhatsApp: [+1 XXX-XXX-XXXX]
  ⏰ Reply time: Usually within 2 hours, 9 AM–6 PM [Your Timezone]

Let's get you back ordering!

[Your Name]
Pilot Support Team
```

---

#### Template: Auto-Email for No First Order

**Subject:** "[Retailer Name], Your Free First Order Awaits 🎁"

```
Hi [Retailer Name],

Thanks for signing up for Supplysetup! I noticed you've logged in but haven't 
placed your first order yet.

Here's the thing: most retailers see 10–15% time savings on their first order. 
Let's make yours count!

👇 Here's the fastest way to order (2 minutes):

1. Open the app → Search "Top Sellers" category
2. Tap 3–5 items [We recommend: Fresh Milk, Bread, Eggs – your most-bought items]
3. Review → Checkout [We already have your payment info]

That's it. Done. You just proved it actually works.

If you get stuck anywhere, I'm here:
  📞 Tap to call: [phone link]
  ⏰ Available now: 9 AM–6 PM [Your timezone]

Let me know how it goes!

[Your Name]
Pilot Support Team
```

---

#### Template: Auto-SMS for Dormant Retailers (Day 10)

```
Hi [Name]! It's [Your Name] from Supplysetup. Haven't heard from [Store] 
in a bit. Everything good? Need any help? Reply STOP to opt out. [Link]
```

---

### 2.3 Alert Priority Matrix

**When Multiple Alerts Arrive (how to prioritize):**

| Alert Type | Severity | Response Time | Escalate If |
|---|---|---|---|
| 🔴 Churned (14+ days) | Critical | 4 hours | Can't reach in 2 hours → escalate to Regional Mgr |
| 🟡 Dormant (7–14 days) | High | 12 hours | >3 retailers dormant & declining trend |
| 🟡 Heavy Legacy Channel | High | 24 hours | >50% pilot using non-app & app % declining |
| 🟡 No First Order (7 days) | Medium | 12 hours | Readiness score <40 → escalate to PM for learning path |

**Rule:** Handle all critical (red) alerts same day. Handle all high (yellow) alerts within 24h.

---

## PART 3: WEEKLY OPERATIONS CHECKLIST

### 3.1 Sunday Evening Prep (Pre-Week Planning)

**Owner:** Pilot PM  
**Time:** 30 minutes

- [ ] Pull dashboard summary for leadership briefing (use export feature)
- [ ] Identify any retailers trending toward churn (Weekly Active declining? Channel mix stuck?)
- [ ] Review Batch C (learner cohort) for intervention needs
- [ ] Confirm staffing lineup for Week ahead (who's on-call for alerts?)
- [ ] Share "High Priority Alerts" list with support team via Slack
- [ ] Send weekly standup agenda to team

---

### 3.2 Daily Morning Standup (9 AM)

**Owner:** Pilot PM + Support Manager  
**Time:** 15 minutes

**Agenda:**

1. **Dashboard Health Check (2 min)**
   - Onboarding Progress: On track?
   - Weekly Active: Stable or declining?
   - First Orders: Any batch drops?
   - Any red (🔴) indicators?

2. **Open Alerts Review (5 min)**
   - How many open dormant alerts? 
   - Any churned alerts escalated yesterday? Status?
   - New alerts overnight? Assign owners.

3. **Blockers & Escalations (5 min)**
   - Any system outages? App issues? Payment problems?
   - Any retailer feedback loops (e.g., multiple complaints about X)?
   - Do we need to escalate anything to engineering?

4. **Daily Actions (3 min)**
   - Support Mgr: Confirm who's handling today's outbound calls
   - Onboarding Rep: Any retailers due for retraining/check-in?
   - PM: Any data anomalies to investigate?

---

### 3.3 Weekly Business Review (WBR) – Friday 2 PM

**Owner:** Pilot PM + Leadership  
**Time:** 60 minutes

**Agenda:**

1. **KPI Summary (10 min)**
   - Onboarding: # completed this week, cumulative %, ETA for 35
   - First Orders: % overall, by batch, any cohorts underperforming?
   - Weekly Active: Trend (up/stable/down), # at risk
   - Retention: # active, # dormant, # churned (cumulative)
   - Channel: App % trend, on track for 80% target?
   - Frequency: Pre-pilot vs. current, trending +14%?

2. **Cohort Performance (15 min)**
   - Batch A: (Fast-track) All onboarded? 100% first orders? Adoption score >85?
   - Batch B: (Core) Onboarding complete? >75% first orders? Trending recruitment?
   - Batch C: (Learner) Challenges? More hands-on support needed?

3. **Alert Analysis (10 min)**
   - Dormant retailers: Why dormant? # contacted? Recovery rate?
   - Churn retailers: Why churned? Learning for next cohort?
   - No-first-order: # still stuck? Additional training needed?

4. **Resource & Support Needs (10 min)**
   - Support team: Overloaded? Need staffing additions?
   - Technical: App issues, payment problems, data accuracy concerns?
   - Messaging: Any objections we're not addressing?

5. **Decisions & Action Items (15 min)**
   - Should we accelerate/slow down Batch C launch?
   - Do we need to adjust support model (e.g., increase retraining calls)?
   - Any process changes given first 2 weeks of data?
   - What should we highlight to executive leadership?

---

## PART 4: ESCALATION PROCEDURES

### 4.1 When to Escalate 🚨

**Escalate to Pilot PM immediately if:**
- 2+ retailers churn in same day (suggests systemic issue, not individual)
- App experiences downtime >30 minutes
- >30% of new cohort reports same issue (e.g., "payment button broken", "catalog won't load")
- Weekly Active drops >10 points week-over-week
- Payment processing failure rate >5%

**Escalate to Regional Director if:**
- Entire pilot is at churn risk (churn rate would exceed 50% by projections)
- Critical feature identified missing after launch (e.g., bulk ordering)
- Decision needed to postpone next batch launch
- PR/reputation risk (e.g., major customer publicly complaining)

**Escalate to Executive if:**
- Questions entire pilot strategy or go-live date
- Budget overrun >20%
- Request for resource allocation beyond pilot scope

---

### 4.2 Escalation Template

```
FROM: [Your Role] [Your Name]
TO: [Escalation Owner]
SUBJECT: ESCALATION – [Issue Summary] – Action Needed by [Date/Time]

SITUATION:
[1-2 sentences: What happened?]

IMPACT:
[How many retailers affected? What's the damage?]

ROOT CAUSE (if known):
[Why did it happen?]

PROPOSED NEXT STEPS:
[What do we do now?]

DECISION NEEDED:
[What are we asking the escalation owner to decide/approve?]

DEADLINE:
[When do we need this resolved?]
```

**Example:**
```
SITUATION:
App payment gateway went down at 11 AM UTC for 45 minutes. 
8 retailers tried to place orders and abandoned due to payment errors.

IMPACT:
Potential churn risk for early adopters who experienced checkout failure + 
negative sentiment ("your app doesn't work").

ROOT CAUSE:
Third-party payment processor had network outage. Not our bug.

PROPOSED NEXT STEPS:
1. Engineering: Switch to backup payment processor for redundancy
2. Support: Proactive outreach to 8 affected retailers (retry order + discount)
3. Comms: Brief launch email ("Better reliability coming")

DECISION NEEDED:
Approve $15K investment in dual payment processor setup? 
Approve 5% discount for affected retailers ($120 total)?

DEADLINE: 
Need approval by EOD so we can message customers tomorrow morning.
```

---

## PART 5: ADVANCED ANALYSIS & DEEP DIVES

### 5.1 Cohort Comparison Analysis

**When to run:** Weekly (Friday WBR) or when performance diverges

**Questions to answer:**
1. How do Batch A vs. B vs. C compare on first order rates?
2. Are learners (Batch C) actually learning, or dropping off?
3. Which frequency segment (high/med/low) has best adoption?
4. Are any readiness tiers underperforming?

**Dashboard Deep-Dive:**

1. Go to **Retailers List** (from alert panel)
2. Filter by: **Batch** = A, B, C
3. Add columns: Last Activity, Order Count, Days to First Order, ACS Score
4. Sort by: Days to First Order (ascending)

**Analysis Template:**

```
BATCH COMPARISON – Week 2 Analysis

Batch A (Fast-Track, 16 retailers):
  First Orders: 16/16 (100%) ✅
  Days to 1st Order: avg 4 hours (excellent)
  Weekly Active: 16/16 (100%)
  App %: 94%
  ACS Score Avg: 88
  → INSIGHT: Fast-track model works; minimal support needed

Batch B (Core, 20 retailers):
  First Orders: 15/20 (75%) 🟡
  Days to 1st Order: avg 3 days
  Weekly Active: 14/20 (70%)
  App %: 72%
  ACS Score Avg: 71
  → INSIGHT: 5 retailers stuck; may need classroom training vs. 1-on-1

Batch C (Learner, 6 retailers):
  First Orders: 2/6 (33%) 🔴
  Days to 1st Order: avg 8 days (slow)
  Weekly Active: 2/6 (33%)
  App %: 40%
  ACS Score Avg: 52
  → INSIGHT: Learner cohort struggling; need 3x/week calls + WhatsApp fallback

RECOMMENDATION:
→ Maintain fast-track for Batch A
→ Schedule group classroom for Batch B (Fri 2 PM)
→ Assign dedicated support rep to Batch C
```

---

### 5.2 Churn Root Cause Analysis

**When to run:** After each churned retailer (14+ days inactive)

**What to investigate:**
1. When did they last order/log in? Over what period?
2. How many orders total? Average value?
3. What was their ACS score at onboarding?
4. Did they use app or legacy channels? Mix?
5. Any support tickets or complaints?
6. What was their frequency segment (high/med/low)?

**Churn Root Cause Template:**

```
CHURN ANALYSIS – Fresh Mart (Retailer ID: rtl-012)

TIMELINE:
→ Onboarded: May 12, 10:00 AM
→ First Order: May 12, 2:30 PM (same-day ✅)
→ 2nd Order: May 17, 11:00 AM (5 days later)
→ Last Order: May 20, 3:00 PM
→ Last Login: May 20, 3:15 PM
→ Days Inactive: 9 days (today is May 29)

ORDER HISTORY:
  Order 1 (May 12): $76.50, 4 items, app
  Order 2 (May 17): $52.30, 3 items, WhatsApp
  Total: 2 orders, $128.80

ACS SCORE AT ONBOARDING: 72 (Tier 2 – moderate support)
  First Order: 30/30 ✅ (placed during visit)
  Platform Comfort: 18/20 ✅ (good mobile experience)
  Tech Confidence: 12/15 ⚠️ (manual needed; can't troubleshoot)
  Engagement: 8/15 🔴 (seemed disinterested in second week)

CHANNEL PREFERENCE: 
  App: 50% | WhatsApp: 50% (even split suggests indifference)

SUPPORT HISTORY:
  May 10 (pre-onboarding): Quick chat – "How does payment work?"
  No support tickets after onboarding

FREQUENCY SEGMENT: Medium (pre-pilot baseline: 1.5 orders/week)

ROOT CAUSE HYPOTHESIS:
→ Fresh Mart is a "moderate adopter" (ACS 72 tier); needs consistent engagement
→ No push after first 2 orders = assumed success, but didn't build habit
→ Switching between app/WhatsApp = still exploring, not committed
→ Low engagement score (8/15) suggests they need different value prop

LESSON FOR NEXT COHORT:
→ Tier 2 retailers (ACS 60–79) need 2x/week check-ins for first 3 weeks
→ Don't assume "they ordered twice, they get it"; habit formation takes 3 weeks
→ Medium frequency segment needs different messaging (e.g., efficiency gains)
```

---

### 5.3 Performance by Frequency Segment

**When to run:** End of Week 3 (to identify segments working/struggling)

**Segments:**
- HIGH: ≥2 orders/week pre-pilot
- MEDIUM: 1–2 orders/week
- LOW: <1 order/week

**Analysis:**

| Metric | High-Freq | Med-Freq | Low-Freq | Insight |
|---|---|---|---|---|
| First Order Rate | 95% | 85% | 60% | Low-freq retailers slower to adopt |
| Days to 1st Order | 2 days | 4 days | 8 days | Need differentiated onboarding by segment |
| Weekly Active | 82% | 68% | 45% | Low-freq churn faster; need weekly outreach |
| App % | 85% | 72% | 50% | Low-freq prefer legacy channels; plan accordingly |
| Avg Frequency Change | +22% | +14% | +8% | High-freq see biggest lift; validates value prop |
| ACS Avg | 78 | 71 | 58 | Low-freq at higher risk; need more support |

**Segment-Specific Support Model:**

```
HIGH-FREQUENCY RETAILERS (Pre-Baseline ≥2 orders/week):
→ Onboarding: Self-serve + 1 check-in call
→ Support: Reactive only (respond to problems)
→ Check-in: Monthly (not needed; they're engaged)
→ Success rate: ~95% (these are your power users)

MEDIUM-FREQUENCY RETAILERS (Pre-Baseline 1–2 orders/week):
→ Onboarding: Guided + 2 check-in calls
→ Support: Proactive; weekly check-in email
→ Check-in: 2x week for first 3 weeks, then weekly
→ Success rate: ~75% (need consistency to build habit)

LOW-FREQUENCY RETAILERS (Pre-Baseline <1 order/week):
→ Onboarding: Hands-on + daily calls for 1 week
→ Support: High-touch; dedicated rep assigned
→ Check-in: 3x week for first 4 weeks
→ Success rate: ~50% (extended learning curve)
→ Risk: May not be right fit; consider early exclusion
```

---

## PART 6: TROUBLESHOOTING COMMON ISSUES

### 6.1 "Weekly Active is Declining"

**Symptoms:**
- Last 4 weeks: 28 → 24 → 21 → 18 (falling each week)
- Your gut: "Oh no, we're losing people"

**Investigation Checklist:**

1. **Is it absolute decline or % decline?**
   - If total onboarded also growing, % may be misleading
   - Example: Week 1 = 8 retailers, 7 active (87%)
             Week 4 = 35 retailers, 18 active (51%) – looks worse but new ppl added this week

2. **Check by batch:**
   - Batch A staying active? → Low churn at scale
   - Batch B dropping? → Cohort 2 onboarding quality issue
   - Batch C not yet active? → Expected; they just launched

3. **Check by frequency segment:**
   - High-freq stable? → Good signal (power users engaged)
   - Low-freq dropping? → Expected; hard to convert occasional buyers

4. **Is it summer slump?**
   - Check: Is this decline concentrated among specific retailers with seasonal patterns?
   - If yes, wait and monitor; not necessarily churn

5. **Check app uptime/bugs:**
   - Any outages last week? Bugs reported?
   - Search support tickets for keywords: "can't place order", "app crashed", "payment failed"

**Response by Root Cause:**

| Root Cause | Action |
|---|---|
| Batch B onboarding quality issue | 1) Review last 5 Batch B onboarding sessions for blockers 2) Schedule group training call 3) Assign dedicated support rep |
| Low-freq retailers expected churn | 1) Accept as normal; focus on high-freq retention 2) Increase check-ins for low-freq (3x/week) 3) Set realistic targets for this segment |
| App bug | 1) Escalate to engineering immediately 2) Implement WhatsApp fallback for affected users 3) Send proactive email explaining fix ETA |
| Summer seasonality | 1) Monitor weekly; confirm it's not broader churn 2) Don't panic; revisit in 2 weeks when summer rush ends |

---

### 6.2 "First Orders Stuck at 75% (Not Reaching 80% Target)"

**Symptoms:**
- Week 1: 100% (Batch A all ordered)
- Week 2: 85% (added Batch B, one didn't order)
- Week 3: 78% (added more Batch B, not converting)
- Week 4: 75% (Batch C launches at 50%)

**Root Causes (in priority order):**

1. **Onboarding sessions not completing order**
   - Check: Did they log in but bounce?
   - Diagnosis: Review ACS scores for "stuck" retailers – are they <60?
   - Solution: Re-run onboarding session within 2 days; use assisted order

2. **App bugs during checkout**
   - Check: Payment gateway issues? Cart bugs?
   - Diagnosis: Review support tickets for "checkout" keyword
   - Solution: Escalate to engineering; offer WhatsApp as workaround

3. **Retailer saw no products they want**
   - Check: "Catalog breadth" – same products for all retailers?
   - Diagnosis: Call a stuck retailer – ask what they missed
   - Solution: Catalog may be incomplete for certain retailer profiles

4. **Onboarding rep rushed (missed product search demo)**
   - Check: Review onboarding session notes
   - Diagnosis: Rep might have skipped "finding your items" step
   - Solution: Retrain reps on importance of 10-min product tour

**Action Plan:**

```
Week 1 (Immediate):
1. Pull list of all retailers with 0 orders
2. Call each: "Quick question – why haven't you ordered yet? [Listen]"
3. Categorize blockers (app bug, nothing to buy, forgot, no-time, prefers WhatsApp)
4. By blocker: implement fix (60-min turnaround target)

Week 2 (Follow-up):
1. Re-offer: "Here's what we fixed / here's what we're doing – try again?"
2. Assisted orders: "Let me walk you through placing your first order" (phone)
3. Track: Which segment of retailers finally ordered? What worked?

Week 3 (Analysis):
1. If you hit 80%, great – document what worked and replicate for Batch C
2. If still <80%, ask: Is 80% realistic for this audience? Adjust target.
```

---

### 6.3 "App Channel % Stuck Below 80% (55% vs. 80% Target)"

**Symptoms:**
- Week 1: 65% app (expected – WhatsApp familiar)
- Week 2: 70% app (good trend)
- Week 3: 72% app (slowing – not reaching 80%)
- Retailers still using WhatsApp even after app orders one or two times

**Root Causes:**

1. **No friction in WhatsApp = People take easy path**
   - Example: Retailer knows they can text exact order to WhatsApp rep
   - App = must login, search, tap, tap, tap

2. **App search/catalog not intuitive**
   - Retailers can't find what they want in app (vs. WhatsApp rep knows)
   - App: 30 seconds to find "Fresh Milk" vs. WhatsApp: text "2 milk" (5 seconds)

3. **WhatsApp feels human; app feels robotic**
   - Rep confirms order, answers Qs, negotiates
   - App has no human touch → feels transactional
   - Some retailers value relationship > speed

**Response Strategy (Segment-Based):**

For **High-Frequency Retailers:**
- Value: Speed (every minute counts when ordering 2x/week)
- Messaging: "Your app is 3× faster than WhatsApp – save 30 min/week"
- Action: Show them time audit (WhatsApp avg 8 min vs. app 2 min)

For **Medium-Frequency:**
- Value: Convenience (less mental overhead)
- Messaging: "Add your top 10 items as favorites – one-tap reorder"
- Action: Pre-load their favorites; send video ("Here's your 5-item one-tap reorder")

For **Low-Frequency:**
- Value: Support + guidance
- Messaging: "App + WhatsApp backup – best of both"
- Accept: These retailers may never be 100% app; aim for 40–50%

**Activity Plan:**

```
Target: Get to 80% app by end of Week 4

Week 1 (Diagnosis):
1. Call 3 retailers stuck at 10–30% app usage
2. Ask: "What would make you use app instead of WhatsApp?" 
   → Record exact answers

Week 2 (Micro-Solutions):
1. Build top 3 features they asked for (e.g., favorites, saved carts, estimated delivery)
2. Send personalized email: "Your suggestion for [feature] is now live! Try it."
3. Track if app % goes up for those 3 retailers

Week 3 (Scale the Model):
1. If feature helped 3 retailers shift to 50% app, send to all medium-freq segment
2. Measure: How many move from WhatsApp-primary to app-primary?

Week 4 (Acceptance):
1. If stuck <80%, analyze: Is 75% actually acceptable for this market?
2. Consider lowering target to 75% if WhatsApp-preference cultural, not fixable
3. Document: "For learner/low-freq segments, 50% app + 50% hybrid is realistic"
```

---

## PART 7: DASHBOARD ACCESS & ROLE-BASED VIEWS

### 7.1 User Roles & Permissions

| Role | Access | Typical Daily Use | Alerts Received |
|---|---|---|---|
| **Pilot PM** | Full dashboard + all retailers + export | Check first thing each morning; create daily briefing | Churned (14d), High app-adoption issues |
| **Support Manager** | Dashboard + retailer list (filtered) + limited export | Monitor active alerts; respond to dormant/churn | Dormant (7d), churn (14d), low app |
| **Onboarding Rep** | Dashboard summary + assigned retailers | Track my cohort's adoption; call scheduled retailers | No first order (7d) assignments |
| **Regional Director** | High-level KPI summary + export (summary PDF only) | Weekly WBR review; decision-making | None (pushed via dashboard) |
| **Executive** | Monthly summary PDF + trending charts | Month-end business reviews | None |

### 7.2 View Customization

**PM's Custom View (Tuesday 9 AM walkthrough):**
1. Dashboard loads to summary banner (28/35 onboarded, 86% first orders, 64% weekly active)
2. Cards sorted by: Onboarding → First Orders → Weekly Active → Retention → Channel Mix → Frequency
3. Alert panel shows 2–3 open alerts (dormant + any criticals)
4. Drill-down: Click "Weekly Active 64%" → Modal shows 10 inactive retailers, sorted by days inactive (highest first)

**Support Manager's View:**
1. Dashboard focused on alert responsiveness
2. Prominent: "Open Alerts" → "Dormant" tab → List of 2–3 retailers due for calls
3. Drill-down: Click retailer → "Contact Options" (Call template, Email template, WhatsApp link)
4. No export (access restricted to PM)

---

## PART 8: TRAINING & ONBOARDING FOR SUPPORT TEAM

### 8.1 Required Training Before Live Pilot

**All Support Staff:**
- ✅ 30-min: Dashboard walkthrough (parts 1.1–1.3)
- ✅ 45-min: Alert response workflows (parts 2.1–2.2)
- ✅ 30-min: Script practice (role-play dormant & churn calls)
- ✅ 15-min: Escalation procedures (part 4)
- ✅ Quiz: Identify correct alert response for 5 scenarios

**Onboarding Reps:**
- ✅ All of above, plus:
- ✅ 60-min: First-order acceleration techniques (part 2.2)
- ✅ 30-min: ACS scoring (predicting risk retailers)
- ✅ 15-min: Assisted order walkthrough (phone + app screen share)

**Pilot PM:**
- ✅ All of above, plus:
- ✅ 90-min: Cohort analysis deep-dive (part 5.1–5.2)
- ✅ 45-min: Troubleshooting mastery (part 6)
- ✅ 30-min: Escalation decision authority

---

### 8.2 Weekly Coaching

**Every Monday:**
- 15-min: "Last Week's Alerts" retrospective
  - Which alerts were false positives? Why?
  - Which alerts led to successful recoveries? What did we do?
  - Anything we'd handle differently?

**Every Friday:**
- 15-min: "Next Week's Focus"
  - Cohort launching next week? Special support plan?
  - Any known issues to watch for?
  - Staffing plan for alerts?

---

**DOCUMENT VERSION:** 1.0  
**EFFECTIVE DATE:** [Pilot Start Date]  
**LAST UPDATED:** [Current Date]

---

**Quick Reference Checklists:**

**📋 Daily Morning (9 AM)**
- [ ] Check dashboard health
- [ ] Review open alerts
- [ ] Assign today's call list
- [ ] Standup meeting

**📋 Weekly Friday WBR (2 PM)**
- [ ] All KPIs reviewed
- [ ] Cohort performance analyzed
- [ ] Action items assigned
- [ ] Next week staffing confirmed

**📋 Alert Response (when alert arrives)**
- [ ] Log alert in system
- [ ] Review retailer context
- [ ] Send auto-email (if applicable)
- [ ] Schedule call within SLA
- [ ] Update status to "in-progress"
- [ ] Close alert with resolution notes
