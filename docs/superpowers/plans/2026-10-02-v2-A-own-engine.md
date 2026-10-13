# v2 Sub-project A — Own Engine + Take Over `/` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** v2 runs on its own state/store/tick with office hours, nights, weekends and pause-on-popups, and replaces the legacy game at `/`.

**Architecture:** New `src/v2/engine/` (company state, clock, money, feature effects, events, tick) and `src/v2/store.ts`. Existing v2 modules switch from legacy `GameState`/`useGameStore` to `CompanyState`/the v2 store, keeping field names so the change is mostly types. Legacy game code is deleted last, once nothing imports it.

**Tech Stack:** React 18, Zustand 5, R3F 8, TS 5.7, vitest.

**Spec:** `docs/superpowers/specs/2026-10-02-v2-launch-roadmap-design.md` §3.

## Global Constraints

- No push. No AI attribution in commits. Zustand selectors return stored refs/primitives only.
- Verification: `npx tsc --noEmit -p .` + `npx vitest run` (+ `npm run build` at the end). No Playwright runs; the user tests from a table.
- Keep landing/blog/changelog/leaderboard/idea-rater/admin pages and server analytics working.

## Review Focus

1. **A task that spans 17:00** → hire progress stops at 17:00 and resumes at 09:00 (or Monday), never lost or doubled.
2. **Skip to morning across a month boundary** → payroll/rent/churn/events still happen; an event raised mid-skip stops the skip.
3. **Event popup during skip or at 5×** → game pauses; dismiss restores the previous speed (not 1×).
4. **Founder working at night** → founder progresses; hires don't; room shows the night look.
5. **Old v2 save in localStorage** → ignored cleanly (new keys), no crash.

---

### Task 1: Engine core (pure, not yet wired)
- Create `src/v2/engine/company.ts` (`CompanyState` with the legacy field names v2 uses: phase, startupName, idea, ideaScore, ideaFeedback, difficultyModifier, gameId, gameTime, cash, mrr, arpu, customers, churnRate, brand, techDebt, productProgress, features, featureRoadmap, featureRoadmapIndex, rent (was infraCostMonthly), storyLog, metricsHistory, fullMetricsHistory, recentFeatureResults, pendingEvent, usedEventIds, lastEventDay, decisionHistory, equity, investorInterest, soldAt, lastConfig), `createCompany(config)`.
- `src/v2/engine/clock.ts`: hourOfDay, day, weekday, isWorkHour(totalHours), nextWorkStart(totalHours).
- `src/v2/engine/money.ts`: monthlyBurn (rent + team salaries), runwayMonths, valuation.
- `src/v2/engine/features.ts`: port `estimateFeatureEffects`.
- `src/v2/engine/events.ts`: port the event list + pickEvent + applyEventChoice onto `CompanyState` (employee-morale effects dropped).
- `src/v2/engine/tick.ts`: `tickHour(state, rng)` — clock, daily churn/cash accrual/snapshot/event roll, monthly summary, game over; then the existing v2 layer.
- Tests: clock/office-hour math, money, churn moves, game over, event pick/apply, month boundary.

### Task 2: Switch v2 onto the engine + store
- `src/v2/store.ts` (Zustand) replaces legacy `useGameStore` in `actions.ts` and every component; `V2GameState = CompanyState & { v2 }`.
- Remove the legacy `employees` payroll mirror (`syncPayroll` → departures come only from v2 events; hires/fires touch only `v2.team`).
- `saveV2.ts` new keys (`startup-v2-save-*`), old keys ignored.
- Update all v2 tests to the new state; delete tests of removed behaviour (mirror inertness).

### Task 3: Office hours, nights, weekends, skip to morning
- Engine: hires progress only when `isWorkHour`; founder always. `skipToMorning(state, rng)` steps hours until the next work start, stopping early on a pending event or game over.
- Scene: hires walk to a door spot at 17:00 and are hidden off-hours; return at 09:00. Night look (window dark, lamp/laptop glow, warmer light) 18:00–07:00.
- UI: ⏭ Skip to morning button when no hire is at work; clock in the top bar.
- Tests: spans-17:00 task, weekend, skip across a month boundary, skip stops on event.

### Task 4: Pause on popups
- Pause helper: game-raised popups (event card, family money, sell offer, result popups) set speed 0 and remember the previous speed; dismiss restores it. Player-opened sheets don't pause.
- Tests: pause/resume keeps 5×; two popups in a row; dismiss without a remembered speed → 1×.

### Task 5: v2-native UI copies
- Copy into `src/v2/ui/`: EventCard, Metrics charts panel, RunwayBanner, FeatureResultToasts, SellCompanyModal, PostMortem (+ v2 leaderboard entry), InvestorCheckin feedback, onboarding styles. Drop milestone toasts.
- Tests: leaderboard entry on game end; post-mortem lines from v2 state.

### Task 6: Take over `/` and delete legacy
- Router: `/` → landing → v2 game; `/new` → redirect `/`. Delete legacy App/game components, Phaser office, legacy engine/store/save, legacy tests, unused data; remove `phaser` from package.json.
- Keep marketing pages/admin/analytics; point leaderboard page at the v2 leaderboard.
- Gate: no import of deleted modules; `npm run build` passes.

### Task 7: Balance sim + gates + review
- Rebuild `balance.test.ts` on the new engine (office hours make hires work 8/24 h — tune task speeds/numbers if the sim fails; ruling).
- tsc, tests, build; fresh opus static review; one fix pass; test table.
