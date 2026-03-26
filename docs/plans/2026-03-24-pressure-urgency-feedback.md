# Pressure & Urgency Feedback — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the game feel harder and more stressful by surfacing painful information more aggressively — without changing core rules.

**Architecture:** Four independent feature slices that all flow through the same data pipeline: types → engine → store → components. State shape changes in `types/index.ts` propagate through `gameEngine.ts` into the Zustand store and finally into new/modified React components. One new component (`RunwayBanner`) and one new component (`CampaignResultToast`) are added; the rest are modifications to existing files.

**Tech Stack:** Vite + React 18 + TypeScript + Zustand

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/types/index.ts` | Modify | Add `customersLostLastMonth`, `recentCampaignResults`, `CampaignResult` type |
| `src/engine/gameEngine.ts` | Modify | Churn tracking, campaign luck formula, event frequency, campaign result recording |
| `src/store/gameStore.ts` | Modify | Wire new state fields, add `dismissCampaignToast` action |
| `src/components/StoryLog.tsx` | Modify | Red styling for churn log entries |
| `src/components/StoryLog.css` | Modify | `.story-line--churn` class |
| `src/components/TopBar.css` | Modify | Larger delta badge for customer drops |
| `src/components/RunwayBanner.tsx` | **Create** | Runway pressure banner component |
| `src/components/RunwayBanner.css` | **Create** | Runway banner styles + animations |
| `src/components/CampaignResultToast.tsx` | **Create** | Campaign completion toast component |
| `src/components/CampaignResultToast.css` | **Create** | Toast styles (reuses `.op-` pattern from EventCard) |
| `src/App.tsx` | Modify | Insert `RunwayBanner` and `CampaignResultToast` |
| `src/App.css` | Modify | Adjust `.game-main` margin to accommodate banner |

---

## Task 1: State Shape Changes (`types/index.ts`)

All other tasks depend on this one. Do it first.

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add `CampaignResult` interface**

After the `ActiveCampaign` interface (~line 53), add:

```typescript
export interface CampaignResult {
  name: string
  gained: number
  expectedMin: number
  expectedMax: number
  completedAtDay: number
}
```

- [ ] **Step 2: Extend `StoryEntry` with optional tag**

Change the `StoryEntry` interface from:

```typescript
export interface StoryEntry {
  day: number
  lines: string[]
}
```

to:

```typescript
export interface StoryEntry {
  day: number
  lines: string[]
  tags?: string[]
}
```

The `tags` array is parallel to `lines` — `tags[i]` is an optional CSS class hint for `lines[i]`. Entries without a tag render normally. This avoids changing every place that creates a `StoryEntry`.

- [ ] **Step 3: Add new fields to `GameState`**

Inside the `GameState` interface, add these fields. Place them logically near the sections they relate to.

After `churnRate: number` (~line 170):

```typescript
customersLostLastMonth: number
```

After `completedCampaignIds: string[]` (~line 201):

```typescript
recentCampaignResults: CampaignResult[]
```

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add CampaignResult, customersLostLastMonth, StoryEntry tags"
```

---

## Task 2: Engine — Churn Visibility (`gameEngine.ts`, part 1)

**Files:**
- Modify: `src/engine/gameEngine.ts`

- [ ] **Step 1: Initialize new state fields in `createInitialState`**

In `createInitialState` (around line 34), add to the returned object:

```typescript
customersLostLastMonth: 0,
recentCampaignResults: [],
```

Place `customersLostLastMonth: 0` after `churnRate: ...` (line 45) and `recentCampaignResults: []` after `completedCampaignIds: []` (line 66).

- [ ] **Step 2: Add the import for CampaignResult**

Update the import on line 1:

```typescript
import type { GameState, Employee, Feature, GameEvent, GameTime, ActiveCampaign, CampaignResult, MetricsSnapshot, OnboardingConfig, MilestoneToastEntry } from '../types'
```

- [ ] **Step 3: Track monthly churn in `processMonthTick`**

The current `processMonthTick` (line 484) only writes a story summary. The daily churn is calculated in `processDayTick` but never aggregated monthly.

We need a running total. The simplest approach: use the daily `churned` variable that already exists in `processDayTick` (line 404). Accumulate it into a temporary counter that resets on month boundaries.

**In `processDayTick`** (around line 404-405), after `const churned = Math.floor(newCustomers * dailyChurnRate)`:

Replace the block that's currently just:
```typescript
const churned        = Math.floor(newCustomers * dailyChurnRate)
newCustomers = Math.max(0, newCustomers - churned)
```

With:
```typescript
const churned        = Math.floor(newCustomers * dailyChurnRate)
newCustomers = Math.max(0, newCustomers - churned)

const customersLostLastMonth = s.customersLostLastMonth + churned
```

Then in the `nextState` object (line 457), add `customersLostLastMonth` to carry it forward:

```typescript
customersLostLastMonth,
```

**In `processMonthTick`** (line 484), add the churn story entry and reset the counter:

Replace the current function body:

```typescript
function processMonthTick(state: GameState, month: number): GameState {
  const totalSalaries = state.employees.reduce((sum, e) => sum + e.salary, 0)
  const totalBurn     = totalSalaries + state.infraCostMonthly
  const netMonthly    = state.mrr - totalBurn

  const lines = [
    `Month ${month}: MRR $${state.mrr.toLocaleString()} · Burn $${totalBurn.toLocaleString()} · Net ${netMonthly >= 0 ? '+' : ''}$${netMonthly.toLocaleString()}/mo`,
  ]

  return {
    ...state,
    storyLog: [{ day: totalDays(state.gameTime), lines }, ...state.storyLog].slice(0, 20),
  }
}
```

With:

```typescript
function processMonthTick(state: GameState, month: number): GameState {
  const totalSalaries = state.employees.reduce((sum, e) => sum + e.salary, 0)
  const totalBurn     = totalSalaries + state.infraCostMonthly
  const netMonthly    = state.mrr - totalBurn

  const lines: string[] = [
    `Month ${month}: MRR $${state.mrr.toLocaleString()} · Burn $${totalBurn.toLocaleString()} · Net ${netMonthly >= 0 ? '+' : ''}$${netMonthly.toLocaleString()}/mo`,
  ]
  const tags: string[] = ['']

  const lost = state.customersLostLastMonth
  if (lost > 0) {
    lines.push(`📉 Lost ${lost} customer${lost !== 1 ? 's' : ''} to churn this month`)
    tags.push('churn')
  }

  return {
    ...state,
    customersLostLastMonth: 0,
    storyLog: [{ day: totalDays(state.gameTime), lines, tags }, ...state.storyLog].slice(0, 20),
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/engine/gameEngine.ts
git commit -m "feat(engine): track monthly churn and surface it in story log"
```

---

## Task 3: Engine — Campaign Luck Formula (`gameEngine.ts`, part 2)

**Files:**
- Modify: `src/engine/gameEngine.ts`

- [ ] **Step 1: Change the campaign completion formula**

In `processDayTick`, the campaign completion block (around lines 288-295) currently calculates:

```typescript
const gained  = Math.round(
  (camp.expectedMin + spread * quality * (0.8 + Math.random() * 0.4)) * campEff
)
```

Replace that single line with:

```typescript
const luck   = 0.2 + Math.random() * 1.1
const gained = Math.round(
  (camp.expectedMin + spread * quality * luck) * campEff
)
```

This changes the multiplier range from `0.8–1.2` (tight, always decent) to `0.2–1.3` (wide, sometimes terrible).

- [ ] **Step 2: Record campaign results**

Immediately after the `gained` calculation and `newCustomers` update (around line 298), add campaign result recording:

```typescript
const result: CampaignResult = {
  name:           camp.name,
  gained,
  expectedMin:    camp.expectedMin,
  expectedMax:    camp.expectedMax,
  completedAtDay: day,
}
s = {
  ...s,
  recentCampaignResults: [result, ...s.recentCampaignResults].slice(0, 3),
}
```

Make sure this goes **before** the `storyLines.push(...)` call for the campaign.

- [ ] **Step 3: Carry `recentCampaignResults` through to `nextState`**

In the `nextState` object (around line 457), add:

```typescript
recentCampaignResults: s.recentCampaignResults,
```

(Since `s` is reassigned multiple times in the function, we need to make sure the latest value makes it into the final return.)

- [ ] **Step 4: Commit**

```bash
git add src/engine/gameEngine.ts
git commit -m "feat(engine): widen campaign luck range (0.2–1.3) and record results"
```

---

## Task 4: Engine — Events More Frequent (`gameEngine.ts`, part 3)

**Files:**
- Modify: `src/engine/gameEngine.ts`

- [ ] **Step 1: Change event cooldown and trigger probability**

In `processDayTick`, line 416 currently reads:

```typescript
if (!pendingEvent && daysSinceLast >= 7 && Math.random() < 0.4) {
```

Change to:

```typescript
if (!pendingEvent && daysSinceLast >= 5 && Math.random() < 0.55) {
```

That's it — cooldown 7→5, probability 40%→55%.

- [ ] **Step 2: Commit**

```bash
git add src/engine/gameEngine.ts
git commit -m "feat(engine): increase event frequency (cooldown 5d, 55% trigger)"
```

---

## Task 5: Store — Wire New State (`gameStore.ts`)

**Files:**
- Modify: `src/store/gameStore.ts`

- [ ] **Step 1: Add `dismissCampaignResult` action**

The store needs a way for the toast component to remove a campaign result after it auto-dismisses.

Add to the `GameStore` interface (after `dismissMilestoneToast`):

```typescript
dismissCampaignResult: (completedAtDay: number) => void
```

Add the implementation (after `dismissMilestoneToast`):

```typescript
dismissCampaignResult: (completedAtDay) =>
  set((s) => ({
    recentCampaignResults: s.recentCampaignResults.filter(r => r.completedAtDay !== completedAtDay),
  })),
```

- [ ] **Step 2: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat(store): add dismissCampaignResult action"
```

---

## Task 6: StoryLog — Churn Styling (`StoryLog.tsx` + `StoryLog.css`)

**Files:**
- Modify: `src/components/StoryLog.tsx`
- Modify: `src/components/StoryLog.css`

- [ ] **Step 1: Use the `tags` array for conditional CSS classes**

In `StoryLog.tsx`, the line rendering (line 17) currently reads:

```tsx
<p key={j} className="story-line">{line}</p>
```

Change to:

```tsx
<p key={j} className={`story-line${entry.tags?.[j] ? ` story-line--${entry.tags[j]}` : ''}`}>{line}</p>
```

- [ ] **Step 2: Add churn CSS class**

In `StoryLog.css`, add at the end:

```css
/* Churn entries — red highlight */
.story-line--churn {
  color: var(--red);
  font-weight: 600;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/StoryLog.tsx src/components/StoryLog.css
git commit -m "feat(story-log): red-styled churn entries via tags system"
```

---

## Task 7: TopBar — Bigger Customer Delta (`TopBar.css`)

**Files:**
- Modify: `src/components/TopBar.css`

- [ ] **Step 1: Make the floating delta badge larger and bolder**

Currently `.tb-delta` has `font-size: 0.58rem`. Change the entire `.tb-delta` rule (lines 185-196) to:

```css
.tb-delta {
  position: absolute;
  bottom: calc(100% + 2px);
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.72rem;
  font-weight: 800;
  font-family: 'Roboto Mono', monospace;
  pointer-events: none;
  white-space: nowrap;
  animation: delta-float 1.4s ease-out forwards;
  text-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
```

Changes: `font-size` 0.58→0.72rem, `font-weight` 700→800, animation duration 1s→1.4s, added `text-shadow`.

Also make the float animation travel further. Replace the `@keyframes delta-float` (lines 201-205):

```css
@keyframes delta-float {
  0%   { opacity: 1;   transform: translateX(-50%) translateY(0); }
  30%  { opacity: 1;   transform: translateX(-50%) translateY(-8px); }
  100% { opacity: 0;   transform: translateX(-50%) translateY(-22px); }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TopBar.css
git commit -m "feat(topbar): make metric delta badges larger and more visible"
```

---

## Task 8: RunwayBanner Component (new)

**Files:**
- Create: `src/components/RunwayBanner.tsx`
- Create: `src/components/RunwayBanner.css`

- [ ] **Step 1: Create `RunwayBanner.tsx`**

```tsx
import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { getRunwayMonths } from '../engine/gameEngine'
import './RunwayBanner.css'

const LS_KEY = 'startup-runway-dismissed'

export function RunwayBanner() {
  const state   = useGameStore(s => s)
  const runway  = getRunwayMonths(state)

  const [dismissed, setDismissed] = useState<number | null>(() => {
    const stored = sessionStorage.getItem(LS_KEY)
    return stored ? Number(stored) : null
  })

  const prevRunway = useRef(runway)

  useEffect(() => {
    if (runway < prevRunway.current && runway <= 3) {
      setDismissed(null)
      sessionStorage.removeItem(LS_KEY)
    }
    prevRunway.current = runway
  }, [runway])

  if (runway > 3) return null
  if (dismissed !== null && dismissed <= runway) return null

  function handleDismiss() {
    setDismissed(runway)
    sessionStorage.setItem(LS_KEY, String(runway))
  }

  let level: 'warn' | 'danger' | 'critical'
  let icon: string
  let message: string

  if (runway >= 3) {
    level = 'warn'
    icon = '⚠️'
    message = '3 months of runway left'
  } else if (runway >= 2) {
    level = 'danger'
    icon = '🔥'
    message = '2 months of runway left. Pick up the pace.'
  } else {
    level = 'critical'
    icon = '💀'
    message = '1 month of runway. Emergency mode.'
  }

  return (
    <div className={`runway-banner rb-${level}`}>
      <span className="rb-text">{icon} {message}</span>
      <button className="rb-dismiss" onClick={handleDismiss} title="Dismiss">×</button>
    </div>
  )
}
```

- [ ] **Step 2: Create `RunwayBanner.css`**

```css
.runway-banner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  font-size: 0.78rem;
  font-weight: 700;
  font-family: 'Roboto', sans-serif;
  z-index: 9;
  flex-shrink: 0;
}

.rb-text {
  letter-spacing: 0.01em;
}

.rb-dismiss {
  position: absolute;
  right: 1.2rem;
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.15s;
  line-height: 1;
  padding: 0 0.3rem;
}

.rb-dismiss:hover {
  opacity: 1;
}

/* 3 months — amber/yellow */
.rb-warn {
  background: var(--yellow);
  color: #422006;
}

.rb-warn .rb-dismiss { color: #422006; }

/* 2 months — orange, pulsing */
.rb-danger {
  background: var(--orange);
  color: #431407;
  animation: rb-pulse 1.5s ease-in-out infinite;
}

.rb-danger .rb-dismiss { color: #431407; }

/* 1 month — red, pulsing + shake */
.rb-critical {
  background: var(--red);
  color: #fff;
  animation: rb-shake 0.4s ease-in-out infinite;
}

.rb-critical .rb-dismiss { color: #fff; }

@keyframes rb-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.75; }
}

@keyframes rb-shake {
  0%, 100% { transform: translateX(0); opacity: 1; }
  15%      { transform: translateX(-2px); }
  30%      { transform: translateX(2px); }
  45%      { transform: translateX(-1px); }
  60%      { transform: translateX(1px); }
  75%      { transform: translateX(0); opacity: 0.85; }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/RunwayBanner.tsx src/components/RunwayBanner.css
git commit -m "feat: add RunwayBanner component (3/2/1 month thresholds)"
```

---

## Task 9: CampaignResultToast Component (new)

**Files:**
- Create: `src/components/CampaignResultToast.tsx`
- Create: `src/components/CampaignResultToast.css`

- [ ] **Step 1: Create `CampaignResultToast.tsx`**

This reuses the outcome popup pattern from `EventCard.tsx` — fixed overlay, auto-dismiss timer, `.op-` style diff badges.

```tsx
import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import type { CampaignResult } from '../types'
import './CampaignResultToast.css'

function gradeResult(r: CampaignResult): { tone: 'great' | 'ok' | 'poor'; label: string } {
  const greatThreshold = r.expectedMax * 0.85
  const okThreshold    = r.expectedMin * 0.5

  if (r.gained >= greatThreshold) return { tone: 'great', label: 'Great result!' }
  if (r.gained >= okThreshold)    return { tone: 'ok',    label: 'Mediocre result' }
  return { tone: 'poor', label: 'Campaign flopped' }
}

function Toast({ result, onDismiss }: { result: CampaignResult; onDismiss: () => void }) {
  const { tone, label } = gradeResult(result)

  useEffect(() => {
    const id = setTimeout(onDismiss, 4000)
    return () => clearTimeout(id)
  }, [onDismiss])

  return (
    <div className={`crt-toast crt-toast--${tone}`} onClick={onDismiss}>
      <div className="crt-icon">
        {tone === 'great' ? '🎉' : tone === 'ok' ? '😐' : '💥'}
      </div>
      <div className="crt-body">
        <div className="crt-name">{result.name}</div>
        <div className="crt-label">{label}</div>
        <div className="crt-stats">
          <span className={`crt-gained crt-gained--${tone}`}>+{result.gained} users</span>
          <span className="crt-expected">
            (expected {result.expectedMin}–{result.expectedMax})
          </span>
        </div>
      </div>
    </div>
  )
}

export function CampaignResultToasts() {
  const results = useGameStore(s => s.recentCampaignResults)
  const dismiss = useGameStore(s => s.dismissCampaignResult)

  if (results.length === 0) return null

  const latest = results[0]

  return (
    <div className="crt-container">
      <Toast
        key={latest.completedAtDay}
        result={latest}
        onDismiss={() => dismiss(latest.completedAtDay)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create `CampaignResultToast.css`**

```css
.crt-container {
  position: fixed;
  top: 108px;
  right: 1.5rem;
  z-index: 90;
  pointer-events: none;
}

.crt-toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.85rem 1rem;
  width: 280px;
  cursor: pointer;
  animation: crt-slide-in 0.25s ease;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.05);
  border-left-width: 3px;
}

.crt-toast--great { border-left-color: var(--green); }
.crt-toast--ok    { border-left-color: var(--yellow); }
.crt-toast--poor  { border-left-color: var(--red); }

@keyframes crt-slide-in {
  from { transform: translateX(20px); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}

.crt-icon {
  font-size: 1.3rem;
  line-height: 1;
  flex-shrink: 0;
  padding-top: 0.1rem;
}

.crt-body {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.crt-name {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
}

.crt-label {
  font-size: 0.72rem;
  font-weight: 600;
}

.crt-toast--great .crt-label { color: var(--green); }
.crt-toast--ok    .crt-label { color: var(--yellow); }
.crt-toast--poor  .crt-label { color: var(--red); }

.crt-stats {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.15rem;
}

.crt-gained {
  font-size: 0.75rem;
  font-weight: 700;
  font-family: 'Roboto Mono', monospace;
  padding: 0.12rem 0.5rem;
  border-radius: 20px;
}

.crt-gained--great {
  color: var(--green);
  background: rgba(var(--success-rgb), 0.1);
}

.crt-gained--ok {
  color: var(--yellow);
  background: rgba(245, 158, 11, 0.1);
}

.crt-gained--poor {
  color: var(--red);
  background: rgba(var(--error-rgb), 0.08);
}

.crt-expected {
  font-size: 0.65rem;
  color: var(--muted);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/CampaignResultToast.tsx src/components/CampaignResultToast.css
git commit -m "feat: add CampaignResultToast (great/ok/poor grading)"
```

---

## Task 10: App Layout Integration (`App.tsx` + `App.css`)

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Import and place new components in `App.tsx`**

Add imports after the existing imports (line 11):

```typescript
import { RunwayBanner } from './components/RunwayBanner'
import { CampaignResultToasts } from './components/CampaignResultToast'
```

In the `GameScreen` JSX return (starting line 65), insert `RunwayBanner` between `TopBar` and `game-main`, and `CampaignResultToasts` alongside `EventCard`:

Change the return from:

```tsx
return (
  <div className="game-root">
    <TopBar />
    <div className="game-main">
      <div className="game-canvas-area">
        <OfficeCanvas />
        <BottomNav active={activePanel} onTabClick={handleTabClick} />
      </div>
      <RightPanel activePanel={activePanel} />
    </div>
    <EventCard />
    {showTutorial && <TutorialModal onClose={handleTutorialClose} />}
    <MilestoneToastQueue toasts={pendingMilestoneToasts} onDismiss={dismissMilestoneToast} />
  </div>
)
```

to:

```tsx
return (
  <div className="game-root">
    <TopBar />
    <RunwayBanner />
    <div className="game-main">
      <div className="game-canvas-area">
        <OfficeCanvas />
        <BottomNav active={activePanel} onTabClick={handleTabClick} />
      </div>
      <RightPanel activePanel={activePanel} />
    </div>
    <EventCard />
    <CampaignResultToasts />
    {showTutorial && <TutorialModal onClose={handleTutorialClose} />}
    <MilestoneToastQueue toasts={pendingMilestoneToasts} onDismiss={dismissMilestoneToast} />
  </div>
)
```

- [ ] **Step 2: No CSS changes needed**

The current `.game-main` has `margin-top: 96px` to account for the fixed TopBar. The `RunwayBanner` is **not** fixed — it sits in the normal flow of `.game-root` (which is `display: flex; flex-direction: column`). Since `.game-main` uses `flex: 1; min-height: 0`, the banner will naturally push the main area down when present and take no space when absent. However, `.game-main` currently has a fixed `margin-top: 96px` which is for the fixed TopBar.

Actually, looking at the CSS more carefully: `.top-bar` is `position: fixed` so it's out of flow. The `margin-top: 96px` on `.game-main` compensates. The `RunwayBanner` would sit between them in flex flow but below the TopBar's 96px margin.

The `.game-root` is `display: flex; flex-direction: column` — but the TopBar is `position: fixed`, so the first in-flow child is now the `RunwayBanner`. We need the banner to appear **below** the fixed TopBar.

Change `src/App.css` `.game-main` margin-top comment: actually this is fine — the banner should have its own top margin to sit below the fixed TopBar, and game-main should only offset when there's no banner.

Simpler approach: make the RunwayBanner also have `margin-top: 96px` and remove it from game-main when banner is present. But that couples them.

**Best approach:** Add a spacer div that always pushes content below the fixed TopBar, and let both banner and game-main be normal flow children.

Replace the current `margin-top: 96px` on `.game-main` with a spacer approach. In `App.css`:

Change:
```css
.game-main {
  display: flex;
  flex: 1;
  min-height: 0;
  margin-top: 96px;
}
```

to:

```css
.game-topbar-spacer {
  flex-shrink: 0;
  height: 96px;
}

.game-main {
  display: flex;
  flex: 1;
  min-height: 0;
}
```

And in `App.tsx`, the JSX becomes:

```tsx
return (
  <div className="game-root">
    <TopBar />
    <div className="game-topbar-spacer" />
    <RunwayBanner />
    <div className="game-main">
      <div className="game-canvas-area">
        <OfficeCanvas />
        <BottomNav active={activePanel} onTabClick={handleTabClick} />
      </div>
      <RightPanel activePanel={activePanel} />
    </div>
    <EventCard />
    <CampaignResultToasts />
    {showTutorial && <TutorialModal onClose={handleTutorialClose} />}
    <MilestoneToastQueue toasts={pendingMilestoneToasts} onDismiss={dismissMilestoneToast} />
  </div>
)
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx src/App.css
git commit -m "feat(app): integrate RunwayBanner and CampaignResultToasts into layout"
```

---

## Task 11: Verify Build

- [ ] **Step 1: Run the TypeScript compiler**

```bash
npx tsc --noEmit
```

Expected: no errors. If there are errors, they'll be about the new state fields not being initialized somewhere — fix any missed initializations.

- [ ] **Step 2: Run the dev server and verify visually**

```bash
npm run dev
```

Check:
- Start a new game, advance time
- Verify churn entries appear red in story log at month boundaries
- Verify RunwayBanner appears when cash gets low (runway ≤ 3)
- Launch a campaign, let it complete, verify the toast appears
- Events should fire more frequently (~every 6-7 days instead of ~10)

- [ ] **Step 3: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address build/runtime issues from pressure feedback features"
```

---

## Implementation Order Summary

```
Task 1  (types)         — must be first, everything depends on it
Task 2  (engine: churn) ─┐
Task 3  (engine: campaigns) ├─ can be done in any order after Task 1
Task 4  (engine: events)    ─┘
Task 5  (store)          — after Tasks 2-4 (needs new state fields wired)
Task 6  (StoryLog UI)   — after Task 2 (needs tags in StoryEntry)
Task 7  (TopBar CSS)     — independent, can be done anytime
Task 8  (RunwayBanner)   — independent of engine changes
Task 9  (CampaignToast)  — after Task 3 + 5 (needs recentCampaignResults + dismiss action)
Task 10 (App layout)     — after Tasks 8 + 9 (imports them)
Task 11 (verify)         — last
```

Critical path: **1 → 3 → 5 → 9 → 10 → 11**

Parallelizable after Task 1: Tasks 2/3/4 (engine changes), Tasks 7/8 (CSS-only or independent component).
