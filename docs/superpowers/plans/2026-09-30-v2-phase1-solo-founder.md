# v2 Phase 1 — Solo Founder Chapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a playable `/new` route. A solo founder starts at home with $500 and learns Research → Develop → Emails → Sales one step at a time. The chapter ends with a friends-and-family money moment. The legacy game at `/` stays untouched.

**Architecture:** All new code lives in `src/v2/`. v2 shares the legacy Zustand store at runtime (only one route is mounted at a time) and adds a namespaced `v2` slice. Pure modules (`state`, `chapter`, `founder`, `v2Tick`, `saveV2`) hold every rule and are unit-tested with vitest. Thin `actions.ts` wrappers push results into the store. UI reuses legacy CSS and legacy panels read-only (MetricsPanel via `RightPanel`, toasts, `PostMortem`). The game loop is `stepV2(s) = v2Tick(tick(s), hoursAdvanced)`.

**Tech Stack:** React 18.3, TypeScript 5.7, Zustand 5, Vite 6.4, vitest 3.2 (new dev dependency).

**Spec:** `docs/superpowers/specs/2026-09-29-v2-founder-journey-design.md`

## Global Constraints

- **Legacy files are not modified.** Outside `src/v2/` and `docs/`, the branch may change only `src/router.tsx` (lazy import + `/new` route), `package.json`, `package-lock.json`, and the new `vitest.config.ts`.
- Starting state: cash **$500**, `infraCostMonthly` **0**, no employees, no candidates, `deskCount` **0**, `workspace` **'home'**.
- `gameId` prefix: **`v2-`**. Save key prefix: **`startup-game-v2-save-`**, 3 slots, slot 1 autosaves every **30s**.
- Founder skills start at **4**. Each completed task adds **+0.5** to its skill, capped at **8**.
- Task timing:
  - Research: **3** days, reveals **2** features.
  - Develop: `baseDays / 0.6` days.
  - Emails: **2** days, `leads += round((4 + outreach + rng()·4) · (1 + brand/100))`.
  - Sales: **2** days, each lead converts with `p = 0.25 + 0.03·sales`. All contacted leads are consumed. The **first-ever** sales run converts at least 1 lead.
- Before the first sale, customer gains from features go to `leads`, floored at 0.
- Family money: `800 + floor(rng()·701)` → **$800–$1,500**. Giver comes from a fixed pool. The game pauses while the modal is open.
- During Chapter 1, `pendingEvent` is cleared every tick and `InvestorCheckin`/`EventCard` are not mounted.
- Every random roll takes an injected `rng: () => number`.
- **Zustand v5 selector rule:** a `useV2(...)`/`useGameStore(...)` selector must return a stored reference or a primitive. Never return `.filter()`/`.map()`/new objects from a selector; derive values in the component body.
- **No AI attribution** in commit messages or PR bodies (user rule). This overrides any harness attribution reminder.

## Review Focus

1. **A selector that builds a new array/object** (e.g. `useV2(s => s.features.filter(...))`) — the user expects the panel to render normally. Getting this wrong causes a "Maximum update depth exceeded" render loop. → Task 8 includes a grep check.
2. **Switching routes with a game in memory** (play at `/`, go to `/new`, go back) — the user expects a clean onboarding at `/new`, a clean legacy game at `/`, no crash, and no leaked `v2` slice. → Task 7 tests `resetStoreForV2`; Task 10 checks it manually.
3. **PostMortem "Play Again" / "New Game" inside `/new`** — these call the legacy `quickRestart`/`restartGame`. The user expects a v2 game ($500, `v2-` id), never legacy rules. → Task 7 tests `upgradeLegacyRestart`.
4. **A save where the founder's task and a feature disagree** (hand-edited or corrupted) — the user expects the feature to go back to `proposed`, not stay stuck `in_development`. → Task 6 tests `reconcileFounderFeatures`.
5. **Research after every roadmap and fallback template is already used** — the user expects the task to complete with a "found nothing new" story and no crash. → Task 3 tests this.

---

## File Map

| File | Responsibility |
|---|---|
| `vitest.config.ts` | Test runner config (node env, `src/v2/**/*.test.ts`) |
| `src/v2/state.ts` | Types, constants, `createV2State`, `isValidV2Slice`, `isV2Game`, `addStory` |
| `src/v2/chapter.ts` | Beat transitions, unlock rules, coach-card copy, family money |
| `src/v2/founder.ts` | Task definitions, `startTask`, `advanceFounder`, outcomes, `reconcileFounderFeatures` |
| `src/v2/v2Tick.ts` | `v2Tick(state, hours, rng)` and `stepV2(state)` (legacy `tick` + v2 layer) |
| `src/v2/saveV2.ts` | v2 save slots (own keys) |
| `src/v2/actions.ts` | Store bridge (`useV2`, `getV2State`) + actions |
| `src/v2/v2.css` | Shared v2 styles (tokens from `src/styles/colors.css`) |
| `src/v2/BottomNavV2.tsx` | Founder/Metrics tabs, Metrics only once unlocked |
| `src/v2/PlaceholderRoom.tsx` | Phase 1 room card in the canvas area |
| `src/v2/FounderPanel.tsx` | Right panel for founder tasks |
| `src/v2/FamilyMoneyModal.tsx` | Beat 5 modal |
| `src/v2/TopBarV2.tsx` | Copy of legacy TopBar using v2 saves |
| `src/v2/OnboardingV2.tsx` | idea → assessment → name |
| `src/v2/GameScreenV2.tsx` | Game layout, loop, autosave, overlays |
| `src/v2/AppV2.tsx` | Route root: store reset, phase routing, restart adapter |
| `src/v2/__tests__/*.test.ts` | Unit tests; `fixtures.ts` holds shared helpers |
| `src/router.tsx` | **Only legacy edit:** `/new` route |

---

### Task 1: Test tooling + v2 state module

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts + devDependency via npm)
- Create: `src/v2/state.ts`
- Create: `src/v2/__tests__/fixtures.ts`
- Test: `src/v2/__tests__/state.test.ts`

**Interfaces:**
- Consumes: legacy `createInitialState`, `totalDays` from `src/engine/gameEngine.ts`; `GameState`, `OnboardingConfig`, `MetricsSnapshot` from `src/types`.
- Produces:
  - `type FounderTaskType = 'research'|'develop'|'emails'|'sales'`
  - `type FounderSkill = 'research'|'build'|'outreach'|'sales'`
  - `type Beat = 0|1|2|3|4|5`, `type Rng = () => number`
  - `interface FounderTask { type; featureId?: string; progress: number }`
  - `interface FamilyMoney { giver: string; amount: number; claimed: boolean }`
  - `interface V2Slice { founder: { name; task: FounderTask|null; skills: Record<FounderSkill, number> }; chapter: { beat: Beat; complete: boolean; seenCards: string[]; familyMoney?: FamilyMoney }; leads: number; firstSaleDone: boolean }`
  - `type V2GameState = GameState & { v2: V2Slice }`
  - `FOUNDER_START_CASH = 500`, `STARTING_SKILL = 4`
  - `createV2Slice(): V2Slice`
  - `createV2State(config: OnboardingConfig): V2GameState`
  - `isValidV2Slice(v: unknown): v is V2Slice`
  - `isV2Game(state: GameState & { v2?: unknown }): boolean`
  - `addStory<T extends GameState>(state: T, lines: string[]): T`
  - Fixtures: `makeConfig`, `makeState`, `withV2`, `withChapter`, `withFounder`, `makeFeature`, `seq`

- [ ] **Step 1: Install vitest and add the test script**

Run:
```bash
npm install -D vitest@^3.2.4
npm pkg set scripts.test="vitest run"
```
Expected: `package.json` has `"test": "vitest run"` and `vitest` in devDependencies.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

// Separate from vite.config.ts on purpose: keeps the dev-server analytics
// plugin (Mongo/env loading) out of the test run.
export default defineConfig({
  test: {
    include: ['src/v2/**/*.test.ts'],
    environment: 'node',
  },
})
```

- [ ] **Step 3: Create test fixtures `src/v2/__tests__/fixtures.ts`**

```ts
import { scoreToDifficulty } from '../../ai/gemini'
import { FEATURE_TEMPLATES } from '../../data/featureTemplates'
import type { Feature, OnboardingConfig } from '../../types'
import { createV2State, type Rng, type V2GameState, type V2Slice } from '../state'

export function makeConfig(overrides: Partial<OnboardingConfig> = {}): OnboardingConfig {
  return {
    idea: 'A scheduling tool for dog groomers',
    ideaScore: 6,
    ideaFeedback: 'Solid niche.',
    workspace: 'office', // deliberately not 'home' — createV2State must override it
    startupName: 'Groomly',
    aiRoadmap: FEATURE_TEMPLATES.slice(0, 4),
    difficulty: scoreToDifficulty(6),
    ...overrides,
  }
}

export function makeState(overrides: Partial<V2GameState> = {}): V2GameState {
  return { ...createV2State(makeConfig()), ...overrides }
}

export function withV2(state: V2GameState, patch: Partial<V2Slice>): V2GameState {
  return { ...state, v2: { ...state.v2, ...patch } }
}

export function withChapter(state: V2GameState, patch: Partial<V2Slice['chapter']>): V2GameState {
  return withV2(state, { chapter: { ...state.v2.chapter, ...patch } })
}

export function withFounder(state: V2GameState, patch: Partial<V2Slice['founder']>): V2GameState {
  return withV2(state, { founder: { ...state.v2.founder, ...patch } })
}

export function makeFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: 'feat-test',
    title: 'Test Feature',
    description: 'A feature used in tests.',
    baseDays: 3,
    value: 'medium',
    impacts: ['users'],
    effects: { customers: 10 },
    discoveredByPMId: 'founder',
    status: 'proposed',
    buildProgress: 0,
    discoveredAtDay: 0,
    ...overrides,
  }
}

/** Deterministic rng that cycles through the given values. */
export function seq(...values: number[]): Rng {
  let i = 0
  return () => values[i++ % values.length]
}
```

- [ ] **Step 4: Write the failing test `src/v2/__tests__/state.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../engine/gameEngine'
import { addStory, createV2State, createV2Slice, isV2Game, isValidV2Slice, FOUNDER_START_CASH } from '../state'
import { makeConfig } from './fixtures'

describe('createV2State', () => {
  const s = createV2State(makeConfig())

  it('starts the founder alone at home with $500 and no burn', () => {
    expect(s.cash).toBe(FOUNDER_START_CASH)
    expect(s.cash).toBe(500)
    expect(s.infraCostMonthly).toBe(0)
    expect(s.employees).toEqual([])
    expect(s.candidates).toEqual([])
    expect(s.deskCount).toBe(0)
    expect(s.workspace).toBe('home')
    expect(s.lastConfig?.workspace).toBe('home')
    expect(s.phase).toBe('playing')
  })

  it('prefixes the game id with v2-', () => {
    expect(s.gameId.startsWith('v2-')).toBe(true)
  })

  it('rewrites the day-0 metrics snapshot for the solo start', () => {
    expect(s.metricsHistory).toHaveLength(1)
    expect(s.metricsHistory[0].cash).toBe(500)
    expect(s.metricsHistory[0].burn).toBe(0)
    expect(s.fullMetricsHistory[0].cash).toBe(500)
  })

  it('creates a fresh v2 slice', () => {
    expect(s.v2).toEqual(createV2Slice())
    expect(s.v2.founder.skills).toEqual({ research: 4, build: 4, outreach: 4, sales: 4 })
    expect(s.v2.chapter).toEqual({ beat: 0, complete: false, seenCards: [] })
    expect(s.v2.leads).toBe(0)
    expect(s.v2.firstSaleDone).toBe(false)
  })
})

describe('isValidV2Slice', () => {
  it('accepts a fresh slice', () => {
    expect(isValidV2Slice(createV2Slice())).toBe(true)
  })

  it('rejects junk and partial slices', () => {
    expect(isValidV2Slice(undefined)).toBe(false)
    expect(isValidV2Slice({})).toBe(false)
    const noSkills = { ...createV2Slice(), founder: { name: 'You', task: null } }
    expect(isValidV2Slice(noSkills)).toBe(false)
    const badBeat = { ...createV2Slice(), chapter: { beat: 7, complete: false, seenCards: [] } }
    expect(isValidV2Slice(badBeat)).toBe(false)
  })
})

describe('isV2Game', () => {
  it('is true for a v2 game', () => {
    expect(isV2Game(createV2State(makeConfig()))).toBe(true)
  })

  it('is false for a legacy game, even with a stale v2 slice left in the store', () => {
    const legacy = createInitialState(makeConfig())
    expect(isV2Game(legacy)).toBe(false)
    expect(isV2Game({ ...legacy, v2: createV2Slice() })).toBe(false)
  })
})

describe('addStory', () => {
  it('prepends an entry for the current day and caps the log at 20', () => {
    let s = createV2State(makeConfig())
    for (let i = 0; i < 25; i++) s = addStory(s, [`line ${i}`])
    expect(s.storyLog).toHaveLength(20)
    expect(s.storyLog[0]).toEqual({ day: 0, lines: ['line 24'] })
  })
})
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npx vitest run src/v2/__tests__/state.test.ts`
Expected: FAIL — `Failed to resolve import "../state"`.

- [ ] **Step 6: Implement `src/v2/state.ts`**

```ts
import { createInitialState, totalDays } from '../engine/gameEngine'
import type { GameState, MetricsSnapshot, OnboardingConfig } from '../types'

export type FounderTaskType = 'research' | 'develop' | 'emails' | 'sales'
export type FounderSkill = 'research' | 'build' | 'outreach' | 'sales'
export type Beat = 0 | 1 | 2 | 3 | 4 | 5
export type Rng = () => number

export interface FounderTask {
  type: FounderTaskType
  featureId?: string
  progress: number // 0..1
}

export interface FamilyMoney {
  giver: string
  amount: number
  claimed: boolean
}

export interface V2Slice {
  founder: {
    name: string
    task: FounderTask | null
    skills: Record<FounderSkill, number>
  }
  chapter: {
    beat: Beat
    complete: boolean
    seenCards: string[]
    familyMoney?: FamilyMoney
  }
  leads: number
  firstSaleDone: boolean
}

export type V2GameState = GameState & { v2: V2Slice }

export const FOUNDER_START_CASH = 500
export const STARTING_SKILL = 4

const SKILL_KEYS: FounderSkill[] = ['research', 'build', 'outreach', 'sales']

export function createV2Slice(): V2Slice {
  return {
    founder: {
      name: 'You',
      task: null,
      skills: {
        research: STARTING_SKILL,
        build: STARTING_SKILL,
        outreach: STARTING_SKILL,
        sales: STARTING_SKILL,
      },
    },
    chapter: { beat: 0, complete: false, seenCards: [] },
    leads: 0,
    firstSaleDone: false,
  }
}

export function createV2State(config: OnboardingConfig): V2GameState {
  const base = createInitialState({ ...config, workspace: 'home' })
  const snapshot: MetricsSnapshot = {
    ...base.metricsHistory[0],
    cash: FOUNDER_START_CASH,
    burn: 0,
    runway: 999,
    valuation: FOUNDER_START_CASH,
  }
  const ideaLine = config.idea.length > 80 ? `${config.idea.slice(0, 80)}...` : config.idea

  return {
    ...base,
    cash: FOUNDER_START_CASH,
    infraCostMonthly: 0,
    employees: [],
    candidates: [],
    deskCount: 0,
    gameId: `v2-${base.gameId}`,
    metricsHistory: [snapshot],
    fullMetricsHistory: [snapshot],
    storyLog: [{
      day: 0,
      lines: [
        `${config.startupName} starts at a kitchen table: one founder, $${FOUNDER_START_CASH} in savings, and an idea.`,
        `Idea: "${ideaLine}"`,
      ],
    }],
    v2: createV2Slice(),
  }
}

export function isValidV2Slice(v: unknown): v is V2Slice {
  if (!v || typeof v !== 'object') return false
  const s = v as Record<string, unknown>
  const founder = s.founder as Record<string, unknown> | undefined
  const chapter = s.chapter as Record<string, unknown> | undefined
  const skills = founder?.skills as Record<string, unknown> | undefined
  if (!founder || !chapter || !skills) return false
  if (typeof s.leads !== 'number' || typeof s.firstSaleDone !== 'boolean') return false
  if (!SKILL_KEYS.every(k => typeof skills[k] === 'number')) return false
  if (founder.task !== null && typeof founder.task !== 'object') return false
  const beat = chapter.beat
  if (typeof beat !== 'number' || !Number.isInteger(beat) || beat < 0 || beat > 5) return false
  return typeof chapter.complete === 'boolean' && Array.isArray(chapter.seenCards)
}

/** True only for a genuine v2 game — a legacy restart leaves a stale v2 slice but a legacy id. */
export function isV2Game(state: GameState & { v2?: unknown }): boolean {
  return typeof state.gameId === 'string' && state.gameId.startsWith('v2-') && isValidV2Slice(state.v2)
}

export function addStory<T extends GameState>(state: T, lines: string[]): T {
  const day = totalDays(state.gameTime)
  return { ...state, storyLog: [{ day, lines }, ...state.storyLog].slice(0, 20) }
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run src/v2/__tests__/state.test.ts`
Expected: PASS (all tests green).

- [ ] **Step 8: Typecheck and commit**

Run: `npx tsc --noEmit -p .`
Expected: no output.

```bash
git add vitest.config.ts package.json package-lock.json src/v2/state.ts src/v2/__tests__/fixtures.ts src/v2/__tests__/state.test.ts
git commit -m "Add v2 state module and vitest setup"
```

---

### Task 2: Chapter module (beats, unlocks, coach cards, family money)

**Files:**
- Create: `src/v2/chapter.ts`
- Test: `src/v2/__tests__/chapter.test.ts`

**Interfaces:**
- Consumes: `V2GameState`, `FounderTaskType`, `Beat`, `Rng`, `FamilyMoney`, `addStory` from `./state`.
- Produces:
  - `TASK_UNLOCK_BEAT: Record<FounderTaskType, Beat>`
  - `isTaskUnlocked(state: Pick<V2GameState,'v2'>, type: FounderTaskType): boolean`
  - `isMetricsUnlocked(state: Pick<V2GameState,'v2'>): boolean`
  - `interface CoachCard { id: string; title: string; body: string }`, `COACH_CARDS`
  - `currentCoachCard(state: Pick<V2GameState,'v2'>): CoachCard | null`
  - `dismissCard(state: V2GameState, id: string): V2GameState`
  - `reshowCurrentCard(state: V2GameState): V2GameState`
  - `FAMILY_GIVERS: string[]`, `FAMILY_MIN = 800`, `FAMILY_MAX = 1500`
  - `rollFamilyMoney(rng: Rng): FamilyMoney`
  - `onTaskCompleted(state: V2GameState, type: FounderTaskType, rng: Rng): V2GameState`
  - `claimFamilyMoney(state: V2GameState): V2GameState`

- [ ] **Step 1: Write the failing test `src/v2/__tests__/chapter.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import {
  claimFamilyMoney, currentCoachCard, dismissCard, FAMILY_GIVERS, isMetricsUnlocked,
  isTaskUnlocked, onTaskCompleted, reshowCurrentCard, rollFamilyMoney,
} from '../chapter'
import { makeState, seq, withChapter, withV2 } from './fixtures'

describe('isTaskUnlocked', () => {
  it('unlocks one task per beat, in order', () => {
    const at = (beat: 0 | 1 | 2 | 3) => withChapter(makeState(), { beat })
    expect(['research', 'develop', 'emails', 'sales'].map(t => isTaskUnlocked(at(0), t as never))).toEqual([true, false, false, false])
    expect(isTaskUnlocked(at(1), 'develop')).toBe(true)
    expect(isTaskUnlocked(at(1), 'emails')).toBe(false)
    expect(isTaskUnlocked(at(2), 'emails')).toBe(true)
    expect(isTaskUnlocked(at(2), 'sales')).toBe(false)
    expect(isTaskUnlocked(at(3), 'sales')).toBe(true)
  })

  it('unlocks everything once the chapter is complete', () => {
    const s = withChapter(makeState(), { beat: 5, complete: true })
    expect(isTaskUnlocked(s, 'sales')).toBe(true)
  })
})

describe('isMetricsUnlocked', () => {
  it('opens at beat 4 or on completion', () => {
    expect(isMetricsUnlocked(withChapter(makeState(), { beat: 3 }))).toBe(false)
    expect(isMetricsUnlocked(withChapter(makeState(), { beat: 4 }))).toBe(true)
    expect(isMetricsUnlocked(withChapter(makeState(), { beat: 5 }))).toBe(true)
  })
})

describe('onTaskCompleted', () => {
  const rng = seq(0, 0)

  it('advances one beat when the expected task completes', () => {
    let s = makeState()
    s = onTaskCompleted(s, 'research', rng); expect(s.v2.chapter.beat).toBe(1)
    s = onTaskCompleted(s, 'develop', rng);  expect(s.v2.chapter.beat).toBe(2)
    s = onTaskCompleted(s, 'emails', rng);   expect(s.v2.chapter.beat).toBe(3)
  })

  it('does not advance on the wrong task', () => {
    const s = onTaskCompleted(withChapter(makeState(), { beat: 1 }), 'research', rng)
    expect(s.v2.chapter.beat).toBe(1)
  })

  it('does not advance past beat 3 until a sale actually happened', () => {
    const s = onTaskCompleted(withChapter(makeState(), { beat: 3 }), 'sales', rng)
    expect(s.v2.chapter.beat).toBe(3)
    expect(s.v2.chapter.familyMoney).toBeUndefined()
  })

  it('goes through beat 4 to beat 5 on the first sale and rolls family money', () => {
    const before = withV2(withChapter(makeState(), { beat: 3 }), { firstSaleDone: true })
    const s = onTaskCompleted(before, 'sales', seq(0, 0))
    expect(s.v2.chapter.beat).toBe(5)
    expect(s.v2.chapter.familyMoney).toEqual({ giver: FAMILY_GIVERS[0], amount: 800, claimed: false })
  })

  it('is a no-op once the chapter is complete', () => {
    const s = withChapter(makeState(), { beat: 5, complete: true })
    expect(onTaskCompleted(s, 'research', rng)).toBe(s)
  })
})

describe('rollFamilyMoney', () => {
  it('stays within $800-$1,500 and picks a giver from the pool', () => {
    expect(rollFamilyMoney(seq(0, 0))).toEqual({ giver: FAMILY_GIVERS[0], amount: 800, claimed: false })
    const high = rollFamilyMoney(seq(0.99, 0.9999))
    expect(high.giver).toBe(FAMILY_GIVERS[FAMILY_GIVERS.length - 1])
    expect(high.amount).toBe(1500)
  })
})

describe('claimFamilyMoney', () => {
  const ready = withChapter(makeState(), { beat: 5, familyMoney: { giver: 'Your cousin', amount: 1000, claimed: false } })

  it('adds the cash once and completes the chapter', () => {
    const s = claimFamilyMoney(ready)
    expect(s.cash).toBe(ready.cash + 1000)
    expect(s.v2.chapter.complete).toBe(true)
    expect(s.v2.chapter.familyMoney?.claimed).toBe(true)
    expect(claimFamilyMoney(s).cash).toBe(s.cash)
  })

  it('does nothing before beat 5', () => {
    const early = withChapter(makeState(), { beat: 4 })
    expect(claimFamilyMoney(early)).toBe(early)
  })
})

describe('coach cards', () => {
  it('shows the card for the current beat until dismissed', () => {
    const s = makeState()
    expect(currentCoachCard(s)?.id).toBe('beat-0')
    const dismissed = dismissCard(s, 'beat-0')
    expect(currentCoachCard(dismissed)).toBeNull()
    expect(dismissCard(dismissed, 'beat-0').v2.chapter.seenCards).toEqual(['beat-0'])
  })

  it('shows the first-customer card at beat 5', () => {
    expect(currentCoachCard(withChapter(makeState(), { beat: 5 }))?.id).toBe('beat-4')
  })

  it('reshowCurrentCard brings the current card back', () => {
    const s = dismissCard(makeState(), 'beat-0')
    expect(currentCoachCard(reshowCurrentCard(s))?.id).toBe('beat-0')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/v2/__tests__/chapter.test.ts`
Expected: FAIL — `Failed to resolve import "../chapter"`.

- [ ] **Step 3: Implement `src/v2/chapter.ts`**

```ts
import { addStory, type Beat, type FamilyMoney, type FounderTaskType, type Rng, type V2GameState } from './state'

export const TASK_UNLOCK_BEAT: Record<FounderTaskType, Beat> = {
  research: 0,
  develop: 1,
  emails: 2,
  sales: 3,
}

export function isTaskUnlocked(state: Pick<V2GameState, 'v2'>, type: FounderTaskType): boolean {
  const { chapter } = state.v2
  return chapter.complete || chapter.beat >= TASK_UNLOCK_BEAT[type]
}

export function isMetricsUnlocked(state: Pick<V2GameState, 'v2'>): boolean {
  return state.v2.chapter.complete || state.v2.chapter.beat >= 4
}

export interface CoachCard {
  id: string
  title: string
  body: string
}

type CardId = 'beat-0' | 'beat-1' | 'beat-2' | 'beat-3' | 'beat-4'

export const COACH_CARDS: Record<CardId, CoachCard> = {
  'beat-0': {
    id: 'beat-0',
    title: 'Day one',
    body: "It's just you, a laptop and an idea. Every company starts here. Start by researching your market.",
  },
  'beat-1': {
    id: 'beat-1',
    title: 'You know what to build',
    body: 'Research turns an idea into concrete things to build. Pick one and build it yourself.',
  },
  'beat-2': {
    id: 'beat-2',
    title: 'Your first users',
    body: "People signed up to try it. They're leads, not customers. Go find more.",
  },
  'beat-3': {
    id: 'beat-3',
    title: 'Time to sell',
    body: "Leads don't pay. Customers do. Time to sell.",
  },
  'beat-4': {
    id: 'beat-4',
    title: 'First paying customer!',
    body: "🎉 First paying customer! That's real revenue: $50/mo.",
  },
}

function cardIdFor(beat: Beat): CardId {
  return `beat-${Math.min(beat, 4)}` as CardId
}

export function currentCoachCard(state: Pick<V2GameState, 'v2'>): CoachCard | null {
  const { beat, seenCards } = state.v2.chapter
  const id = cardIdFor(beat)
  return seenCards.includes(id) ? null : COACH_CARDS[id]
}

export function dismissCard(state: V2GameState, id: string): V2GameState {
  const { chapter } = state.v2
  if (chapter.seenCards.includes(id)) return state
  return { ...state, v2: { ...state.v2, chapter: { ...chapter, seenCards: [...chapter.seenCards, id] } } }
}

export function reshowCurrentCard(state: V2GameState): V2GameState {
  const { chapter } = state.v2
  const id = cardIdFor(chapter.beat)
  return { ...state, v2: { ...state.v2, chapter: { ...chapter, seenCards: chapter.seenCards.filter(c => c !== id) } } }
}

export const FAMILY_GIVERS = [
  'Your cousin',
  'An old college friend',
  'Your former manager',
  'Your parents',
  'Your best friend',
]
export const FAMILY_MIN = 800
export const FAMILY_MAX = 1500

export function rollFamilyMoney(rng: Rng): FamilyMoney {
  const giver = FAMILY_GIVERS[Math.min(FAMILY_GIVERS.length - 1, Math.floor(rng() * FAMILY_GIVERS.length))]
  const amount = FAMILY_MIN + Math.floor(rng() * (FAMILY_MAX - FAMILY_MIN + 1))
  return { giver, amount, claimed: false }
}

/** Called by v2Tick whenever the founder completes a task. Beats only move forward, one at a time. */
export function onTaskCompleted(state: V2GameState, type: FounderTaskType, rng: Rng): V2GameState {
  const { chapter } = state.v2
  if (chapter.complete) return state

  let beat: Beat = chapter.beat
  if (beat === 0 && type === 'research') beat = 1
  else if (beat === 1 && type === 'develop') beat = 2
  else if (beat === 2 && type === 'emails') beat = 3
  else if (beat === 3 && type === 'sales' && state.v2.firstSaleDone) beat = 4
  if (beat === chapter.beat) return state

  let familyMoney = chapter.familyMoney
  if (beat === 4) {
    // Beat 4 (first customer card) and beat 5 (family money) happen together.
    beat = 5
    familyMoney = rollFamilyMoney(rng)
  }
  return { ...state, v2: { ...state.v2, chapter: { ...chapter, beat, familyMoney } } }
}

export function claimFamilyMoney(state: V2GameState): V2GameState {
  const { chapter } = state.v2
  const money = chapter.familyMoney
  if (chapter.beat !== 5 || !money || money.claimed) return state
  const next: V2GameState = {
    ...state,
    cash: state.cash + money.amount,
    v2: { ...state.v2, chapter: { ...chapter, complete: true, familyMoney: { ...money, claimed: true } } },
  }
  return addStory(next, [`${money.giver} believed in you before anyone else did: +$${money.amount.toLocaleString()}.`])
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/v2/__tests__/chapter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v2/chapter.ts src/v2/__tests__/chapter.test.ts
git commit -m "Add v2 chapter beats, unlocks and family money"
```

---

### Task 3: Founder task engine + Research outcome

**Files:**
- Create: `src/v2/founder.ts`
- Test: `src/v2/__tests__/founder.test.ts`

**Interfaces:**
- Consumes: `isTaskUnlocked` from `./chapter`; `addStory`, types from `./state`; `FEATURE_TEMPLATES`/`FeatureTemplate` from `src/data/featureTemplates`; `totalDays` from `src/engine/gameEngine`.
- Produces:
  - `FOUNDER_ID = 'founder'`, `RESEARCH_DAYS = 3`, `EMAILS_DAYS = 2`, `SALES_DAYS = 2`, `FOUNDER_BUILD_SPEED = 0.6`, `FEATURES_PER_RESEARCH = 2`, `SKILL_GAIN = 0.5`, `SKILL_CAP = 8`, `FOUNDER_ACCURACY = 5`
  - `TASK_SKILL: Record<FounderTaskType, FounderSkill>`
  - `type StartTaskError = 'busy'|'locked'|'no-feature'|'no-leads'`
  - `type StartTaskResult = { ok: true; state: V2GameState } | { ok: false; reason: StartTaskError }`
  - `taskDurationDays(state: Pick<V2GameState,'features'>, type, featureId?): number`
  - `startTask(state: V2GameState, type: FounderTaskType, featureId?: string): StartTaskResult`
  - `interface AdvanceResult { state: V2GameState; completed: FounderTaskType | null }`
  - `advanceFounder(state: V2GameState, hours: number, rng: Rng): AdvanceResult`
  - `pickResearchTemplates(state: V2GameState, rng: Rng): { templates: FeatureTemplate[]; newIndex: number }`
  - Task 4 adds the develop/emails/sales outcomes inside `applyOutcome`. Task 6 adds `reconcileFounderFeatures`.

- [ ] **Step 1: Write the failing test `src/v2/__tests__/founder.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { FEATURE_TEMPLATES } from '../../data/featureTemplates'
import { estimateFeatureEffects } from '../../engine/gameEngine'
import { advanceFounder, FOUNDER_ID, pickResearchTemplates, startTask, type AdvanceResult } from '../founder'
import type { V2GameState } from '../state'
import { makeFeature, makeState, seq, withChapter, withFounder, withV2 } from './fixtures'

const rng = seq(0)

function started(state: V2GameState, type: Parameters<typeof startTask>[1], featureId?: string): V2GameState {
  const r = startTask(state, type, featureId)
  if (!r.ok) throw new Error(`startTask failed: ${r.reason}`)
  return r.state
}

function advanceHours(state: V2GameState, hours: number): AdvanceResult {
  let result: AdvanceResult = { state, completed: null }
  for (let i = 0; i < hours; i++) {
    result = advanceFounder(result.state, 1, rng)
    if (result.completed) return result
  }
  return result
}

describe('startTask', () => {
  it('refuses a second task while one is running', () => {
    const s = started(makeState(), 'research')
    expect(startTask(s, 'research')).toEqual({ ok: false, reason: 'busy' })
  })

  it('refuses locked tasks', () => {
    expect(startTask(makeState(), 'emails')).toEqual({ ok: false, reason: 'locked' })
  })

  it('refuses sales with no leads', () => {
    const s = withChapter(makeState(), { beat: 3 })
    expect(startTask(s, 'sales')).toEqual({ ok: false, reason: 'no-leads' })
  })

  it('refuses develop without a proposed feature', () => {
    const s = withChapter(makeState({ features: [makeFeature({ status: 'completed' })] }), { beat: 1 })
    expect(startTask(s, 'develop', 'feat-test')).toEqual({ ok: false, reason: 'no-feature' })
    expect(startTask(s, 'develop', 'missing')).toEqual({ ok: false, reason: 'no-feature' })
  })

  it('marks the chosen feature in development by the founder', () => {
    const s = started(withChapter(makeState({ features: [makeFeature()] }), { beat: 1 }), 'develop', 'feat-test')
    expect(s.features[0]).toMatchObject({ status: 'in_development', assignedToDevId: FOUNDER_ID, buildProgress: 0 })
    expect(s.v2.founder.task).toEqual({ type: 'develop', featureId: 'feat-test', progress: 0 })
  })
})

describe('advanceFounder + research', () => {
  it('does nothing without a task or with zero hours', () => {
    const idle = makeState()
    expect(advanceFounder(idle, 1, rng)).toEqual({ state: idle, completed: null })
    const busy = started(makeState(), 'research')
    expect(advanceFounder(busy, 0, rng).state).toBe(busy)
  })

  it('completes research after exactly 72 game hours', () => {
    const s = started(makeState(), 'research')
    const almost = advanceHours(s, 71)
    expect(almost.completed).toBeNull()
    expect(almost.state.v2.founder.task?.progress).toBeCloseTo(71 / 72)
    const done = advanceFounder(almost.state, 1, rng)
    expect(done.completed).toBe('research')
    expect(done.state.v2.founder.task).toBeNull()
  })

  it('reveals the next 2 roadmap features as proposed and advances the index', () => {
    const done = advanceHours(started(makeState(), 'research'), 72).state
    expect(done.features.map(f => f.title)).toEqual([FEATURE_TEMPLATES[0].title, FEATURE_TEMPLATES[1].title])
    expect(done.features.every(f => f.status === 'proposed' && f.discoveredByPMId === FOUNDER_ID)).toBe(true)
    expect(done.featureRoadmapIndex).toBe(2)
    expect(done.v2.founder.skills.research).toBe(4.5)
  })

  it('skips titles that already exist', () => {
    const s = makeState({ features: [makeFeature({ title: FEATURE_TEMPLATES[0].title, status: 'completed' })] })
    const { templates, newIndex } = pickResearchTemplates(s, rng)
    expect(templates.map(t => t.title)).toEqual([FEATURE_TEMPLATES[1].title, FEATURE_TEMPLATES[2].title])
    expect(newIndex).toBe(3)
  })

  it('falls back to the template pool when the roadmap runs out', () => {
    const s = makeState({ featureRoadmap: [FEATURE_TEMPLATES[0]], featureRoadmapIndex: 0 })
    const { templates } = pickResearchTemplates(s, seq(0))
    expect(templates.map(t => t.title)).toEqual([FEATURE_TEMPLATES[0].title, FEATURE_TEMPLATES[1].title])
  })

  it('completes with a "nothing new" story when every template is used', () => {
    const everything = FEATURE_TEMPLATES.map((t, i) => makeFeature({ id: `f${i}`, title: t.title, status: 'completed' }))
    const s = started(makeState({ features: everything, featureRoadmap: [] }), 'research')
    const done = advanceHours(s, 72)
    expect(done.completed).toBe('research')
    expect(done.state.features).toHaveLength(everything.length)
    expect(done.state.storyLog[0].lines[0]).toMatch(/nothing new/i)
  })

  it('caps skills at 8', () => {
    const s = started(withFounder(makeState(), { skills: { research: 7.8, build: 4, outreach: 4, sales: 4 } }), 'research')
    expect(advanceHours(s, 72).state.v2.founder.skills.research).toBe(8)
  })
})
```

(`estimateFeatureEffects` and `withV2` aren't used until Task 4 appends to this file. The tsconfig has no `noUnusedLocals`, so that's fine.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/v2/__tests__/founder.test.ts`
Expected: FAIL — `Failed to resolve import "../founder"`.

- [ ] **Step 3: Implement `src/v2/founder.ts`**

```ts
import { FEATURE_TEMPLATES, type FeatureTemplate } from '../data/featureTemplates'
import { totalDays } from '../engine/gameEngine'
import type { Feature } from '../types'
import { isTaskUnlocked } from './chapter'
import { addStory, type FounderSkill, type FounderTask, type FounderTaskType, type Rng, type V2GameState } from './state'

export const FOUNDER_ID = 'founder'
export const RESEARCH_DAYS = 3
export const EMAILS_DAYS = 2
export const SALES_DAYS = 2
export const FOUNDER_BUILD_SPEED = 0.6
export const FEATURES_PER_RESEARCH = 2
export const SKILL_GAIN = 0.5
export const SKILL_CAP = 8
export const FOUNDER_ACCURACY = 5

const EPSILON = 1e-9

export const TASK_SKILL: Record<FounderTaskType, FounderSkill> = {
  research: 'research',
  develop: 'build',
  emails: 'outreach',
  sales: 'sales',
}

export type StartTaskError = 'busy' | 'locked' | 'no-feature' | 'no-leads'
export type StartTaskResult = { ok: true; state: V2GameState } | { ok: false; reason: StartTaskError }

export function taskDurationDays(
  state: Pick<V2GameState, 'features'>,
  type: FounderTaskType,
  featureId?: string,
): number {
  switch (type) {
    case 'research': return RESEARCH_DAYS
    case 'emails': return EMAILS_DAYS
    case 'sales': return SALES_DAYS
    case 'develop': {
      const feature = state.features.find(f => f.id === featureId)
      return (feature?.baseDays ?? 1) / FOUNDER_BUILD_SPEED
    }
  }
}

function withTask(state: V2GameState, task: FounderTask | null): V2GameState {
  return { ...state, v2: { ...state.v2, founder: { ...state.v2.founder, task } } }
}

export function startTask(state: V2GameState, type: FounderTaskType, featureId?: string): StartTaskResult {
  if (state.v2.founder.task) return { ok: false, reason: 'busy' }
  if (!isTaskUnlocked(state, type)) return { ok: false, reason: 'locked' }
  if (type === 'sales' && state.v2.leads < 1) return { ok: false, reason: 'no-leads' }

  let features = state.features
  if (type === 'develop') {
    const feature = state.features.find(f => f.id === featureId)
    if (!feature || feature.status !== 'proposed') return { ok: false, reason: 'no-feature' }
    features = state.features.map(f =>
      f.id === featureId ? { ...f, status: 'in_development' as const, assignedToDevId: FOUNDER_ID, buildProgress: 0 } : f,
    )
  }

  const task: FounderTask = { type, progress: 0, ...(type === 'develop' ? { featureId } : {}) }
  return { ok: true, state: withTask({ ...state, features }, task) }
}

function growSkill(state: V2GameState, skill: FounderSkill): V2GameState {
  const skills = state.v2.founder.skills
  return {
    ...state,
    v2: {
      ...state.v2,
      founder: { ...state.v2.founder, skills: { ...skills, [skill]: Math.min(SKILL_CAP, skills[skill] + SKILL_GAIN) } },
    },
  }
}

// ── Research ────────────────────────────────────────────────────────────────

export function pickResearchTemplates(state: V2GameState, rng: Rng): { templates: FeatureTemplate[]; newIndex: number } {
  const used = new Set(state.features.map(f => f.title))
  const templates: FeatureTemplate[] = []

  let idx = state.featureRoadmapIndex
  while (idx < state.featureRoadmap.length && templates.length < FEATURES_PER_RESEARCH) {
    const t = state.featureRoadmap[idx]
    idx++
    if (!used.has(t.title)) {
      templates.push(t)
      used.add(t.title)
    }
  }

  const pool = FEATURE_TEMPLATES.filter(t => !used.has(t.title))
  while (templates.length < FEATURES_PER_RESEARCH && pool.length > 0) {
    const i = Math.min(pool.length - 1, Math.floor(rng() * pool.length))
    const [t] = pool.splice(i, 1)
    templates.push(t)
    used.add(t.title)
  }

  return { templates, newIndex: idx }
}

function toFeature(t: FeatureTemplate, day: number, key: string): Feature {
  return {
    id: `feat-founder-${key}`,
    title: t.title,
    description: t.description,
    baseDays: t.baseDays,
    value: t.value,
    impacts: t.impacts,
    effects: t.effects,
    tradeoffHint: t.tradeoffHint,
    discoveredByPMId: FOUNDER_ID,
    status: 'proposed',
    buildProgress: 0,
    discoveredAtDay: day,
  }
}

function applyResearch(state: V2GameState, rng: Rng): V2GameState {
  const { templates, newIndex } = pickResearchTemplates(state, rng)
  const day = totalDays(state.gameTime)
  const found = templates.map((t, i) => toFeature(t, day, `${state.gameTime.totalHours}-${i}`))
  const next: V2GameState = { ...state, features: [...state.features, ...found], featureRoadmapIndex: newIndex }
  const line = found.length === 0
    ? 'You researched for days but found nothing new worth building.'
    : `Research done. Worth building: ${found.map(f => `"${f.title}"`).join(' and ')}.`
  return addStory(next, [line])
}

// ── Outcome dispatch ────────────────────────────────────────────────────────

/** Returns null when the task has no outcome (e.g. develop on a feature that disappeared). */
function applyOutcome(state: V2GameState, task: FounderTask, rng: Rng): V2GameState | null {
  switch (task.type) {
    case 'research': return applyResearch(state, rng)
    default: return null // develop / emails / sales land in Task 4
  }
}

// ── Advance ─────────────────────────────────────────────────────────────────

export interface AdvanceResult {
  state: V2GameState
  completed: FounderTaskType | null
}

export function advanceFounder(state: V2GameState, hours: number, rng: Rng): AdvanceResult {
  const task = state.v2.founder.task
  if (!task || hours <= 0) return { state, completed: null }

  const days = taskDurationDays(state, task.type, task.featureId)
  const progress = Math.min(1, task.progress + hours / (24 * days))

  if (progress < 1 - EPSILON) {
    const features = task.type === 'develop'
      ? state.features.map(f => (f.id === task.featureId ? { ...f, buildProgress: progress } : f))
      : state.features
    return { state: withTask({ ...state, features }, { ...task, progress }), completed: null }
  }

  const cleared = withTask(state, null)
  const outcome = applyOutcome(cleared, task, rng)
  if (!outcome) return { state: cleared, completed: null }
  return { state: growSkill(outcome, TASK_SKILL[task.type]), completed: task.type }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/v2/__tests__/founder.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v2/founder.ts src/v2/__tests__/founder.test.ts
git commit -m "Add v2 founder task engine and research"
```

---

### Task 4: Develop, Emails and Sales outcomes

**Files:**
- Modify: `src/v2/founder.ts` (imports, `applyOutcome`, three new outcome functions)
- Test: `src/v2/__tests__/founder.test.ts` (append)

**Interfaces:**
- Consumes: `estimateFeatureEffects(effects, value, accuracy, currentArpu, currentCustomers, diffMult): FeatureEstimate` from `src/engine/gameEngine.ts`; `FeatureResult` from `src/types`.
- Produces: no new exports. `advanceFounder` now completes `develop` / `emails` / `sales`.

- [ ] **Step 1: Append the failing tests to `src/v2/__tests__/founder.test.ts`**

Append to the end of the file (the imports from Task 3 already cover everything used here):

```ts
describe('develop outcome', () => {
  const base = withChapter(makeState({ features: [makeFeature()] }), { beat: 1 })

  function estFor(s: V2GameState) {
    const f = makeFeature()
    return estimateFeatureEffects(f.effects, f.value, 5, s.arpu, s.customers, s.difficultyModifier!.featureImpactMultiplier)
  }

  it('takes baseDays / 0.6 days (3 → 5 days = 120 hours) and mirrors progress onto the feature', () => {
    const s = started(base, 'develop', 'feat-test')
    const half = advanceHours(s, 60)
    expect(half.completed).toBeNull()
    expect(half.state.features[0].buildProgress).toBeCloseTo(0.5)
    expect(advanceHours(half.state, 60).completed).toBe('develop')
  })

  it('before the first sale, sends customer gains into leads', () => {
    const done = advanceHours(started(base, 'develop', 'feat-test'), 120).state
    const est = estFor(base)
    expect(est.customers).toBeGreaterThan(0)
    expect(done.v2.leads).toBe(est.customers)
    expect(done.customers).toBe(0)
    expect(done.features[0]).toMatchObject({ status: 'completed', buildProgress: 1 })
    expect(done.recentFeatureResults[0]).toMatchObject({ featureTitle: 'Test Feature', devName: 'You', customerGain: 0 })
    expect(done.v2.founder.skills.build).toBe(4.5)
    expect(done.storyLog[0].lines[0]).toMatch(/leads, not paying customers/)
  })

  it('after the first sale, adds real customers', () => {
    const s = withV2(base, { firstSaleDone: true })
    const done = advanceHours(started(s, 'develop', 'feat-test'), 120).state
    expect(done.customers).toBe(estFor(s).customers)
    expect(done.mrr).toBe(done.customers * done.arpu)
    expect(done.v2.leads).toBe(0)
  })

  it('never lets leads go negative on a feature that loses users', () => {
    const neg = withChapter(makeState({ features: [makeFeature({ effects: { customers: -15, arpu: 18 } })] }), { beat: 1 })
    const done = advanceHours(started(neg, 'develop', 'feat-test'), 120).state
    expect(done.v2.leads).toBe(0)
  })

  it('cancels with no outcome if the feature disappeared mid-build', () => {
    const s = started(base, 'develop', 'feat-test')
    const gone: V2GameState = { ...s, features: [] }
    const result = advanceHours(gone, 200)
    expect(result.completed).toBeNull()
    expect(result.state.v2.founder.task).toBeNull()
    expect(result.state.v2.founder.skills.build).toBe(4)
  })
})

describe('emails outcome', () => {
  const at2 = withChapter(makeState(), { beat: 2 }) // home brand = 10

  function emailsWith(state: V2GameState, r: number): V2GameState {
    let result: AdvanceResult = { state: started(state, 'emails'), completed: null }
    for (let i = 0; i < 48 && !result.completed; i++) result = advanceFounder(result.state, 1, seq(r))
    return result.state
  }

  it('adds round((4 + outreach + rng*4) * (1 + brand/100)) leads', () => {
    expect(emailsWith(at2, 0).v2.leads).toBe(9)     // (4+4+0)*1.1 = 8.8
    expect(emailsWith(at2, 0.5).v2.leads).toBe(11)  // (4+4+2)*1.1 = 11
    expect(emailsWith({ ...at2, brand: 0 }, 0).v2.leads).toBe(8)
  })

  it('grows outreach and completes in 2 days', () => {
    const done = emailsWith(at2, 0)
    expect(done.v2.founder.task).toBeNull()
    expect(done.v2.founder.skills.outreach).toBe(4.5)
  })
})

describe('sales outcome', () => {
  const ready = withV2(withChapter(makeState(), { beat: 3 }), { leads: 10 })

  function salesWith(state: V2GameState, r: number): V2GameState {
    let result: AdvanceResult = { state: started(state, 'sales'), completed: null }
    for (let i = 0; i < 48 && !result.completed; i++) result = advanceFounder(result.state, 1, seq(r))
    return result.state
  }

  it('converts each lead with p = 0.25 + 0.03*sales and consumes all contacted leads', () => {
    const done = salesWith(ready, 0.3) // 0.3 < 0.37 → every lead converts
    expect(done.customers).toBe(10)
    expect(done.v2.leads).toBe(0)
    expect(done.v2.firstSaleDone).toBe(true)
    expect(done.mrr).toBe(10 * done.arpu)
    expect(done.v2.founder.skills.sales).toBe(4.5)
  })

  it('guarantees at least one conversion on the first-ever sales run', () => {
    const done = salesWith(ready, 0.9)
    expect(done.customers).toBe(1)
    expect(done.v2.firstSaleDone).toBe(true)
  })

  it('has no guarantee after the first sale', () => {
    const done = salesWith(withV2(ready, { firstSaleDone: true }), 0.9)
    expect(done.customers).toBe(0)
    expect(done.v2.leads).toBe(0)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/v2/__tests__/founder.test.ts`
Expected: FAIL — the develop/emails/sales tests fail (`completed` is `null`, leads 0).

- [ ] **Step 3: Implement the outcomes in `src/v2/founder.ts`**

Replace the import line `import { totalDays } from '../engine/gameEngine'` with:

```ts
import { estimateFeatureEffects, totalDays } from '../engine/gameEngine'
```

Replace `import type { Feature } from '../types'` with:

```ts
import type { Feature, FeatureResult } from '../types'
```

Add these functions directly above the `// ── Outcome dispatch` comment:

```ts
// ── Develop ─────────────────────────────────────────────────────────────────

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n))
}

function applyDevelop(state: V2GameState, featureId: string | undefined): V2GameState | null {
  const feature = state.features.find(f => f.id === featureId)
  if (!feature) return null

  const day = totalDays(state.gameTime)
  const diffMult = state.difficultyModifier?.featureImpactMultiplier ?? 1
  const churnFloor = state.difficultyModifier?.churnFloor ?? 3
  const est = estimateFeatureEffects(feature.effects, feature.value, FOUNDER_ACCURACY, state.arpu, state.customers, diffMult)

  const preSale = !state.v2.firstSaleDone
  const customers = preSale ? state.customers : Math.max(0, state.customers + est.customers)
  const leads = preSale ? Math.max(0, state.v2.leads + est.customers) : state.v2.leads
  const arpu = Math.max(10, state.arpu + est.arpu)

  const result: FeatureResult = {
    featureTitle: feature.title,
    value: feature.value,
    devName: state.v2.founder.name,
    customerGain: preSale ? 0 : est.customers,
    arpuChange: est.arpu,
    churnDrop: est.churnDrop,
    brandChange: est.brand,
    techDebtChange: est.techDebt,
    cashBonus: est.cashBonus,
    completedAtDay: day,
  }

  const next: V2GameState = {
    ...state,
    features: state.features.map(f =>
      f.id === feature.id ? { ...f, status: 'completed' as const, buildProgress: 1, completedAtDay: day } : f,
    ),
    customers,
    arpu,
    mrr: customers * arpu,
    churnRate: Math.max(churnFloor, state.churnRate - est.churnDrop),
    cash: state.cash + est.cashBonus,
    brand: clamp100(state.brand + est.brand),
    techDebt: clamp100(state.techDebt + est.techDebt),
    productProgress: Math.min(100, state.productProgress + est.productGain),
    recentFeatureResults: [result, ...state.recentFeatureResults].slice(0, 3),
    v2: { ...state.v2, leads },
  }

  let line: string
  if (preSale && est.customers > 0) {
    line = `You shipped "${feature.title}"! ${est.customers} people joined the beta — leads, not paying customers yet.`
  } else if (preSale) {
    line = `You shipped "${feature.title}".`
  } else {
    line = `You shipped "${feature.title}"! ${est.customers >= 0 ? '+' : ''}${est.customers} users.`
  }
  return addStory(next, [line])
}

// ── Emails ──────────────────────────────────────────────────────────────────

function applyEmails(state: V2GameState, rng: Rng): V2GameState {
  const outreach = state.v2.founder.skills.outreach
  const gained = Math.round((4 + outreach + rng() * 4) * (1 + state.brand / 100))
  const next: V2GameState = { ...state, v2: { ...state.v2, leads: state.v2.leads + gained } }
  return addStory(next, [`You sent a round of cold emails. ${gained} new leads.`])
}

// ── Sales ───────────────────────────────────────────────────────────────────

function applySales(state: V2GameState, rng: Rng): V2GameState {
  const contacted = state.v2.leads
  const p = 0.25 + 0.03 * state.v2.founder.skills.sales
  let converted = 0
  for (let i = 0; i < contacted; i++) if (rng() < p) converted++
  if (!state.v2.firstSaleDone && contacted > 0) converted = Math.max(1, converted)

  const customers = state.customers + converted
  const next: V2GameState = {
    ...state,
    customers,
    mrr: customers * state.arpu,
    v2: { ...state.v2, leads: 0, firstSaleDone: state.v2.firstSaleDone || customers > 0 },
  }
  const line = converted > 0
    ? `Sales calls done: ${converted} of ${contacted} leads became paying customers.`
    : `Sales calls done: none of ${contacted} leads bought this time.`
  return addStory(next, [line])
}
```

Replace the whole `applyOutcome` function with:

```ts
/** Returns null when the task has no outcome (e.g. develop on a feature that disappeared). */
function applyOutcome(state: V2GameState, task: FounderTask, rng: Rng): V2GameState | null {
  switch (task.type) {
    case 'research': return applyResearch(state, rng)
    case 'develop': return applyDevelop(state, task.featureId)
    case 'emails': return applyEmails(state, rng)
    case 'sales': return applySales(state, rng)
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/v2/__tests__/founder.test.ts`
Expected: PASS (all founder tests).

- [ ] **Step 5: Commit**

```bash
git add src/v2/founder.ts src/v2/__tests__/founder.test.ts
git commit -m "Add v2 develop, emails and sales outcomes"
```

---

### Task 5: v2 tick (composition with the legacy tick)

**Files:**
- Create: `src/v2/v2Tick.ts`
- Test: `src/v2/__tests__/v2Tick.test.ts`

**Interfaces:**
- Consumes: `advanceFounder`, `startTask` from `./founder`; `onTaskCompleted`, `claimFamilyMoney` from `./chapter`; legacy `tick(state: GameState): GameState`.
- Produces:
  - `v2Tick(state: V2GameState, hours: number, rng?: Rng): V2GameState`
  - `stepV2<T extends V2GameState>(state: T, rng?: Rng): T` — one legacy hour, then the v2 layer. Used by `actions.stepGame`.

- [ ] **Step 1: Write the failing test `src/v2/__tests__/v2Tick.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { EVENTS } from '../../data/events'
import { claimFamilyMoney } from '../chapter'
import { startTask } from '../founder'
import type { FounderTaskType, Rng, V2GameState } from '../state'
import { v2Tick } from '../v2Tick'
import { makeState, seq, withChapter } from './fixtures'

function start(s: V2GameState, type: FounderTaskType, featureId?: string): V2GameState {
  const r = startTask(s, type, featureId)
  if (!r.ok) throw new Error(`startTask ${type}: ${r.reason}`)
  return r.state
}

function runTask(s: V2GameState, rng: Rng): V2GameState {
  let state = s
  for (let i = 0; i < 10_000 && state.v2.founder.task; i++) state = v2Tick(state, 1, rng)
  return state
}

describe('v2Tick', () => {
  it('clears legacy events during Chapter 1', () => {
    const s = makeState({ pendingEvent: EVENTS[0] })
    expect(v2Tick(s, 1).pendingEvent).toBeNull()
  })

  it('keeps events after Chapter 1 and pauses the founder while one is pending', () => {
    const s = start(withChapter(makeState(), { beat: 5, complete: true }), 'research')
    const pending = { ...s, pendingEvent: EVENTS[0] }
    const next = v2Tick(pending, 1)
    expect(next.pendingEvent).toBe(EVENTS[0])
    expect(next.v2.founder.task?.progress).toBe(0)
  })

  it('does nothing when the game is over', () => {
    const lost = makeState({ phase: 'lost' })
    expect(v2Tick(lost, 1)).toBe(lost)
  })

  it('does not advance the founder when no game time passed', () => {
    const s = start(makeState(), 'research')
    expect(v2Tick(s, 0).v2.founder.task?.progress).toBe(0)
  })

  it('moves the chapter forward when a task completes', () => {
    const done = runTask(start(makeState(), 'research'), seq(0))
    expect(done.v2.chapter.beat).toBe(1)
  })

  it('plays the whole chapter end to end', () => {
    const rng = seq(0.99) // worst-case rolls: only the first-sale guarantee converts
    let s = runTask(start(makeState(), 'research'), rng)
    expect(s.v2.chapter.beat).toBe(1)

    const firstIdea = s.features.find(f => f.status === 'proposed')!
    s = runTask(start(s, 'develop', firstIdea.id), rng)
    expect(s.v2.chapter.beat).toBe(2)

    s = runTask(start(s, 'emails'), rng)
    expect(s.v2.chapter.beat).toBe(3)
    expect(s.v2.leads).toBeGreaterThan(0)

    s = runTask(start(s, 'sales'), rng)
    expect(s.customers).toBe(1)
    expect(s.v2.chapter.beat).toBe(5)
    expect(s.v2.chapter.familyMoney?.claimed).toBe(false)

    const cashBefore = s.cash
    s = claimFamilyMoney(s)
    expect(s.v2.chapter.complete).toBe(true)
    expect(s.cash - cashBefore).toBeGreaterThanOrEqual(800)
    expect(s.cash - cashBefore).toBeLessThanOrEqual(1500)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/v2/__tests__/v2Tick.test.ts`
Expected: FAIL — `Failed to resolve import "../v2Tick"`.

- [ ] **Step 3: Implement `src/v2/v2Tick.ts`**

```ts
import { tick } from '../engine/gameEngine'
import { onTaskCompleted } from './chapter'
import { advanceFounder } from './founder'
import type { Rng, V2GameState } from './state'

/**
 * The v2 layer that runs after the legacy tick.
 * `hours` = game hours the legacy tick actually advanced (0 when it was paused).
 */
export function v2Tick(state: V2GameState, hours: number, rng: Rng = Math.random): V2GameState {
  if (state.phase !== 'playing') return state

  let s = state
  // No crises during the tutorial. The legacy tick pauses on pendingEvent, so clear it here.
  if (!s.v2.chapter.complete && s.pendingEvent) s = { ...s, pendingEvent: null }
  if (s.pendingEvent) return s

  const { state: advanced, completed } = advanceFounder(s, hours, rng)
  return completed ? onTaskCompleted(advanced, completed, rng) : advanced
}

/** One game hour: legacy simulation first, then the v2 layer. Preserves extra store keys. */
export function stepV2<T extends V2GameState>(state: T, rng: Rng = Math.random): T {
  const ticked = tick(state) as T
  const hours = ticked.gameTime.totalHours - state.gameTime.totalHours
  return v2Tick(ticked, hours, rng) as T
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/v2/__tests__/v2Tick.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole suite and commit**

Run: `npm test`
Expected: all v2 tests pass.

```bash
git add src/v2/v2Tick.ts src/v2/__tests__/v2Tick.test.ts
git commit -m "Add v2 tick composition over the legacy tick"
```

---

### Task 6: v2 saves + founder/feature reconciliation

**Files:**
- Create: `src/v2/saveV2.ts`
- Modify: `src/v2/founder.ts` (append `reconcileFounderFeatures`)
- Test: `src/v2/__tests__/saveV2.test.ts`

**Interfaces:**
- Consumes: `isValidV2Slice`, `V2GameState` from `./state`; `FOUNDER_ID` from `./founder`; `EVENTS` from `src/data/events`; `totalDays`.
- Produces:
  - `type SlotId = 1 | 2 | 3`
  - `interface SaveMetaV2 { slot: SlotId; startupName: string; idea: string; day: number; mrr: number; cash: number; savedAt: string; chapterComplete: boolean }`
  - `slotKeyV2(slot: SlotId): string` → `startup-game-v2-save-<slot>`
  - `saveGameV2(slot: SlotId, state: V2GameState): void`
  - `loadGameV2(slot: SlotId): V2GameState | null`
  - `listSavesV2(): (SaveMetaV2 | null)[]`
  - `deleteSaveV2(slot: SlotId): void`
  - `reconcileFounderFeatures(state: V2GameState): V2GameState` (in `founder.ts`)

- [ ] **Step 1: Write the failing test `src/v2/__tests__/saveV2.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { EVENTS } from '../../data/events'
import { FOUNDER_ID, reconcileFounderFeatures } from '../founder'
import { deleteSaveV2, listSavesV2, loadGameV2, saveGameV2, slotKeyV2 } from '../saveV2'
import { makeFeature, makeState, withChapter, withFounder, withV2 } from './fixtures'

function installLocalStorage(): Map<string, string> {
  const store = new Map<string, string>()
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)) },
    removeItem: (k: string) => { store.delete(k) },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size },
  } as Storage
  return store
}

let store: Map<string, string>
beforeEach(() => { store = installLocalStorage() })

describe('saveV2', () => {
  it('uses its own key prefix and never touches legacy slots', () => {
    saveGameV2(1, makeState())
    expect(slotKeyV2(1)).toBe('startup-game-v2-save-1')
    expect(store.has('startup-game-v2-save-1')).toBe(true)
    expect(store.has('startup-game-save-1')).toBe(false)
  })

  it('round-trips the v2 slice and restores the pending event by id', () => {
    const s = withV2(withChapter(makeState({ pendingEvent: EVENTS[1] }), { beat: 2 }), { leads: 7 })
    saveGameV2(2, s)
    const loaded = loadGameV2(2)!
    expect(loaded.v2.chapter.beat).toBe(2)
    expect(loaded.v2.leads).toBe(7)
    expect(loaded.pendingEvent?.id).toBe(EVENTS[1].id)
    expect(loaded.gameId).toBe(s.gameId)
  })

  it('rejects saves without a valid v2 slice or with a legacy id', () => {
    store.set(slotKeyV2(1), JSON.stringify({ meta: {}, state: { ...makeState(), v2: {} } }))
    expect(loadGameV2(1)).toBeNull()
    store.set(slotKeyV2(2), JSON.stringify({ meta: {}, state: { ...makeState(), gameId: 'game-123' } }))
    expect(loadGameV2(2)).toBeNull()
    store.set(slotKeyV2(3), 'not json')
    expect(loadGameV2(3)).toBeNull()
  })

  it('lists and deletes slots', () => {
    saveGameV2(3, withChapter(makeState(), { beat: 5, complete: true }))
    const metas = listSavesV2()
    expect(metas[0]).toBeNull()
    expect(metas[2]).toMatchObject({ slot: 3, startupName: 'Groomly', chapterComplete: true })
    deleteSaveV2(3)
    expect(listSavesV2()[2]).toBeNull()
  })
})

describe('reconcileFounderFeatures', () => {
  it('returns an orphaned founder build to proposed', () => {
    const orphan = makeFeature({ status: 'in_development', assignedToDevId: FOUNDER_ID, buildProgress: 0.4 })
    const fixed = reconcileFounderFeatures(makeState({ features: [orphan] }))
    expect(fixed.features[0]).toMatchObject({ status: 'proposed', buildProgress: 0 })
    expect(fixed.features[0].assignedToDevId).toBeUndefined()
  })

  it('drops a develop task that points at a missing feature', () => {
    const s = withFounder(makeState(), { task: { type: 'develop', featureId: 'nope', progress: 0.5 } })
    expect(reconcileFounderFeatures(s).v2.founder.task).toBeNull()
  })

  it('leaves a consistent in-progress build alone', () => {
    const building = makeFeature({ status: 'in_development', assignedToDevId: FOUNDER_ID, buildProgress: 0.4 })
    const s = withFounder(makeState({ features: [building] }), { task: { type: 'develop', featureId: 'feat-test', progress: 0.4 } })
    expect(reconcileFounderFeatures(s)).toBe(s)
  })

  it('runs on load', () => {
    const orphan = makeFeature({ status: 'in_development', assignedToDevId: FOUNDER_ID })
    saveGameV2(1, makeState({ features: [orphan] }))
    expect(loadGameV2(1)!.features[0].status).toBe('proposed')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/v2/__tests__/saveV2.test.ts`
Expected: FAIL — `Failed to resolve import "../saveV2"`.

- [ ] **Step 3: Append `reconcileFounderFeatures` to `src/v2/founder.ts`**

```ts
/**
 * Repairs a state where the founder's task and features disagree (hand-edited
 * or corrupted saves). An orphaned founder build goes back to "proposed" and a
 * develop task pointing at a missing feature is dropped.
 */
export function reconcileFounderFeatures(state: V2GameState): V2GameState {
  const task = state.v2.founder.task
  const buildingId = task?.type === 'develop' ? task.featureId : undefined
  const taskValid = !task || task.type !== 'develop' ||
    state.features.some(f => f.id === buildingId && f.status === 'in_development')

  let changed = false
  const features = state.features.map(f => {
    const orphaned = f.status === 'in_development' && f.assignedToDevId === FOUNDER_ID && (!taskValid || f.id !== buildingId)
    if (!orphaned) return f
    changed = true
    return { ...f, status: 'proposed' as const, assignedToDevId: undefined, buildProgress: 0 }
  })

  if (!changed && taskValid) return state
  return withTask({ ...state, features }, taskValid ? task : null)
}
```

- [ ] **Step 4: Implement `src/v2/saveV2.ts`**

```ts
import { EVENTS } from '../data/events'
import { totalDays } from '../engine/gameEngine'
import { reconcileFounderFeatures } from './founder'
import { isValidV2Slice, type V2GameState } from './state'

export type SlotId = 1 | 2 | 3

export interface SaveMetaV2 {
  slot: SlotId
  startupName: string
  idea: string
  day: number
  mrr: number
  cash: number
  savedAt: string
  chapterComplete: boolean
}

interface SaveEnvelopeV2 {
  meta: SaveMetaV2
  state: Record<string, unknown>
}

const KEY_PREFIX = 'startup-game-v2-save-'

export function slotKeyV2(slot: SlotId): string {
  return `${KEY_PREFIX}${slot}`
}

export function saveGameV2(slot: SlotId, state: V2GameState): void {
  const serializable: Record<string, unknown> = { ...state }
  serializable._pendingEventId = state.pendingEvent?.id ?? null
  serializable.pendingEvent = null
  serializable.pendingMilestoneToasts = []
  serializable.recentFeatureResults = []
  serializable.fullMetricsHistory = []

  const meta: SaveMetaV2 = {
    slot,
    startupName: state.startupName,
    idea: state.idea ?? '',
    day: totalDays(state.gameTime),
    mrr: state.mrr,
    cash: state.cash,
    savedAt: new Date().toISOString(),
    chapterComplete: state.v2.chapter.complete,
  }

  try {
    localStorage.setItem(slotKeyV2(slot), JSON.stringify({ meta, state: serializable } satisfies SaveEnvelopeV2))
  } catch (err) {
    console.error('[save-v2] Failed to save:', err)
  }
}

export function loadGameV2(slot: SlotId): V2GameState | null {
  try {
    const raw = localStorage.getItem(slotKeyV2(slot))
    if (!raw) return null
    const envelope = JSON.parse(raw) as Partial<SaveEnvelopeV2>
    const state = envelope.state as unknown as (V2GameState & { _pendingEventId?: string | null }) | undefined
    if (!state || typeof state !== 'object') return null
    if (typeof state.gameId !== 'string' || !state.gameId.startsWith('v2-')) return null
    if (!isValidV2Slice(state.v2)) return null

    const eventId = state._pendingEventId
    state.pendingEvent = eventId ? EVENTS.find(e => e.id === eventId) ?? null : null
    delete state._pendingEventId
    state.completedMilestoneIds = state.completedMilestoneIds ?? []
    state.pendingMilestoneToasts = state.pendingMilestoneToasts ?? []
    state.recentFeatureResults = state.recentFeatureResults ?? []
    state.fullMetricsHistory = state.fullMetricsHistory ?? []

    return reconcileFounderFeatures(state)
  } catch (err) {
    console.error('[save-v2] Failed to load:', err)
    return null
  }
}

export function listSavesV2(): (SaveMetaV2 | null)[] {
  const slots: SlotId[] = [1, 2, 3]
  return slots.map(slot => {
    try {
      const raw = localStorage.getItem(slotKeyV2(slot))
      if (!raw) return null
      return (JSON.parse(raw) as SaveEnvelopeV2).meta ?? null
    } catch {
      return null
    }
  })
}

export function deleteSaveV2(slot: SlotId): void {
  localStorage.removeItem(slotKeyV2(slot))
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: all v2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/v2/saveV2.ts src/v2/founder.ts src/v2/__tests__/saveV2.test.ts
git commit -m "Add v2 save slots with founder/feature reconciliation"
```

---

### Task 7: Store bridge + actions

**Files:**
- Create: `src/v2/actions.ts`
- Test: `src/v2/__tests__/actions.test.ts`

**Interfaces:**
- Consumes: legacy `useGameStore` (+ `GameSpeed` type) from `src/store/gameStore.ts`; `createDefaultState`; `playSfx`; `persistDayAnalytics` (dynamic import); everything from Tasks 1–6.
- Produces:
  - `type V2Store = ReturnType<typeof useGameStore.getState> & { v2: V2Slice }`
  - `useV2<T>(selector: (s: V2Store) => T): T`
  - `getV2State(): V2Store`
  - `resetStoreForV2(): void`
  - `stepGame(): void`
  - `newGameV2(config: OnboardingConfig): void`
  - `loadV2(slot: SlotId): boolean`
  - `startFounderTask(type: FounderTaskType, featureId?: string): StartTaskError | null`
  - `dismissCoachCard(id: string): void`, `reshowCoachCard(): void`
  - `pauseForModal(): void`, `claimFamilyMoney(): void`
  - `upgradeLegacyRestart(): void`

- [ ] **Step 1: Write the failing test `src/v2/__tests__/actions.test.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }))
vi.mock('../../analytics/persistDayAnalytics', () => ({ persistDayAnalytics: vi.fn(async () => {}) }))

import { useGameStore } from '../../store/gameStore'
import {
  claimFamilyMoney, getV2State, newGameV2, pauseForModal, resetStoreForV2,
  startFounderTask, stepGame, upgradeLegacyRestart,
} from '../actions'
import { isV2Game } from '../state'
import { makeConfig } from './fixtures'

beforeEach(() => resetStoreForV2())

describe('resetStoreForV2', () => {
  it('leaves a clean setup state with no v2 slice', () => {
    newGameV2(makeConfig())
    resetStoreForV2()
    const s = getV2State()
    expect(s.phase).toBe('setup')
    expect(s.v2).toBeUndefined()
    expect(s.gameSpeed).toBe(1)
  })
})

describe('newGameV2', () => {
  it('starts a v2 game in the shared store', () => {
    newGameV2(makeConfig())
    const s = getV2State()
    expect(isV2Game(s)).toBe(true)
    expect(s.cash).toBe(500)
    expect(s.phase).toBe('playing')
  })
})

describe('startFounderTask', () => {
  it('returns the reason and leaves the state alone when a task is locked', () => {
    newGameV2(makeConfig())
    expect(startFounderTask('emails')).toBe('locked')
    expect(getV2State().v2.founder.task).toBeNull()
  })

  it('starts an unlocked task', () => {
    newGameV2(makeConfig())
    expect(startFounderTask('research')).toBeNull()
    expect(getV2State().v2.founder.task?.type).toBe('research')
  })
})

describe('stepGame', () => {
  it('advances legacy time by one hour and the founder with it', () => {
    newGameV2(makeConfig())
    startFounderTask('research')
    stepGame()
    const s = getV2State()
    expect(s.gameTime.totalHours).toBe(1)
    expect(s.v2.founder.task?.progress).toBeCloseTo(1 / 72)
  })
})

describe('family money modal', () => {
  it('pauses, then restores the previous speed and pays out on claim', () => {
    newGameV2(makeConfig())
    const s = getV2State()
    useGameStore.setState({
      gameSpeed: 3,
      v2: { ...s.v2, chapter: { ...s.v2.chapter, beat: 5, familyMoney: { giver: 'Your cousin', amount: 900, claimed: false } } },
    } as never)
    pauseForModal()
    expect(getV2State().gameSpeed).toBe(0)
    claimFamilyMoney()
    const after = getV2State()
    expect(after.gameSpeed).toBe(3)
    expect(after.cash).toBe(500 + 900)
    expect(after.v2.chapter.complete).toBe(true)
  })
})

describe('upgradeLegacyRestart', () => {
  it('turns a legacy "Play Again" inside /new into a fresh v2 game', () => {
    newGameV2(makeConfig())
    useGameStore.getState().quickRestart() // legacy action → legacy-rules state, stale v2 slice
    expect(isV2Game(getV2State())).toBe(false)
    upgradeLegacyRestart()
    const s = getV2State()
    expect(isV2Game(s)).toBe(true)
    expect(s.cash).toBe(500)
  })

  it('does nothing for a legacy "New Game" (setup phase)', () => {
    newGameV2(makeConfig())
    useGameStore.getState().restartGame()
    upgradeLegacyRestart()
    expect(getV2State().phase).toBe('setup')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/v2/__tests__/actions.test.ts`
Expected: FAIL — `Failed to resolve import "../actions"`.

- [ ] **Step 3: Implement `src/v2/actions.ts`**

```ts
import { playSfx } from '../audio/sfx'
import { createDefaultState } from '../engine/gameEngine'
import { useGameStore, type GameSpeed } from '../store/gameStore'
import type { OnboardingConfig } from '../types'
import { claimFamilyMoney as claimFamilyMoneyPure, dismissCard, reshowCurrentCard } from './chapter'
import { startTask, type StartTaskError } from './founder'
import { loadGameV2, type SlotId } from './saveV2'
import { createV2State, isV2Game, type FounderTaskType, type V2GameState, type V2Slice } from './state'
import { stepV2 } from './v2Tick'

type LegacyStore = ReturnType<typeof useGameStore.getState>
export type V2Store = LegacyStore & { v2: V2Slice }

/**
 * Selector hook over the shared store. The selector MUST return a stored
 * reference or a primitive. Never build arrays or objects inside it
 * (Zustand v5 would re-render forever).
 */
export function useV2<T>(selector: (s: V2Store) => T): T {
  return useGameStore(s => selector(s as V2Store))
}

export function getV2State(): V2Store {
  return useGameStore.getState() as V2Store
}

function setV2State(next: Partial<V2Store> | V2GameState): void {
  useGameStore.setState(next as Partial<LegacyStore>)
}

function syncAnalytics(state: V2GameState): void {
  void import('../analytics/persistDayAnalytics')
    .then(({ persistDayAnalytics }) => persistDayAnalytics(state))
    .catch(err => { console.error('[analytics] v2 sync failed', err) })
}

/** Called on /new mount and unmount so a game never leaks between routes. */
export function resetStoreForV2(): void {
  setV2State({ ...createDefaultState(), gameSpeed: 1, v2: undefined } as unknown as Partial<V2Store>)
}

export function stepGame(): void {
  useGameStore.setState(s => stepV2(s as V2Store))
}

export function newGameV2(config: OnboardingConfig): void {
  const next = { ...createV2State(config), gameSpeed: 1 as GameSpeed }
  playSfx('whoosh', 0.45)
  setV2State(next)
  syncAnalytics(next)
}

export function loadV2(slot: SlotId): boolean {
  const saved = loadGameV2(slot)
  if (!saved) return false
  playSfx('whoosh', 0.45)
  const next = { ...saved, gameSpeed: 1 as GameSpeed }
  setV2State(next)
  syncAnalytics(next)
  return true
}

export function startFounderTask(type: FounderTaskType, featureId?: string): StartTaskError | null {
  const result = startTask(getV2State(), type, featureId)
  if (!result.ok) return result.reason
  playSfx('click', 0.45)
  setV2State(result.state)
  return null
}

export function dismissCoachCard(id: string): void {
  setV2State(dismissCard(getV2State(), id))
}

export function reshowCoachCard(): void {
  setV2State(reshowCurrentCard(getV2State()))
}

let speedBeforeModal: GameSpeed | null = null

export function pauseForModal(): void {
  const s = getV2State()
  if (speedBeforeModal === null) speedBeforeModal = s.gameSpeed === 0 ? 1 : s.gameSpeed
  setV2State({ gameSpeed: 0 })
}

export function claimFamilyMoney(): void {
  const next = claimFamilyMoneyPure(getV2State())
  playSfx('cashCredit', 0.7)
  setV2State({ ...next, gameSpeed: speedBeforeModal ?? 1 })
  speedBeforeModal = null
}

/**
 * Legacy PostMortem's "Play Again" calls the legacy quickRestart, which
 * builds a legacy-rules game. Inside /new, turn that into a v2 game.
 */
export function upgradeLegacyRestart(): void {
  const s = getV2State()
  if (s.phase !== 'playing' || isV2Game(s)) return
  if (s.lastConfig) newGameV2(s.lastConfig)
  else resetStoreForV2()
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: all v2 tests pass.

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit -p .`
Expected: no output.

```bash
git add src/v2/actions.ts src/v2/__tests__/actions.test.ts
git commit -m "Add v2 store bridge and actions"
```

---

### Task 8: Game-screen UI pieces

**Files:**
- Create: `src/v2/v2.css`
- Create: `src/v2/BottomNavV2.tsx`
- Create: `src/v2/PlaceholderRoom.tsx`
- Create: `src/v2/FounderPanel.tsx`
- Create: `src/v2/FamilyMoneyModal.tsx`
- Create: `src/v2/TopBarV2.tsx` (copied from `src/components/TopBar.tsx`, then edited)

**Interfaces:**
- Consumes: `useV2`, `startFounderTask`, `dismissCoachCard`, `pauseForModal`, `claimFamilyMoney` from `./actions`; `currentCoachCard`, `isTaskUnlocked` from `./chapter`; `taskDurationDays`, `FOUNDER_BUILD_SPEED` from `./founder`; `saveGameV2`, `listSavesV2`, `SaveMetaV2`, `SlotId` from `./saveV2`.
- Produces:
  - `type V2Panel = 'founder' | 'metrics'`
  - `BottomNavV2({ active: V2Panel; metricsUnlocked: boolean; onTabClick(p: V2Panel) })`
  - `PlaceholderRoom()`, `FounderPanel()`, `FamilyMoneyModal()`
  - `TopBarV2({ onShowTutorial?: () => void })`

- [ ] **Step 1: Create `src/v2/v2.css`**

```css
/* v2 founder journey. Colors come from src/styles/colors.css tokens. */

.v2-room { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 16px;
  background: radial-gradient(circle at 50% 40%, var(--surface) 0%, var(--surface2) 100%); }
.v2-room-card { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding: 2rem 2.5rem;
  min-width: 260px; max-width: 100%; text-align: center; background: var(--surface); border: 1px solid var(--border);
  border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
.v2-room-label { font-size: 0.8rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.v2-room-avatar-wrap { position: relative; width: 80px; height: 80px; }
.v2-room-avatar { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; }
.v2-ring { position: absolute; inset: 0; }
.v2-ring-track { fill: none; stroke: var(--surface2); stroke-width: 6; }
.v2-ring-fill { fill: none; stroke: var(--brand-primary); stroke-width: 6; stroke-linecap: round; transition: stroke-dashoffset 0.4s ease; }
.v2-room-status { font-size: 1rem; font-weight: 600; color: var(--text); }
.v2-room-sub { font-size: 0.8rem; color: var(--muted); }

.v2-founder { display: flex; flex-direction: column; gap: 0.25rem; }
.v2-banner { padding: 0.75rem 0.9rem; border-radius: 10px; background: rgba(var(--success-rgb), 0.12); color: var(--text); font-size: 0.85rem; line-height: 1.45; }
.v2-coach { padding: 0.9rem 1rem; border-radius: 12px; border: 1px solid rgba(var(--accent-rgb), 0.5); background: rgba(var(--accent-rgb), 0.12); }
.v2-coach-title { font-weight: 700; color: var(--brand-primary); margin-bottom: 0.3rem; }
.v2-coach-body { margin: 0 0 0.6rem; font-size: 0.88rem; line-height: 1.5; color: var(--text); }
.v2-muted { font-size: 0.85rem; color: var(--muted); }

.v2-progress { flex: 1; height: 8px; border-radius: 4px; background: var(--surface2); overflow: hidden; }
.v2-progress-fill { height: 100%; background: var(--brand-primary); border-radius: 4px; transition: width 0.3s ease; }
.v2-task-now { display: flex; flex-direction: column; gap: 0.4rem; }
.v2-task-now-title { font-weight: 600; color: var(--text); }
.v2-task-now-meta { font-size: 0.78rem; color: var(--muted); font-family: 'Roboto Mono', monospace; }

.v2-task-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
.v2-task-btn { display: flex; flex-direction: column; align-items: flex-start; gap: 0.2rem; padding: 0.7rem; border-radius: 10px;
  border: 1px solid var(--border); background: var(--surface); color: var(--text); text-align: left; cursor: pointer; font: inherit;
  transition: border-color 0.15s, box-shadow 0.15s; }
.v2-task-btn:hover:not(:disabled) { border-color: var(--brand-primary); box-shadow: 0 3px 10px rgba(0,0,0,0.06); }
.v2-task-btn:disabled { opacity: 0.55; cursor: default; }
.v2-task-icon { font-size: 1.2rem; }
.v2-task-name { font-weight: 600; font-size: 0.88rem; }
.v2-task-hint { font-size: 0.72rem; color: var(--muted); line-height: 1.35; }

.v2-feature { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0; border-bottom: 1px solid var(--border); }
.v2-feature:last-child { border-bottom: none; }
.v2-feature-main { flex: 1; min-width: 0; }
.v2-feature-title { font-weight: 600; font-size: 0.88rem; color: var(--text); }
.v2-feature-desc { font-size: 0.76rem; color: var(--muted); }

.v2-funnel { display: flex; align-items: center; gap: 0.8rem; }
.v2-funnel-step { display: flex; flex-direction: column; align-items: center; min-width: 70px; padding: 0.5rem; border-radius: 10px; background: var(--surface2); }
.v2-funnel-num { font-family: 'Roboto Mono', monospace; font-weight: 700; font-size: 1.2rem; color: var(--brand-primary); }
.v2-funnel-label { font-size: 0.72rem; color: var(--muted); }
.v2-funnel-arrow { color: var(--muted); }

.v2-skill { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.4rem; }
.v2-skill-name { width: 72px; font-size: 0.8rem; color: var(--muted); }
.v2-skill-val { width: 32px; text-align: right; font-family: 'Roboto Mono', monospace; font-size: 0.78rem; color: var(--text); }

.v2-btn { padding: 0.45rem 0.8rem; border-radius: 8px; border: 1px solid var(--brand-primary); background: transparent;
  color: var(--brand-primary); font: inherit; font-size: 0.8rem; font-weight: 600; cursor: pointer; white-space: nowrap; }
.v2-btn:disabled { opacity: 0.5; cursor: default; }
.v2-btn-primary { background: var(--brand-primary); color: var(--brand-bg); }
.v2-btn-ghost { border-color: var(--border); color: var(--text); }

.v2-modal-backdrop { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center;
  padding: 16px; background: rgba(0,0,0,0.35); }
.v2-modal { width: 100%; max-width: 420px; padding: 1.8rem; border-radius: 16px; background: var(--surface);
  border: 1px solid var(--border); box-shadow: 0 20px 50px rgba(0,0,0,0.2); text-align: center; }
.v2-modal-icon { font-size: 2.4rem; }
.v2-modal-title { margin: 0.5rem 0; font-size: 1.3rem; color: var(--brand-primary); }
.v2-modal-body { font-size: 0.92rem; line-height: 1.55; color: var(--text); }
.v2-modal-amount { margin: 1rem 0 1.2rem; font-family: 'Roboto Mono', monospace; font-size: 2rem; font-weight: 700; color: var(--success); }

@media (max-width: 640px) {
  .v2-task-grid { grid-template-columns: 1fr; }
  .v2-room-card { padding: 1.4rem; min-width: 0; }
}
```

- [ ] **Step 2: Create `src/v2/BottomNavV2.tsx`**

```tsx
import '../components/BottomNav.css'

export type V2Panel = 'founder' | 'metrics'

const TABS: { id: V2Panel; label: string; icon: string }[] = [
  { id: 'founder', label: 'Founder', icon: '🧑‍💻' },
  { id: 'metrics', label: 'Metrics', icon: '📊' },
]

interface Props {
  active: V2Panel
  metricsUnlocked: boolean
  onTabClick: (panel: V2Panel) => void
}

export function BottomNavV2({ active, metricsUnlocked, onTabClick }: Props) {
  const tabs = TABS.filter(t => t.id !== 'metrics' || metricsUnlocked)
  return (
    <nav className="bottom-nav">
      {tabs.map(tab => (
        <button
          key={tab.id}
          data-panel={tab.id}
          className={`bn-tab ${active === tab.id ? 'bn-tab--active' : ''}`}
          onClick={() => onTabClick(tab.id)}
        >
          <span className="bn-icon" aria-hidden="true">{tab.icon}</span>
          <span className="bn-label">{tab.label}</span>
          {active === tab.id && <span className="bn-indicator" />}
        </button>
      ))}
    </nav>
  )
}
```

- [ ] **Step 3: Create `src/v2/PlaceholderRoom.tsx`**

```tsx
import { useV2 } from './actions'
import type { FounderTaskType } from './state'
import './v2.css'

const STATUS: Record<FounderTaskType, string> = {
  research: 'Researching your market…',
  develop: 'Building…', // replaced with the feature title below
  emails: 'Writing cold emails…',
  sales: 'On sales calls…',
}

const R = 34
const CIRC = 2 * Math.PI * R

/** Phase 1 stand-in for the 2.5D room. Phase 2 replaces it with the R3F canvas. */
export function PlaceholderRoom() {
  const task = useV2(s => s.v2.founder.task)
  const features = useV2(s => s.features)
  const startupName = useV2(s => s.startupName)

  let status = 'Taking a breather'
  if (task) {
    const title = task.type === 'develop' ? features.find(f => f.id === task.featureId)?.title : undefined
    status = task.type === 'develop' ? `Building ${title ?? 'a feature'}…` : STATUS[task.type]
  }
  const pct = task ? task.progress : 0

  return (
    <div className="v2-room">
      <div className="v2-room-card">
        <div className="v2-room-label">🏠 Home</div>
        <div className="v2-room-avatar-wrap">
          <svg className="v2-ring" viewBox="0 0 80 80" width="80" height="80" aria-hidden="true">
            <circle cx="40" cy="40" r={R} className="v2-ring-track" />
            <circle
              cx="40" cy="40" r={R}
              className="v2-ring-fill"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - pct)}
              transform="rotate(-90 40 40)"
            />
          </svg>
          <div className="v2-room-avatar" aria-hidden="true">🧑‍💻</div>
        </div>
        <div className="v2-room-status" role="status">{status}</div>
        <div className="v2-room-sub">{startupName}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/v2/FounderPanel.tsx`**

```tsx
import { dismissCoachCard, startFounderTask, useV2 } from './actions'
import { currentCoachCard, isTaskUnlocked } from './chapter'
import { FOUNDER_BUILD_SPEED, taskDurationDays } from './founder'
import type { FounderSkill, FounderTaskType } from './state'
import '../components/RightPanel.css'
import './v2.css'

const TASK_INFO: Record<FounderTaskType, { icon: string; name: string; hint: string }> = {
  research: { icon: '🔍', name: 'Research', hint: 'Find 2 concrete things worth building' },
  develop:  { icon: '🛠️', name: 'Develop', hint: 'Build a feature yourself' },
  emails:   { icon: '✉️', name: 'Send emails', hint: 'Cold outreach brings in leads' },
  sales:    { icon: '🤝', name: 'Sell', hint: 'Turn leads into paying customers' },
}

const UNLOCK_HINT: Record<FounderTaskType, string> = {
  research: '',
  develop: 'Unlocks after your first research',
  emails: 'Unlocks after you ship your first feature',
  sales: 'Unlocks after your first emails',
}

const SKILL_LABEL: Record<FounderSkill, string> = {
  research: 'Research',
  build: 'Build',
  outreach: 'Outreach',
  sales: 'Sales',
}

const TASK_BUTTONS: FounderTaskType[] = ['research', 'emails', 'sales']

export function FounderPanel() {
  // Selectors return stored references only (see useV2 docs); derive below.
  const v2 = useV2(s => s.v2)
  const features = useV2(s => s.features)
  const customers = useV2(s => s.customers)

  const card = currentCoachCard({ v2 })
  const task = v2.founder.task
  const busy = task !== null
  const proposed = features.filter(f => f.status === 'proposed')
  const shipped = features.filter(f => f.status === 'completed').length
  const developUnlocked = isTaskUnlocked({ v2 }, 'develop')

  const taskDays = task ? taskDurationDays({ features }, task.type, task.featureId) : 0
  const daysLeft = task ? Math.max(0, Math.ceil((1 - task.progress) * taskDays)) : 0
  const taskTitle = task?.type === 'develop'
    ? `Building ${features.find(f => f.id === task.featureId)?.title ?? 'a feature'}`
    : task ? TASK_INFO[task.type].name : ''

  function reasonFor(type: FounderTaskType): string | null {
    if (!isTaskUnlocked({ v2 }, type)) return UNLOCK_HINT[type]
    if (busy) return 'Finish your current task first'
    if (type === 'sales' && v2.leads < 1) return 'No leads yet. Send emails first'
    return null
  }

  return (
    <aside className="right-panel right-panel--open">
      <div className="rp-header">
        <span className="rp-title">Founder</span>
      </div>
      <div className="rp-body">
        <div className="rp-scroll">
          <div className="rp-content v2-founder">
            {v2.chapter.complete && (
              <div className="v2-banner">
                Chapter 1 complete. <strong>Chapter 2: your first hire</strong> is coming soon. Keep growing on your own until then.
              </div>
            )}

            {card && (
              <div className="v2-coach">
                <div className="v2-coach-title">{card.title}</div>
                <p className="v2-coach-body">{card.body}</p>
                <button className="v2-btn v2-btn-ghost" onClick={() => dismissCoachCard(card.id)}>Got it</button>
              </div>
            )}

            <section className="rp-section">
              <div className="rp-section-label">Right now</div>
              {task ? (
                <div className="v2-task-now">
                  <div className="v2-task-now-title">{TASK_INFO[task.type].icon} {taskTitle}</div>
                  <div className="v2-progress">
                    <div className="v2-progress-fill" style={{ width: `${Math.round(task.progress * 100)}%` }} />
                  </div>
                  <div className="v2-task-now-meta">{Math.round(task.progress * 100)}% · ~{daysLeft}d left</div>
                </div>
              ) : (
                <div className="v2-muted">Nothing in progress. Pick a task below.</div>
              )}
            </section>

            <section className="rp-section">
              <div className="rp-section-label">Tasks</div>
              <div className="v2-task-grid">
                {TASK_BUTTONS.map(type => {
                  const reason = reasonFor(type)
                  return (
                    <button
                      key={type}
                      className="v2-task-btn"
                      disabled={reason !== null}
                      onClick={() => startFounderTask(type)}
                    >
                      <span className="v2-task-icon" aria-hidden="true">{TASK_INFO[type].icon}</span>
                      <span className="v2-task-name">{TASK_INFO[type].name}</span>
                      <span className="v2-task-hint">{reason ?? TASK_INFO[type].hint}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            {developUnlocked && (
              <section className="rp-section">
                <div className="rp-section-label">Build next · {shipped} shipped</div>
                {proposed.length === 0 ? (
                  <div className="v2-muted">No ideas queued. Research to find more.</div>
                ) : (
                  proposed.map(f => (
                    <div key={f.id} className="v2-feature">
                      <div className="v2-feature-main">
                        <div className="v2-feature-title">{f.title}</div>
                        <div className="v2-feature-desc">{f.description}</div>
                      </div>
                      <button className="v2-btn" disabled={busy} onClick={() => startFounderTask('develop', f.id)}>
                        Build · {Math.ceil(f.baseDays / FOUNDER_BUILD_SPEED)}d
                      </button>
                    </div>
                  ))
                )}
              </section>
            )}

            <section className="rp-section">
              <div className="rp-section-label">Funnel</div>
              <div className="v2-funnel">
                <div className="v2-funnel-step">
                  <span className="v2-funnel-num">{v2.leads}</span>
                  <span className="v2-funnel-label">Leads</span>
                </div>
                <span className="v2-funnel-arrow" aria-hidden="true">→</span>
                <div className="v2-funnel-step">
                  <span className="v2-funnel-num">{customers}</span>
                  <span className="v2-funnel-label">Customers</span>
                </div>
              </div>
            </section>

            <section className="rp-section">
              <div className="rp-section-label">Your skills</div>
              {(Object.keys(SKILL_LABEL) as FounderSkill[]).map(k => (
                <div key={k} className="v2-skill">
                  <span className="v2-skill-name">{SKILL_LABEL[k]}</span>
                  <div className="v2-progress">
                    <div className="v2-progress-fill" style={{ width: `${(v2.founder.skills[k] / 10) * 100}%` }} />
                  </div>
                  <span className="v2-skill-val">{v2.founder.skills[k].toFixed(1)}</span>
                </div>
              ))}
            </section>
          </div>
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 5: Create `src/v2/FamilyMoneyModal.tsx`**

```tsx
import { useEffect } from 'react'
import { claimFamilyMoney, pauseForModal, useV2 } from './actions'
import './v2.css'

export function FamilyMoneyModal() {
  const money = useV2(s => s.v2.chapter.familyMoney)

  useEffect(() => { pauseForModal() }, [])

  if (!money || money.claimed) return null

  return (
    <div className="v2-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="v2-family-title">
      <div className="v2-modal">
        <div className="v2-modal-icon" aria-hidden="true">💌</div>
        <h2 id="v2-family-title" className="v2-modal-title">Someone believes in you</h2>
        <p className="v2-modal-body">
          {money.giver} saw your first paying customer and wants to help. It isn&apos;t a funding round, just belief,
          and it&apos;s enough to take the next step.
        </p>
        <div className="v2-modal-amount">+${money.amount.toLocaleString()}</div>
        <button className="v2-btn v2-btn-primary" onClick={claimFamilyMoney} autoFocus>
          Accept, and thank them
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create `src/v2/TopBarV2.tsx` from the legacy TopBar**

Run:
```bash
cp src/components/TopBar.tsx src/v2/TopBarV2.tsx
```

Then make these exact replacements in `src/v2/TopBarV2.tsx` (and nowhere else). In the table, `\|` is a Markdown-escaped `|`, and `<br>` means a line break.

| Find | Replace with |
|---|---|
| `import { saveGame, listSaves, type SlotId, type SaveMeta } from '../save/saveManager'` | `import { saveGameV2, listSavesV2, type SlotId, type SaveMetaV2 } from './saveV2'`<br>`import type { V2GameState } from './state'` |
| `import { Avatar } from './Avatar'` | `import { Avatar } from '../components/Avatar'` |
| `import { SellCompanyModal } from './SellCompanyModal'` | `import { SellCompanyModal } from '../components/SellCompanyModal'` |
| `import './TopBar.css'` | `import '../components/TopBar.css'` |
| `export function TopBar({ onShowTutorial }: TopBarProps) {` | `export function TopBarV2({ onShowTutorial }: TopBarProps) {` |
| `    saveGame(slot, state as any)` | `    saveGameV2(slot, state as unknown as V2GameState)` |
| `const meta: SaveMeta \| null = listSaves()[slot - 1]` | `const meta: SaveMetaV2 \| null = listSavesV2()[slot - 1]` |
| `  const cashWarn   = cash < 50_000` | `  const runwayMonths = burn > 0 ? cash / burn : Infinity`<br>`  const cashWarn   = runwayMonths < 6` |
| `  const cashDanger = cash < 20_000` | `  const cashDanger = runwayMonths < 3` |
| `📖 Show Tutorial` | `📖 Show Tip Again` |

Why the cash change: the legacy thresholds ($50k warn / $20k danger) would paint a solo founder's $500 red all game. Runway-based warnings mean the same thing at any scale.

- [ ] **Step 7: Verify no legacy save/tutorial references remain in the copy**

Run: `grep -n "saveManager\|saveGame(\|listSaves()\|export function TopBar(" src/v2/TopBarV2.tsx`
Expected: no output.

- [ ] **Step 8: Check the selector rule (Review Focus #1)**

Run: `grep -rnE "useV2\(s => [^)]*\.(filter|map|slice|reduce)\(" src/v2 ; grep -rnE "useV2\(s => \(?\{" src/v2`
Expected: no output.

- [ ] **Step 9: Typecheck and commit**

Run: `npx tsc --noEmit -p .`
Expected: no output.

```bash
git add src/v2/v2.css src/v2/BottomNavV2.tsx src/v2/PlaceholderRoom.tsx src/v2/FounderPanel.tsx src/v2/FamilyMoneyModal.tsx src/v2/TopBarV2.tsx
git commit -m "Add v2 game screen UI pieces"
```

---

### Task 9: OnboardingV2

**Files:**
- Create: `src/v2/OnboardingV2.tsx`

**Interfaces:**
- Consumes: `validateIdea`, `generateRoadmap`, `scoreToDifficulty`, `tierLabel`, `tierColor`, `IdeaValidation` from `src/ai/gemini`; `newGameV2`, `loadV2` from `./actions`; `listSavesV2`, `deleteSaveV2`, `SaveMetaV2`, `SlotId` from `./saveV2`; `src/components/Onboarding.css`.
- Produces: `OnboardingV2()`.

- [ ] **Step 1: Create `src/v2/OnboardingV2.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { generateRoadmap, scoreToDifficulty, tierColor, tierLabel, validateIdea } from '../ai/gemini'
import type { IdeaValidation } from '../ai/gemini'
import type { FeatureTemplate } from '../data/featureTemplates'
import type { OnboardingConfig } from '../types'
import { loadV2, newGameV2 } from './actions'
import { deleteSaveV2, listSavesV2, type SaveMetaV2, type SlotId } from './saveV2'
import '../components/Onboarding.css'

type Step = 'idea' | 'assessment' | 'name'

const SLOT_LABELS: Record<SlotId, string> = { 1: 'Auto-save', 2: 'Save 2', 3: 'Save 3' }

function pct(mult: number): string {
  const diff = Math.round((mult - 1) * 100)
  return diff > 0 ? `+${diff}% easier` : diff < 0 ? `${diff}% harder` : 'Standard'
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

export function OnboardingV2() {
  const [saves, setSaves] = useState<(SaveMetaV2 | null)[]>([null, null, null])
  const [step, setStep] = useState<Step>('idea')
  const [idea, setIdea] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [validation, setValidation] = useState<IdeaValidation | null>(null)
  const [startupName, setStartupName] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => { setSaves(listSavesV2()) }, [])

  const hasSaves = saves.some(s => s !== null)

  function handleLoad(slot: SlotId) {
    setLoadError(null)
    if (!loadV2(slot)) setLoadError("That save couldn't be loaded. It may be from an older version.")
  }

  function handleDelete(slot: SlotId) {
    deleteSaveV2(slot)
    setSaves(listSavesV2())
  }

  async function handleValidate() {
    if (!idea.trim() || loading) return
    setLoading(true)
    setLoadingMsg('Analyzing your idea...')
    try {
      const result = await validateIdea(idea.trim())
      setValidation(result)
      setStep('assessment')
    } finally {
      setLoading(false)
    }
  }

  async function handleLaunch() {
    if (loading || !validation) return
    setLoading(true)
    setLoadingMsg('Mapping out what to build...')
    try {
      const roadmap: FeatureTemplate[] = await generateRoadmap(validation.idea, validation.score)
      const difficulty = scoreToDifficulty(validation.score)
      const rawName = startupName.trim() || 'My Startup'
      const sanitized = rawName.replace(/[^\w\s\-.&']/g, '').trim()
      const finalName = sanitized.length > 0 ? sanitized.slice(0, 40) : 'My Startup'
      const config: OnboardingConfig = {
        idea: validation.idea,
        ideaScore: validation.score,
        ideaFeedback: validation.feedback,
        workspace: 'home',
        startupName: finalName,
        aiRoadmap: roadmap,
        difficulty,
      }
      newGameV2(config)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="ob-screen">
        <div className="ob-card ob-loading-card">
          <div className="ob-spinner" />
          <p className="ob-loading-text">{loadingMsg}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="ob-screen">
      {step === 'idea' && hasSaves && (
        <div className="ob-saves-section">
          <h3 className="ob-saves-title">Continue Playing</h3>
          {loadError && <p className="ob-hint" role="alert">{loadError}</p>}
          <div className="ob-saves-grid">
            {saves.map((meta, i) => {
              const slot = (i + 1) as SlotId
              if (!meta) return null
              return (
                <div key={slot} className="ob-save-card">
                  <div className="ob-save-slot-label">{SLOT_LABELS[slot]}</div>
                  <div className="ob-save-name">{meta.startupName}</div>
                  <div className="ob-save-idea">{meta.idea.length > 60 ? meta.idea.slice(0, 60) + '…' : meta.idea}</div>
                  <div className="ob-save-stats">
                    <span>Day {meta.day}</span>
                    <span>${meta.mrr.toLocaleString()} MRR</span>
                    <span>{meta.chapterComplete ? 'Chapter 1 ✓' : 'Chapter 1'}</span>
                  </div>
                  <div className="ob-save-date">{formatDate(meta.savedAt)}</div>
                  <div className="ob-save-actions">
                    <button className="ob-btn ob-btn-primary ob-btn-sm" onClick={() => handleLoad(slot)}>Load</button>
                    <button className="ob-btn ob-btn-danger ob-btn-sm" onClick={() => handleDelete(slot)}>Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="ob-saves-divider">
            <span>or start a new game</span>
          </div>
        </div>
      )}

      {step === 'idea' && (
        <div className="ob-card">
          <div className="ob-logo">🚀 STARTUP</div>
          <p className="ob-tagline">Start with nothing but an idea.</p>

          <div className="ob-step-label">Step 1 of 3</div>
          <h2 className="ob-heading">What's your big idea?</h2>
          <p className="ob-hint">Describe the startup you want to build. You'll start alone at home and build it step by step.</p>

          <textarea
            className="ob-textarea"
            placeholder="e.g. An AI-powered tool that helps freelancers auto-generate invoices from time tracking data..."
            value={idea}
            onChange={e => setIdea(e.target.value)}
            rows={4}
            maxLength={500}
            autoFocus
          />
          <div className="ob-char-count">{idea.length}/500</div>

          <button className="ob-btn ob-btn-primary" onClick={handleValidate} disabled={idea.trim().length < 10}>
            Validate My Idea →
          </button>
        </div>
      )}

      {step === 'assessment' && validation && (() => {
        const diff = scoreToDifficulty(validation.score)
        return (
          <div className="ob-card ob-card-wide">
            <div className="ob-step-label">Step 2 of 3</div>
            <h2 className="ob-heading">AI Assessment</h2>

            <div className="ob-idea-echo">"{validation.idea}"</div>

            <div className="ob-score-section">
              <div className="ob-score-bar-wrap">
                <div className="ob-score-bar" style={{ width: `${validation.score * 10}%`, background: tierColor(diff.tier) }} />
              </div>
              <div className="ob-score-row">
                <span className="ob-score-num" style={{ color: tierColor(diff.tier) }}>{validation.score}/10</span>
                <span className="ob-difficulty-badge" style={{ background: tierColor(diff.tier) }}>{tierLabel(diff.tier)}</span>
              </div>
            </div>

            <p className="ob-feedback">{validation.feedback}</p>

            <div className="ob-two-col">
              <div className="ob-col">
                <h4 className="ob-col-title ob-col-title--green">Strengths</h4>
                <ul className="ob-list">{validation.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
              <div className="ob-col">
                <h4 className="ob-col-title ob-col-title--red">Risks</h4>
                <ul className="ob-list">{validation.risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
              </div>
            </div>

            {validation.suggestion && (
              <div className="ob-suggestion"><strong>Suggestion:</strong> {validation.suggestion}</div>
            )}

            <div className="ob-difficulty-detail">
              <h4>Difficulty Effects</h4>
              <div className="ob-diff-grid">
                <span>Feature impact on users</span><span>{pct(diff.featureImpactMultiplier)}</span>
                <span>Minimum churn rate</span><span>{diff.churnFloor}%/mo</span>
                <span>Investor interest</span><span>{pct(diff.investorInterestRate)}</span>
              </div>
            </div>

            <div className="ob-actions">
              <button className="ob-btn ob-btn-secondary" onClick={() => setStep('idea')}>← Tweak My Idea</button>
              <button className="ob-btn ob-btn-primary" onClick={() => setStep('name')}>Continue →</button>
            </div>
          </div>
        )
      })()}

      {step === 'name' && (
        <div className="ob-card">
          <div className="ob-step-label">Step 3 of 3</div>
          <h2 className="ob-heading">Name Your Startup</h2>
          <p className="ob-hint">What will you call it?</p>

          <input
            className="ob-input"
            type="text"
            placeholder="e.g. Acme Inc."
            value={startupName}
            maxLength={40}
            onChange={e => setStartupName(e.target.value.replace(/[^\w\s\-.&']/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleLaunch()}
            autoFocus
          />

          <div className="ob-summary">
            <div className="ob-summary-row"><span>Idea</span><span className="ob-summary-val">{validation?.idea.slice(0, 50)}...</span></div>
            <div className="ob-summary-row"><span>Difficulty</span><span className="ob-summary-val">{validation ? tierLabel(scoreToDifficulty(validation.score).tier) : '—'}</span></div>
            <div className="ob-summary-row"><span>Starting point</span><span className="ob-summary-val">🏠 Home · $500 savings</span></div>
          </div>

          <div className="ob-actions">
            <button className="ob-btn ob-btn-secondary" onClick={() => setStep('assessment')}>← Back</button>
            <button className="ob-btn ob-btn-primary" onClick={handleLaunch}>Start at Home →</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `npx tsc --noEmit -p .`
Expected: no output.

```bash
git add src/v2/OnboardingV2.tsx
git commit -m "Add v2 onboarding without the workspace step"
```

---

### Task 10: AppV2 shell, GameScreenV2, `/new` route, verification

**Files:**
- Create: `src/v2/GameScreenV2.tsx`
- Create: `src/v2/AppV2.tsx`
- Modify: `src/router.tsx` (lazy import + route)

**Interfaces:**
- Consumes: everything above; legacy `RightPanel`, `RunwayBanner`, `FeatureResultToasts`, `MilestoneToastQueue`, `EventCard`, `PostMortem`, `InvestorCheckin`, `src/App.css`.
- Produces: default export `AppV2` (route component); `GameScreenV2()`.

- [ ] **Step 1: Create `src/v2/GameScreenV2.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { EventCard } from '../components/EventCard'
import { FeatureResultToasts } from '../components/FeatureResultToast'
import { MilestoneToastQueue } from '../components/MilestoneToast'
import { RightPanel } from '../components/RightPanel'
import { RunwayBanner } from '../components/RunwayBanner'
import { getV2State, reshowCoachCard, stepGame, useV2 } from './actions'
import { BottomNavV2, type V2Panel } from './BottomNavV2'
import { isMetricsUnlocked } from './chapter'
import { FamilyMoneyModal } from './FamilyMoneyModal'
import { FounderPanel } from './FounderPanel'
import { PlaceholderRoom } from './PlaceholderRoom'
import { saveGameV2 } from './saveV2'
import { isV2Game } from './state'
import { TopBarV2 } from './TopBarV2'
import '../App.css'

const AUTOSAVE_MS = 30_000

export function GameScreenV2() {
  const phase = useV2(s => s.phase)
  const gameSpeed = useV2(s => s.gameSpeed)
  const v2 = useV2(s => s.v2)
  const pendingMilestoneToasts = useV2(s => s.pendingMilestoneToasts)
  const dismissMilestoneToast = useV2(s => s.dismissMilestoneToast)
  const [panel, setPanel] = useState<V2Panel>('founder')

  const metricsUnlocked = isMetricsUnlocked({ v2 })
  const { chapter } = v2
  const showFamilyMoney = chapter.beat === 5 && !!chapter.familyMoney && !chapter.familyMoney.claimed

  useEffect(() => {
    if (phase !== 'playing' || gameSpeed === 0) return
    const id = setInterval(stepGame, Math.floor(1000 / gameSpeed))
    return () => clearInterval(id)
  }, [phase, gameSpeed])

  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => {
      const s = getV2State()
      if (s.phase === 'playing' && isV2Game(s)) saveGameV2(1, s)
    }, AUTOSAVE_MS)
    return () => clearInterval(id)
  }, [phase])

  return (
    <div className="game-root">
      <TopBarV2 onShowTutorial={reshowCoachCard} />
      <div className="game-topbar-spacer" />
      <RunwayBanner />
      <div className="game-main">
        <div className="game-canvas-area">
          <PlaceholderRoom />
          <BottomNavV2 active={panel} metricsUnlocked={metricsUnlocked} onTabClick={setPanel} />
        </div>
        {panel === 'metrics' && metricsUnlocked ? <RightPanel activePanel="metrics" /> : <FounderPanel />}
      </div>
      <FeatureResultToasts />
      <MilestoneToastQueue toasts={pendingMilestoneToasts} onDismiss={dismissMilestoneToast} />
      {chapter.complete && <EventCard />}
      {showFamilyMoney && <FamilyMoneyModal />}
    </div>
  )
}
```

- [ ] **Step 2: Create `src/v2/AppV2.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { InvestorCheckin } from '../components/InvestorCheckin'
import { PostMortem } from '../components/PostMortem'
import { resetStoreForV2, upgradeLegacyRestart, useV2 } from './actions'
import { GameScreenV2 } from './GameScreenV2'
import { OnboardingV2 } from './OnboardingV2'
import { isV2Game } from './state'

export default function AppV2() {
  const [ready, setReady] = useState(false)
  const phase = useV2(s => s.phase)
  const isV2 = useV2(s => isV2Game(s))
  const chapterComplete = useV2(s => s.v2?.chapter.complete ?? false)

  // Start clean and leave clean, so a game never leaks between / and /new.
  useEffect(() => {
    resetStoreForV2()
    setReady(true)
    return () => resetStoreForV2()
  }, [])

  // Legacy PostMortem "Play Again" builds a legacy-rules game; turn it into a v2 one.
  useEffect(() => {
    if (ready && phase === 'playing' && !isV2) upgradeLegacyRestart()
  }, [ready, phase, isV2])

  if (!ready) return null
  if (phase === 'setup') return <OnboardingV2 />
  if (phase === 'sold' || phase === 'lost') return <><PostMortem />{chapterComplete && <InvestorCheckin />}</>
  if (!isV2) return null
  return <><GameScreenV2 />{chapterComplete && <InvestorCheckin />}</>
}
```

- [ ] **Step 3: Add the `/new` route in `src/router.tsx` (the only legacy edit)**

Find:
```tsx
const App            = lazy(() => import('./App'))
```
Replace with:
```tsx
const App            = lazy(() => import('./App'))
const AppV2          = lazy(() => import('./v2/AppV2'))
```

Find:
```tsx
  { path: '/admin', element: route(<AdminDashboard />) },
```
Replace with:
```tsx
  { path: '/new', element: route(<AppV2 />) },
  { path: '/admin', element: route(<AdminDashboard />) },
```

- [ ] **Step 4: Run all automated gates**

Run: `npm test && npx tsc --noEmit -p . && npm run build`
Expected: all tests pass, no type errors, `✓ built`.

- [ ] **Step 5: Legacy guard**

Run: `git diff main --stat -- . ':!src/v2' ':!docs'`
Expected: only `package.json`, `package-lock.json`, `src/router.tsx`, `vitest.config.ts`.

- [ ] **Step 6: Manual playthrough of `/new`**

Run: `npm run dev`, then open `http://localhost:5173/new` (use the Chrome extension if connected; otherwise say explicitly that the UI was not visually verified).

Check, in order:
1. Onboarding has 3 steps and no workspace step. Launching opens the game with $500 cash, a 🏠 Home placeholder, the Founder tab, and the beat-0 coach card.
2. Only **Research** is enabled. Running it shows "Researching your market…" and a filling ring. On completion, 2 features appear under "Build next".
3. **Build** one feature. On ship, the toast appears, leads go up, customers stay 0, and **Send emails** unlocks.
4. **Send emails** adds leads and unlocks **Sell**. Selling converts at least 1 lead. The Metrics tab appears. The Family Money modal opens and the game is paused.
5. Accepting adds the amount, restores the speed, and shows the Chapter 1 complete banner. All tasks stay repeatable.
6. Settings → Save slot 2 → reload `/new` → the slot shows under Continue and loads back to the same state.
7. The browser console has no "Maximum update depth" or other React errors (Review Focus #1).

- [ ] **Step 7: Manual route-switch and restart check (Review Focus #2 and #3)**

1. Open `/?play`, start a legacy game, then navigate to `/new`. Expected: v2 onboarding, not the legacy game.
2. From a v2 game at `/new`, navigate back to `/`. Expected: the legacy landing/onboarding, and the legacy save list doesn't show the v2 game.
3. Reach PostMortem in `/new` (use the TopBar sell button once available, or temporarily set `phase: 'lost'` via React devtools). Click **Play Again**. Expected: a fresh v2 game at $500.

- [ ] **Step 8: Commit**

```bash
git add src/v2/GameScreenV2.tsx src/v2/AppV2.tsx src/router.tsx
git commit -m "Add /new route with the v2 solo founder chapter"
```

- [ ] **Step 9: Push and open the PR**

```bash
git push -u origin v2/founder-journey
gh pr create --title "v2 Phase 1: solo founder chapter at /new" --body "$(cat <<'EOF'
## Summary
- New `/new` route (legacy `/` untouched; only `src/router.tsx` changes outside `src/v2/`)
- Solo founder chapter: Research → Develop → Emails → Sales unlock one at a time with coach cards, leads → customers funnel, friends & family money beat
- v2 saves under their own keys, `v2-` gameIds for separable analytics
- vitest added; pure v2 modules fully unit-tested

Spec: `docs/superpowers/specs/2026-09-29-v2-founder-journey-design.md`
Plan: `docs/superpowers/plans/2026-09-30-v2-phase1-solo-founder.md`

## Test plan
- [x] `npm test`
- [x] `tsc --noEmit`, `npm run build`
- [x] Legacy guard diff
- [ ] Manual `/new` playthrough through Chapter 1
- [ ] Route-switch and Play Again checks
EOF
)"
```
