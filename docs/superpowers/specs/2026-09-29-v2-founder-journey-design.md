# v2 — Founder Journey: Design Spec

**Status:** Approved in brainstorming 2026-09-29. Master spec for the whole v2 arc, with the full design for Phase 1.
**Route:** `/new`. The legacy game at `/` is not changed.

---

## 1. Intent

The current game opens with a funded company, a choice of workspace, and every panel visible at once. The office is one painted background with sprites moving over it.

v2 replaces this with a **founder journey**:

- You start alone at home with an idea.
- You learn each part of running a startup by doing it yourself, one step at a time.
- Friends and family give you your first small money.
- You hire interns.
- You grow from a home, through co-working, to your own building.
- The whole time, a clean 2.5D isometric view shows your space changing.

**Success means:**
- A new player understands what each action does before the game gives them more.
- Each space looks and feels distinct.
- The legacy game keeps running for existing players until v2 replaces it.

## 2. Decisions (from brainstorming)

| Topic | Decision |
|---|---|
| Where it lives | New route `/new`. Legacy code stays as it is. |
| Isolation | All new code lives in `src/v2/`. Legacy modules are reused read-only (engine math, panels, overlays). The only legacy edit is one line in `router.tsx`. |
| Store | v2 shares the legacy Zustand store at runtime (only one route is mounted at a time). v2 state goes under a namespaced `v2` key. `AppV2` resets the store on mount and unmount. |
| Office view role | A living diorama with light clicks. The view reflects game state, and clicking an employee opens their panel. Gameplay stays in the panels. |
| Renderer | React Three Fiber + drei (already installed: three ^0.183, R3F ^8.18, drei ^9.122) with an orthographic **2.5D isometric** camera. WebGL renderer; WebGPU is a possible later opt-in. |
| Art pipeline | Code only. Rooms are assembled in code from free CC0 glTF kits (Kenney, KayKit, Quaternius; check each pack's license before use). Realtime soft lighting, AO, tone mapping. No Blender. |
| Space progression | A ladder of locations shown on a map. Home is unlocked and the rest start locked. Moving is a purchase once a location is unlocked. The onboarding workspace choice is removed. |
| Early game | A solo founder chapter doubles as the tutorial. Research → Develop → Emails → Sales, introduced one step at a time. Then friends-and-family money, then interns. |
| Analytics | `gameId` is prefixed `v2-`, so Mongo sessions can be told apart without server changes. |
| Saves | Separate localStorage keys (`startup-game-v2-save-*`). v2 and legacy saves never mix. |

Approaches considered and rejected: PixiJS 2D isometric (art sourcing is the bottleneck, and it needs React 19); staying on Phaser with better art (doesn't fix the "images moving around" feel); Babylon, PlayCanvas and Needle (weaker React fit, overkill here).

## 3. Phase roadmap

Each phase ships something playable at `/new` and gets its own spec addendum → plan → implementation cycle. This document fully designs **Phase 1** only. Later phases are listed with goals and known constraints.

| # | Phase | Ships |
|---|---|---|
| 1 | **v2 foundation + solo founder chapter** | `/new` shell, v2 saves/analytics, founder tasks, Chapter 1 tutorial beats, friends-and-family money, placeholder room view |
| 2 | **Renderer foundation** | R3F isometric canvas; Home room with lighting and CC0 assets; founder character with idle/typing/walking tied to the current task; keeps the loader/`onReady` contract; music and SFX moved out of Phaser into the audio module; static fallback when WebGL is unavailable |
| 3 | **Interns + first hires** | Intern tier for every role (cheap, slow, occasional mistakes); hiring unlocks after the family money; the founder keeps working next to hires; economy rebalanced for a near-zero start; handoff into legacy mid-game systems (features, campaigns, events) |
| 4 | **Location ladder + map** | Map screen: Home → Bigger Home → Villa → Co-working → Small Office → Big Office → Building (may extend). Each location has an unlock condition, move-in cost, rent (`infraCostMonthly`) and desk capacity. You move from the map. |
| 5 | **All rooms + characters** | Remaining 6 rooms, each with its own palette and feel; desks and furniture sized to capacity; move transition; employee variety by role, gender and morale; click an employee to open their panel |
| 6 | **Polish + performance** | Postprocessing (SMAA, subtle bloom, vignette); drei `PerformanceMonitor`/`AdaptiveDpr` for mobile; loading states; reduced-motion fallback |

**Known constraints for later phases:**
- **Phase 2:** the loader in `App.tsx` depends on `onReady()` firing once after the first real render, with at least 800ms before it fires. The canvas must fill a `flex:1` container, handle resize, and not overlap the nav.
- **Phase 2:** legacy music and SFX run inside `OfficeScene.ts`, so `/new` has no music until they're moved out.
- **Phase 3:** the legacy `HirePanel` draws empty desk slots as `MAX_DESKS - deskCount`. `Array.from` clamps a negative length to 0, so there's no crash, but above 6 desks the slots stop showing. v2 needs its own Hire panel.
- **Phase 4:** location numbers (unlock thresholds, costs, rent, capacity) get designed and tested against the rebalanced economy in that phase's addendum.
- **Phase 2/5:** asset packs need their license confirmed on each pack's own page before we ship. Pick one character style family so proportions and shading match.

## 4. Architecture

```
src/v2/
  AppV2.tsx            Shell: store reset on mount/unmount, game loop, autosave, phase routing
  OnboardingV2.tsx     idea → assessment → name → launch (no workspace step); reuses Onboarding.css
  state.ts             V2 types, createV2State(config), initial founder/chapter
  founder.ts           pure: task definitions, startTask, advanceFounder, task outcomes
  chapter.ts           pure: beat transitions, unlock rules, coach-card copy
  v2Tick.ts            pure: v2Tick(state, rng) — runs after legacy tick()
  actions.ts           thin setState wrappers: startTask, dismissCard, claimFamilyMoney, newGameV2, loadV2
  saveV2.ts            own localStorage keys, 3 slots, slot 1 autosave every 30s
  GameScreenV2.tsx     TopBar (legacy) + placeholder view + BottomNavV2 + panel area + overlays
  BottomNavV2.tsx      shows unlocked tabs only
  FounderPanel.tsx     task picker, progress, feature list, funnel, skills, coach card
  PlaceholderRoom.tsx  Phase 1 CSS room card (replaced in Phase 2)
  FamilyMoneyModal.tsx beat 5 card
  __tests__/           vitest unit tests for the pure modules
```

**Legacy reused read-only:**
- `tick`, `createInitialState`, `estimateFeatureEffects`, `totalDays`
- `TopBar`, `RightPanel activePanel="metrics"`, overlays (`FeatureResultToast`, `MilestoneToast`, `RunwayBanner`, `PostMortem`)
- `generateRoadmap`/`validateIdea` (Groq)
- `Onboarding.css`

**Loop:** `setState(s => v2Tick(tick(s)))`, every tick, at the current `gameSpeed`, using the same interval scheme as legacy `App.tsx`.

**Why tick composition is safe:** legacy `tick` and its sub-steps build new state by spreading the old state, so unknown keys (the `v2` namespace) come through unchanged.

## 5. Phase 1 detailed design

### 5.1 Starting state

`createV2State(config)` calls legacy `createInitialState({ ...config, workspace: 'home' })` and then overrides:

| Field | Value |
|---|---|
| `cash` | 500 (founder's savings; must stay > 0, since legacy loses at cash ≤ 0) |
| `infraCostMonthly` | 0 |
| `employees` / `candidates` | `[]` / `[]` |
| `deskCount` | 0 (hiring arrives in Phase 3) |
| `gameId` | `'v2-' + <legacy id>` |
| `metricsHistory[0]` / `fullMetricsHistory[0]` | cash/burn/runway recomputed for $500 and $0 burn |
| `storyLog[0]` | founding lines rewritten for a solo, near-zero start |
| `v2` | see 5.5 |

### 5.2 The founder and tasks

- **One active task at a time.** Progress advances by 1/24 of a day per game hour. The outcome applies when progress reaches 1.
- **Skills:** `research`, `build`, `outreach`, `sales`, each starting at **4**. Completing a task adds **+0.5** to its skill, capped at **8**.

| Task | Duration (game days) | Outcome |
|---|---|---|
| Research | 3 | Take the next 2 not-yet-used templates from `featureRoadmap` (from `featureRoadmapIndex`, skipping titles already in `features`, then falling back to `FEATURE_TEMPLATES`). Add them as `status: 'proposed'` features. Advance `featureRoadmapIndex`. Add one market-insight story line. |
| Develop *(needs a proposed feature)* | `feature.baseDays / 0.6` | Mark the feature `completed`. Compute effects with `estimateFeatureEffects(effects, value, accuracy = 5, arpu, customers, diffMult)`, then apply customers, ARPU, churn drop, cash bonus, brand, tech debt and product progress. Push a `FeatureResult` into `recentFeatureResults`, using `devName` = founder name, so the legacy toast shows. **Before the first sale, customer gains go to `v2.leads` instead of `customers`,** with story copy calling them beta signups. Leads are floored at 0, since some features have negative customer effects. |
| Emails | 2 | `leads += round((4 + outreach + rng()·4) · (1 + brand/100))` |
| Sales *(needs leads ≥ 1)* | 2 | For each lead, it converts with `p = 0.25 + 0.03·sales`. Converted leads become `customers`. **All contacted leads are used up.** The first sales run ever converts **at least 1** lead. Set `firstSaleDone` once `customers > 0` after the run. |

Develop keeps the chosen feature id on the task. If that feature is gone, the task is cancelled with no outcome (defensive; it shouldn't happen, since features are never removed).

### 5.3 Chapter 1 beats

| Beat | Enters when | Coach card | Unlocks |
|---|---|---|---|
| 0 | game start | "It's just you, a laptop and an idea. Every company starts here." | Research |
| 1 | first Research completes | "Research turns an idea into concrete things to build. Pick one and build it yourself." | Develop, feature list |
| 2 | first feature ships | "People signed up to try it. They're leads, not customers. Go find more." | Emails |
| 3 | first Emails completes | "Leads don't pay. Customers do. Time to sell." | Sales |
| 4 | `firstSaleDone` | "🎉 First paying customer! That's real revenue: $50/mo." | Metrics tab |
| 5 | immediately after beat 4 | Friends & Family modal | — |
| complete | family money claimed | "Chapter 2: your first hire — coming soon" banner | all tasks freely repeatable |

**Rules:**
- **Order:** beats advance in order and never skip. A task can only start if its step has unlocked.
- **Coach cards:** they don't block play and can be dismissed. Dismissed ids are stored in `seenCards`.
- **Friends & Family modal:** the giver is chosen from a small pool (cousin, college friend, old manager, parents, …) and the amount is `800 + floor(rng()·701)`, which gives $800–$1,500. While it's open the game is paused (`gameSpeed: 0`); claiming it adds the cash and restores the previous speed.
- **While Chapter 1 is incomplete:**
  - `v2Tick` clears any `pendingEvent` the legacy tick raises, so there are no crises during the tutorial.
  - `InvestorCheckin` isn't mounted. After the chapter it's mounted as-is. It uses the legacy `investor-checkin-done` localStorage flag, so a player who already answered it at `/` won't see it again at `/new`. That's acceptable for now.

### 5.4 UI

| Element | Behavior |
|---|---|
| **Onboarding** | idea → assessment → name → launch, then beat 0. The Continue screen lists v2 saves only. |
| **Layout** | Same as the legacy game screen (`TopBar`, `.game-canvas-area` holding the placeholder + `BottomNavV2`, right panel area). |
| **TopBar** | The legacy component, visible from the start. |
| **BottomNavV2** | Shows **Founder** from the start and **Metrics** from beat 4. Uses the legacy nav CSS classes. |
| **FounderPanel** | Current task with a progress bar and ETA. Four task buttons, each either locked (with the reason) or available; buttons are disabled while a task is running. A proposed-features list with a Develop button on each. A leads → customers funnel. Skill bars. The current coach card. |
| **PlaceholderRoom** | A centered card: 🏠 Home, founder avatar, a status line ("Researching your market…", "Building *Onboarding Flow*…", "Writing cold emails…", "On sales calls…", "Taking a breather" when idle), and a progress ring. |
| **Overlays reused** | `FeatureResultToast`, `MilestoneToast`, `RunwayBanner`, `PostMortem` on sold/lost. |

### 5.5 State shape

```ts
type FounderTaskType = 'research' | 'develop' | 'emails' | 'sales'

interface FounderTask { type: FounderTaskType; featureId?: string; progress: number /* 0..1 */ }

interface V2Slice {
  founder: {
    name: string
    task: FounderTask | null
    skills: { research: number; build: number; outreach: number; sales: number }
  }
  chapter: {
    beat: 0 | 1 | 2 | 3 | 4 | 5
    complete: boolean
    seenCards: string[]
    familyMoney?: { giver: string; amount: number; claimed: boolean }
  }
  leads: number
  firstSaleDone: boolean
}

type V2State = GameStore & { v2: V2Slice }
```

### 5.6 Randomness and testability

Every random roll takes an `rng: () => number` parameter that defaults to `Math.random`. All modules under `founder.ts`, `chapter.ts`, `v2Tick.ts` and `state.ts` are pure (state in, state out) and don't touch the store, `localStorage` or `Date` (except `createV2State` building the id).

### 5.7 Saves and analytics

- **Saves:** `saveV2.ts` mirrors `saveManager.ts` (same envelope, same meta) under the prefix `startup-game-v2-save-`. It saves the full state including `v2`. On load, a missing or invalid `v2` slice rejects the save.
- **Analytics:** the legacy day-tick ingest runs unchanged. v2 sessions are identified by the `v2-` gameId prefix. Leads and founder data aren't sent to Mongo in Phase 1.

### 5.8 Testing and acceptance

- **Tooling:** add `vitest` (dev dependency), an `npm test` script, and minimal config.
- **Unit tests** (pure modules, deterministic rng):
  - `createV2State` overrides (cash 500, $0 burn, `v2-` id, empty staff)
  - Research adds exactly 2 proposed features, advances the index, and skips used titles
  - Develop duration and effects; before the first sale, customer gains go to leads; after the first sale they go to customers
  - Emails lead formula at known rng values
  - Sales conversion rate, guaranteed first conversion, contacted leads used up, `firstSaleDone` set
  - Skills +0.5 per completion, capped at 8
  - Beats advance in order and can't be skipped; locked tasks can't start; a second task can't start while one is running
  - `pendingEvent` is cleared during Chapter 1 and kept after
  - Family money amount stays within $800–$1,500; claiming adds cash exactly once
- **Gates:** `tsc --noEmit`, `npm run build`, `npm test` all pass.
- **Manual:** play `/new` through Chapter 1 to the banner. Use the browser if the Chrome extension is connected; otherwise report that it was not visually verified.
- **Legacy guard:** `git diff main --stat -- . ':!src/v2' ':!docs'` shows only `src/router.tsx`, `package.json`, `package-lock.json` and the vitest config/script. A manual check confirms `/` still loads and plays.

### 5.9 Out of scope for Phase 1

Hiring and interns (Phase 3), map and locations (Phase 4), the R3F renderer and music in `/new` (Phase 2), v2 versions of the Team/Hire/GTM/Shop panels, sending leads/founder data to Mongo, and admin dashboard filtering by v2.
