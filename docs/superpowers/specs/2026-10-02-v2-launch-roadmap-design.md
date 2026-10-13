# v2 Launch — "Run a company, not a money printer": Roadmap + Sub-project A

**Status:** Roadmap and sub-project A approved 2026-10-02. B–F get their own design review before building.
**Base:** the current v2 build (interns, location ladder, themed rooms, 2.5D city, room-first UI).

## 1. Why the game is too easy (diagnosis)

1. Infinite market: every email round finds ~10 leads regardless of size; sales converts ~37%. Revenue grows linearly forever.
2. Flat churn: one monthly rate with a difficulty floor; product quality, support and outages don't matter.
3. People are machines: no fatigue, no leaving, no company knowledge; morale/stress are pinned.
4. Flat costs: rent + salaries only; nothing scales with customers.
5. The idea barely matters: difficulty nudges multipliers, not the market.

## 2. Roadmap

| # | Sub-project | Scope |
|---|---|---|
| A | **Own engine + take over `/`** | v2-owned state, store and tick (clock, money, churn, events); legacy game/Phaser removed; pause on game popups; 9–5 office hours, nights, weekends, skip-to-morning |
| B | **Market reality** | Market size from the idea score; email returns shrink near saturation; leads go cold; churn from product health (bugs/tech debt, outages, support backlog, missing features); **Support** as a 5th task; tech debt that slows builds and triggers incidents; costs that scale with customers |
| C | **People** | Energy, stress, morale and **context** (company experience) per person; grind raises stress, idle/perks/weekends lower it; low morale → slower, more mistakes; burnout → notice → resignation; context makes veterans faster and losing them hurt; founder energy, night work costs energy, sleeping in bed restores |
| D | **Shop** | Per-location item slots (coffee machine, plants, PlayStation, table tennis, decor) placed in the room; bigger spaces have more slots; **setups** per seat from an XP laptop (2 GB RAM, 500 GB HDD) to a Mac — better setups = faster work, fewer mistakes |
| E | **Infra desktop** | macOS-style screen with service apps: hosting tiers with customer caps (free ≈ 20 customers → VPS → cloud), wifi, tools; over capacity → outages → churn; upgrading takes time |
| F | **Balance + polish** | Balance simulation across all systems (no strategy prints money; a careful player can win), tutorial cards introducing each system as it unlocks |

Process: each sub-project gets a short design review, is built fully (tsc + unit tests as gates, no browser checks by the agent), then the user tests from one table. Push/PR only at the very end.

## 3. Sub-project A — own engine + take over `/`

### 3.1 Engine
- v2 owns its state (`CompanyState` + the existing `v2` slice), a v2 Zustand store, and an hourly tick. 1 real second = 1 game hour at 1×.
- **Clock:** total hours → hour of day, day, weekday (day 0 = Monday).
- **Daily:** churn (simple monthly rate applied daily, visibly moving; B replaces it with product-health churn), metrics snapshot for charts.
- **Monthly (every 30 days):** payroll (all team salaries) + rent; month summary story line.
- **Game over:** cash < 0 → lost. Selling the company (Sell button / acquisition offers) still ends the game.
- **Events:** the event list is ported to v2 with v2-native effects, keeping today's v2 rules (stage gating, thinning, cost scaling, payout caps, suppression until Chapter 2). Effects that touched legacy employee morale are dropped until C.
- Legacy `employees` payroll mirror is removed: payroll comes from `v2.team` directly.

### 3.2 Office hours, nights, weekends
- Hires work **09:00–17:00, Monday–Friday**. At 17:00 they walk out the door and the room empties; at 09:00 they walk back in.
- Hire task durations are counted in **work hours** (1 work day = 8 h), so a "2-day" task takes two working days.
- The **founder** can work any hour, any day (energy cost arrives in C).
- **Night look:** after 18:00 the window darkens, lamps/laptop glow, light warms; morning returns to day light.
- **⏭ Skip to morning:** shown when no hire is at work; fast-forwards to 09:00 of the next work day (still running payroll/churn/events on the way).

### 3.3 Pause on popups
Game-raised popups (event cards, family money, chapter/result popups, sell offers) pause the game and restore the previous speed when dismissed. Sheets the player opens (Team, Metrics, person card, Founder) do not pause.

### 3.4 Taking over `/`
- `/` → landing page → v2 onboarding → v2 game. `/new` redirects to `/`.
- Delete the legacy game: Phaser office scene, legacy engine/store/save, legacy panels and components, the Phaser dependency, legacy tests.
- Keep: landing, blog, changelog, leaderboard, idea-rater pages, admin dashboard, server/Mongo analytics (game ids keep the `v2-` prefix).
- Reuse as data only: feature templates, candidate name pools, idea scoring, sound effects.
- v2-native copies of what v2 still needs: event card, metrics charts, runway banner, feature toasts, sell modal, post-mortem + leaderboard entry, investor check-in feedback, onboarding styling. Legacy milestone toasts are dropped (chapters/coach cards cover progression).

### 3.5 Saves
Fresh launch: the save shape changes, so old v2 saves and the old leaderboard are not loaded (new keys).

### 3.6 Testing and acceptance
- Unit tests: clock + office hours + weekends; work-hour task durations; payroll/rent; churn moves; game over; pause/resume rules; skip-to-morning; event port (gating/scaling still hold); save round-trip.
- Balance simulation rebuilt on the new engine (still reaches Co-working, never broke).
- Gates: `tsc`, `npm test`, `npm run build`; no Phaser/legacy engine imports remain; marketing pages still build.
- One manual test table for the user.

## 4. Sub-project B — market reality (approved 2026-10-02)

- **Market ceiling** by idea tier: promising 2,000 · competitive 1,200 · risky 700 · brutal 350 customers; ×(1 + 0.05 per shipped feature) ×(1 + brand/400). Email leads × max(0.1, 1 − (customers + leads)/ceiling). Feature customer gains and sales conversions never exceed the ceiling.
- **Conversion by tier:** sales base 0.30 / 0.25 / 0.20 / 0.15 + 0.03 × sales skill.
- **Leads go cold:** ~8% of uncalled leads lost per day (probabilistic rounding).
- **Product-health churn:** monthly churn = tier floor + bugs (techDebt/100 × 6) + support (min 8, backlog/customers × 40) + thin product (productProgress < 30 → up to +4) + shock. Event churn changes become a shock that fades 0.15/day. Metrics shows the breakdown.
- **Support (5th task):** tickets arrive daily ≈ customers × 0.03 × (1 + techDebt/100). Support (1 founder day, outreach skill) clears 8 + 2 × outreach tickets (mistake halves).
- **Tech debt bites:** builds take ×(1 + techDebt/100). Incidents: daily chance max(0, techDebt − 40)/600 → incident popup (lose ~3% customers, tickets flood in; choose "All hands" = −5 debt & −1 day of founder task, or "Ride it out" = +3 churn shock). Incidents happen from day one (not gated by chapters).
- **Refactor (6th task):** 2 founder days, build skill, −(12 + 2 × build) debt (mistake halves).
- **Scaling costs:** burn += 3% of MRR (payments) + $1 per customer (tools).
- Support/Refactor unlock after Chapter 1, are founder-bar buttons and hire assignments (standing: support when tickets ≥ 1, refactor when debt ≥ 5). Icons 🎧 / 🧹.

## 5. Sub-project C — people (built autonomously after the user asked for B→F in one go)

Each hire has **energy, stress, morale, context** (0–100):
- **Energy:** −5 per busy work hour, −1 per idle work hour; +50 overnight, full on weekend days. Below 30 the person is "running on empty": +1 stress per work hour.
- **Stress:** +0.35 per busy work hour, −1 per idle work hour, −2 overnight, −8 per weekend day, +2 per mistake. Perks (sub-project D) lower it.
- **Morale:** drifts 10%/day toward `75 − stress/2` (+ perk bonus in D); −2 per mistake.
- **Context** (company experience): +0.25 per busy work hour (≈50 work days to 100). Leaving loses it; a new hire starts at 0.
- **Effects:** work speed × (0.55 + 0.45·energy/100) × (0.8 + 0.4·morale/100) × (0.7 + 0.5·context/100); mistake chance × (1 + stress/100).
- **Burnout → notice → resignation:** stress ≥ 90 at the end of 3 work days in a row → they hand in notice and leave 5 days later. The person card offers **"Convince them to stay"**: +20% salary, stress → 40, notice withdrawn (once per person).
- **Founder energy:** −3 per working hour (any hour), +15 per hour sleeping (no task at night, in bed), +3 per idle day hour. Founder speed × (0.5 + 0.5·energy/100). Working nights is possible but you pay for it the next day.
- **UI:** person card bars (energy, stress, morale, context) and notice warning; hover card mood; head emoji 😫 (stress > 75) / 🥱 (energy < 25) override the task icon; founder energy in the founder bar; stats rail "stressed" count.
- Saves: older team members default to energy 100, stress 10, morale 70, context 0.

## 6. Sub-project D — shop (built autonomously)

A **🛒 Shop** tab (modal) with two sections.

**Perks** — bought once, placed in the room, kept when you move (only as many as the location has slots are active):

| Perk | Price | Effect |
|---|---|---|
| ☕ Coffee machine | $400 | Busy hours drain 20% less energy |
| 🪴 Plants | $120 | Morale target +3 |
| 🖼️ Decor | $200 | Morale target +2, stress −0.1/work hour |
| 🛋️ Sofa | $700 | +12 energy overnight |
| 🎮 Game corner | $1,500 | Idle work hours lower stress 2× as fast; morale target +4 |
| 🏓 Table tennis | $1,800 | Stress −0.3/work hour; morale target +5 |

Slots: bedroom 1 · bigger home 2 · villa 3 · co-working 3 · small office 4 · big office 5 · building 6. Perks have spots in each room (a perk row in generated rooms, one spot in the bedroom); bought perks appear there.

**Setups** — the computer at each desk (founder + every seat), upgraded per desk; kept at the desk when people come and go and when you move:

| Tier | Machine | Price | Speed | Mistakes |
|---|---|---|---|---|
| 1 | Old laptop — Windows XP, 2 GB RAM, 500 GB HDD | (start) | ×0.85 | ×1.2 |
| 2 | Office laptop — 8 GB RAM, SSD | $800 | ×1.0 | ×1.0 |
| 3 | Dev workstation — 16 GB, SSD, second monitor | $2,000 | ×1.15 | ×0.9 |
| 4 | MacBook Pro | $3,500 | ×1.3 | ×0.8 |

Tier 3+ desks show a monitor next to the laptop. Buying is blocked when cash < price.

## 7. Sub-project E — infra desktop (built autonomously)

A **💻 Infra** tab (unlocked with Chapter 1) opens a macOS-style desktop: menu bar with the clock, a dock of apps, one window per app. Services are monthly costs added to burn.

**🖥️ Hosting** — every product needs it; customers beyond capacity overload it:

| Tier | Plan | $/mo | Capacity | Migration |
|---|---|---|---|---|
| 1 | Free tier | 0 | 20 customers | — |
| 2 | Shared VPS | 50 | 150 | 1 day |
| 3 | Dedicated server | 300 | 600 | 2 days |
| 4 | Cloud cluster | 1,200 | 2,500 | 3 days |
| 5 | Global CDN + autoscaling | 4,000 | 10,000 | 4 days |

- Upgrading starts a **migration** that takes the listed days; the new price applies at once, the new capacity when it finishes. You can't stack migrations.
- Above 90% load: +1% churn ("the app feels slow"). Above 100%: a daily **outage** chance of min(50%, (load − 1) × 0.8 + 5%) → lose 2% of customers, tickets flood in, and an Outage popup ("Status page and apologies" = +2 churn shock / "Credit affected customers" = pay a month of their ARPU, no shock).

**📶 Wi-Fi** — Home Wi-Fi (free, ×1.0) · Fiber ($80/mo, work speed ×1.05) · Business fiber ($250/mo, ×1.1). Applies to everyone.

**🧰 Tools** — Helpdesk ($100/mo, Support clears 50% more tickets) · Monitoring ($150/mo, incidents and outages 40% less likely) · CI/CD ($200/mo, builds 10% faster, build mistakes ×0.7).

The stats rail shows hosting load; the Metrics churn breakdown adds "Slow app".
