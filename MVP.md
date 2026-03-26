# Startup Game — MVP Document

## Vision

A high-realism startup simulation game with minimal visuals but deep logic.
The player experiences the full lifecycle of building a startup — from idea to exit (or failure).
Every decision has real consequences. No hand-holding.

---

## Core Philosophy

- Logic over graphics
- Every action has a trade-off
- Time is the most limited resource
- Failure is part of the loop
- Realistic numbers (burn rate, runway, MRR, churn)
- Clicking "Next Week" must never feel like watching a progress bar

---

## Core Game Loop

Every week follows this exact cycle — this is the heartbeat of the game:

1. **Review** — See what changed: cash dropped, a user churned, an event fired
2. **Decide** — Allocate your time across 3–4 options (build / sell / fix / rest)
3. **Forced Dilemma** — At least one binary tradeoff event per week (e.g. ship fast vs. ship right)
4. **Simulate** — The week resolves: metrics update, consequences play out
5. **Story Log** — A 2–3 line narrative recap of what just happened ("You shipped the onboarding flow. 3 users signed up. AWS bill came in.")
6. **Repeat**

The fun lives in step 3. If every week feels like passive number-watching, the game is dead.

---

## Game Structure

### Lifecycle Stages

1. Idea Stage
2. Pre-Seed / Bootstrapping
3. Seed Round
4. Product-Market Fit (PMF) Hunt
5. Series A
6. Growth / Scaling
7. Exit (IPO / Acquisition) or Shutdown

Each stage has specific unlock criteria. You cannot skip stages.

---

## Player Setup (Game Start)

- Choose founder archetype: Technical / Business / Designer / Domain Expert
- Choose industry vertical: SaaS, Marketplace, Consumer App, Hardware, FinTech, HealthTech, etc.
- Choose starting conditions:
  - Solo founder vs co-founder (affects speed, equity, decision-making)
  - Bootstrapped vs Angel-backed
  - Location (affects talent cost, investor access, market size)
- Starting resources: $10k savings (bootstrapped) or $150k angel (angel-backed)

---

## Core Game Systems (MVP — 5 Systems Only)

### 1. Time Allocation System

- Each week = 40 hrs to distribute across buckets:
  - Build (product progress)
  - Sell (customer growth)
  - Fix (reduce churn / bugs)
  - Rest (recover energy, prevents forced errors)
- Allocation is a slider/split — not a task list
- Visible output: "You spent 60% building. Product moved forward. 0 new customers."
- This is the primary decision the player makes every week

### 2. Finance System

- Cash in bank (single most important number)
- Weekly burn (fixed costs: infra, any hires)
- Runway = cash / weekly burn (shown in weeks)
- MRR tracked and updated every week
- Rule: if runway < 4 weeks, warning state activates (red UI, panic events more likely)

### 3. Product System

- Product has a Progress bar (0–100%)
- Each week of "Build" time moves it forward
- At milestones (25%, 50%, 75%, 100%) — a feature ships, churn drops, new customers possible
- Tech debt is a single hidden multiplier: high debt = slower progress, more bug events
- No feature list in MVP — just the bar and the consequences

### 4. Customer Growth System

- Two acquisition channels only: Organic (slow, free) and Paid (fast, costs cash)
- Each week: new customers gained based on time allocation + channel spend
- Churn calculated weekly — bad product = higher churn rate
- Net customer change shown clearly: "+4 gained, -2 churned = net +2"
- MRR = customers x ARPU (fixed per run at start)

### 5. Events System (Forced Dilemmas)

Events fire every week — at least one is a binary forced tradeoff. No passive events.

**Event Categories:**

Crisis (bad thing happened — pick your poison):
- "AWS bill spiked. Pay $800 now or risk downtime. [Pay] [Delay]"
- "User found a critical bug. Fix it now (lose 2 days of build time) or ignore it (risk 10% churn). [Fix] [Ignore]"
- "You're burning out. Take a rest week or push through with 50% productivity. [Rest] [Push]"

Opportunity (upside with a cost):
- "A blogger wants to write about you. Spend 5hrs on interview or stay heads-down. [Do it] [Skip]"
- "A potential customer wants a custom feature. Build it (3 weeks, 1 customer) or decline. [Build] [Decline]"
- "Angel investor wants to meet. Prep pitch (lose a week) or pass. [Prep] [Pass]"

Market (external shift, forces adaptation):
- "A competitor just launched. Churn risk +5% this week. [Double down on retention] [Ignore and build]"
- "Your niche got a trending tweet. Paid acquisition costs drop 50% for 2 weeks. [Spend more] [Stay course]"

All choices have cascading consequences visible in the story log next turn.

---

## Moved to V2 (Not in MVP)

The following systems are well-designed but create scope bloat. Cut entirely from MVP:

- NPS score and word-of-mouth multiplier
- Cap table and equity tracking
- Fundraising system (rounds, due diligence, term sheets)
- Team system (hiring, morale, culture fit, burnout)
- Founder stats and skill XP
- Advisors
- Enterprise sales cycle
- Competitor AI simulation
- Multiple acquisition channels beyond 2
- CAC / LTV / payback period metrics

---

## Dashboard (Minimal UI)

### 5 Core Metrics — Always Visible (No More)

| Metric | Why It's There |
|---|---|
| Cash | Are you alive? |
| Runway | How many weeks left? |
| MRR | Are you growing? |
| Customers | Who's paying? |
| Churn | Are they staying? |

Everything else (tech debt, product progress, event history) is behind a "Details" panel — hidden by default.

### Main Screen Layout

```
[ Week 12 ]                          [ Cash: $42,300 ]  [ Runway: 9 weeks ]

  MRR: $1,200     Customers: 24     Churn: 8%

  ┌─────────────────────────────────────────────────────┐
  │  This week:                                          │
  │  You shipped the onboarding flow. 3 users signed up. │
  │  AWS bill arrived: -$200. Runway tightened.          │
  │  An investor emailed. Prep a pitch or stay focused?  │
  │                                                      │
  │  [ Prep Pitch — lose 1 week ]  [ Stay Focused ]      │
  └─────────────────────────────────────────────────────┘

  Time Allocation:
  [ Build ████░░ ]  [ Sell ██░░░░ ]  [ Fix █░░░░░ ]  [ Rest ░░░░░░ ]

  [ Next Week → ]
```

### Company Visual (Small Panel)
- Small pixel-art or CSS illustration of the workspace
- 3 states only in MVP: Bedroom → Coffee Shop → Co-working Space
- Changes at customer/MRR milestones, not time
- No interaction — purely visual reward for progress

### Story Log
- Last 5 weeks of narrative entries, scrollable
- Each entry is 2–3 lines max
- Written in second person ("You shipped X. Y happened.")
- This is the emotional core — players read it to feel the journey

---

## Early Game Hook (Weeks 1–10)

The first 10 weeks have a single visible mission so players know what winning looks like early:

> **"Reach $1,000 MRR before you run out of money."**

This is shown on screen at all times during early game. It creates immediate tension and a clear short-term goal before longer lifecycle stages become relevant. Once hit, the next goal unlocks: $5k MRR, then $10k, then PMF checkpoint.

Without this, players don't know if they're winning or losing early — and they quit.

---

## Win Conditions

- Reach $10k MRR (MVP end state — "You found traction")
- Acquisition exit (offer > target multiple — V2)
- Profitable bootstrapped (break-even 12+ weeks — V2)

## Lose Conditions

- Cash hits $0 (game over — company shuts down)
- Churn exceeds new customers for 8 consecutive weeks (death spiral, forced shutdown)

### Post-Mortem Screen (Required on Loss)

On failure, show a breakdown screen before the player can restart:

```
Game Over — Week 23

You ran out of money.

What went wrong:
  - Week 8:  You ignored the churn spike (8% → 14%). Cost: 6 customers.
  - Week 14: You chose to build instead of sell for 3 weeks straight.
  - Week 19: The AWS event drained $1,200 you couldn't recover.

Turning point: Week 8. If you'd fixed churn then, you'd have lasted ~12 more weeks.

[ Try Again ]  [ Change Strategy ]
```

This screen is not optional — it's a core feature. It teaches, it respects the player's time, and it makes them want to replay.

---

## Progression & Replayability

- Each run is a new startup — random event order, different starting cash
- Post-mortem screen teaches the player what broke them
- New event cards unlocked after each completed run
- Leaderboard (V2): fastest to $1k MRR, $10k MRR, highest week survived

---

## MVP Scope (First Playable Version)

### In MVP — 4 Systems, Nothing Else

| System | What's Included |
|---|---|
| Time Allocation | Weekly slider: Build / Sell / Fix / Rest |
| Finance | Cash, burn, runway, MRR |
| Product | Progress bar, tech debt as hidden multiplier |
| Events | 20 events across 3 categories (crisis / opportunity / market) |

Customer growth is a derived output of the above — not its own system.

Additional scope:
- 1 vertical (SaaS), solo founder, $15k starting cash
- Early game hook: reach $1k MRR mission on screen
- 5-metric dashboard only
- Story log (last 5 weeks)
- Company visual: 3 states
- Post-mortem failure screen
- Win/lose detection

### Post-MVP (V2+)

**Game Systems:**
- Team system (hiring, morale, burnout)
- Fundraising lifecycle (angels, seed, Series A, cap table)
- Founder stats and skill XP
- Advisors and warm intros
- Multiple verticals and co-founder mode
- Competitor AI simulation
- Enterprise sales cycle
- Full event pool (100+ scenarios)
- Leaderboard and unlockable archetypes
- Mobile version
- Multiplayer (compete as rival startups)

**AI Features (High Value Only):**

| Feature | What AI Does | Why |
|---|---|---|
| Story Log Narration | LLM generates a unique 2–3 line weekly recap based on actual game state | Pre-written templates feel canned after a few runs. AI makes each week feel like a real story. |
| Dynamic Event Generation | When the hand-written event pool runs out, LLM generates new contextually relevant dilemmas based on current metrics | Prevents repetition on replays. Events feel tailored, not random. |
| Post-Mortem Analysis | LLM reads the full decision history and writes a real analysis of what broke you and when | More insightful than a hardcoded "Week 8 was your turning point." Teaches the player something true. |
| Investor Feedback (Fundraising) | AI plays the investor — gives realistic pushback on your metrics during pitch | Makes fundraising feel like a real conversation, not a stat check. |

All AI features use the Claude API. One call per trigger event — not streaming, not always-on. Designed to be low-cost per session.

---

## Tech Stack Recommendation

- Frontend: React + TypeScript
- Game state: Zustand or Redux
- Visuals: Three.js (3D office) or simple CSS/SVG for MVP
- Charts/Metrics: Recharts or Chart.js
- Backend (later): Node.js + PostgreSQL (for leaderboards, save states)
- Hosting: Vercel (frontend), Railway (backend)

---

## Monetization (Post-MVP)

- Free to play with 3 runs
- One-time purchase to unlock full game
- DLC: new verticals (HealthTech, Hardware, Web3)
- Premium scenarios / story modes

---
