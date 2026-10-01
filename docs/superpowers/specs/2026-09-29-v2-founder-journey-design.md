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
  GameScreenV2.tsx     TopBarV2 + placeholder view + BottomNavV2 + panel area + overlays
  TopBarV2.tsx         copy of legacy TopBar using v2 saves and runway-based cash warnings
  BottomNavV2.tsx      shows unlocked tabs only
  FounderPanel.tsx     task picker, progress, feature list, funnel, skills, coach card
  PlaceholderRoom.tsx  Phase 1 CSS room card (replaced in Phase 2)
  FamilyMoneyModal.tsx beat 5 card
  __tests__/           vitest unit tests for the pure modules
```

**Legacy reused read-only:**
- `tick`, `createInitialState`, `estimateFeatureEffects`, `totalDays`
- `RightPanel activePanel="metrics"`, overlays (`FeatureResultToast`, `MilestoneToast`, `RunwayBanner`, `PostMortem`)
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
| **TopBarV2** | A copy of the legacy TopBar, visible from the start. Two differences: the settings modal saves to **v2** slots (the legacy one would write v2 games into `/`'s saves), and cash warnings are runway-based (< 6 / < 3 months) instead of the legacy $50k/$20k thresholds, which would show a solo founder's $500 in red all game. |
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

---

## 6. Phase 2 detailed design — renderer foundation (approved 2026-09-30)

### 6.1 Decisions

| Topic | Decision |
|---|---|
| Room | **Cozy bedroom-desk**: bed in one corner, desk by the window, warm lamp, plant, rug, bookshelf, posters/picture. Warm evening palette (cream walls, wood floor, amber lamp). |
| Art | **Kenney Mini Characters** + **Kenney Furniture Kit**, both CC0 (the license text ships inside each zip). Direct-download zips, GLB-native. Chibi low-poly style is the look for the whole game. |
| Renderer | R3F `<Canvas>` (three ^0.183, R3F ^8.18, drei ^9.122, React 18). WebGL renderer. |
| Camera | Orthographic, fixed isometric angle (≈35° down, 45° around). Frames the room and refits on resize. No orbit controls. |
| Lighting | Warm key light through the window with soft shadows, low hemisphere fill, warm point light at the desk lamp, contact-shadow plane, ACES tone mapping. |
| Visual verification | Playwright (dev dependency) screenshot script rendering `/new` headless, used to tune camera, light and scale. |

### 6.2 Module layout

```
src/v2/scene/
  HomeScene.tsx      <Canvas>, camera, lights, Suspense (fallback = PlaceholderRoom)
  Room.tsx           floor, 2 cut-away walls, window; furniture from layout.ts
  Founder.tsx        Kenney mini character, AnimationMixer, walks between spots
  layout.ts          pure: room bounds, furniture list {model, position, rotation, scale}, named spots
  founderPose.ts     pure: (task, progress) → { spot, clip, motion, icon }
  assets.ts          model URLs + preload list (manifest)
  webgl.ts           pure-ish: WebGL support detection
src/v2/audio.ts      useBackgroundMusic(), useTypingLoop(active)
scripts/fetch-v2-assets.mjs   re-fetches the Kenney zips; extracts only the used GLBs + license
scripts/v2-screenshot.mjs     Playwright: renders /new and saves PNGs
public/assets/v2/    committed GLBs actually used (~15 furniture + 1 character) + LICENSE-kenney.txt
```

`GameScreenV2` swaps `<PlaceholderRoom />` for `<HomeScene />`. When WebGL is unavailable, it keeps rendering `PlaceholderRoom`.

### 6.3 Founder behavior

| Task | Spot | Clip | Extra |
|---|---|---|---|
| none (idle) | sitting on the bed | `sit` | slow breathing bob |
| research | standing at the bookshelf | `interact-right` (loop) | — |
| develop | desk chair | `sit` + procedural typing bob | laptop screen glows brighter |
| emails | desk chair | `sit` + procedural typing bob | ✉️ floats up every few seconds |
| sales | pacing by the window | `walk` between 2 points | 📞 above the head |

- **Moving between spots:** when the spot changes, the founder walks there with `walk` at about 1.2 units/s of scene time. A trip is capped at around 2 real seconds and doesn't scale with game speed.
- **Retargeting:** changing the task mid-walk retargets smoothly, with no teleporting.
- **Progress:** shown as a thin ring on the floor under the founder.
- **Task complete:** a short `emote-yes` plays before the next pose.
- **Character model:** one constant (e.g. `character-male-a`). Letting the player choose one is out of scope.

### 6.4 Data flow and loading

- **Reading state:** the scene only reads the store through `useV2`, following the Phase 1 selector rule (stored refs or primitives only). Rendering never blocks the game loop.
- **Loading:** GLBs are preloaded through `useGLTF.preload`. While loading, the Suspense fallback shows the Phase 1 `PlaceholderRoom`, so the canvas area is never blank.
- **Bundle:** `/new` is already a lazy route. three/R3F end up in the v2 route chunk and never in the marketing pages.

### 6.5 Audio

- **Background music:** `useBackgroundMusic()` loops `/assets/music/bg_music.mp3` at `useAudioStore.musicVolume`. It starts on the first pointer or key event (browser autoplay policy) and stops on unmount.
- **Typing loop:** `useTypingLoop(active)` loops `/assets/music/keyboard_typing.mp3` at `sfxVolume` while the task is develop or emails.
- **Legacy:** the Phaser audio is unchanged.

### 6.6 Testing and acceptance

- **Unit tests (vitest):**
  - `founderPose` maps every task, plus idle, to a spot that exists in `layout` and a clip from the character's known clip list.
  - Every layout spot lies inside the room bounds, and no furniture footprint covers a spot.
  - Every model path in the `assets` manifest exists under `public/assets/v2/`.
  - `webgl` detection returns false when no context can be created.
- **Screenshot check:** `scripts/v2-screenshot.mjs` starts from a fresh game, runs research (and a develop task, driving time via the dev-only 10× speed or store calls), and saves PNGs. The canvas must render non-blank pixels, and the images are reviewed for composition.
- **Gates:** `tsc`, `npm test`, `npm run build` all pass. The legacy guard is unchanged: outside `src/v2/`, `scripts/`, `public/assets/v2/`, `docs/`, only `package.json`/lockfile may change.

### 6.7 Out of scope for Phase 2

Other rooms/locations (Phases 4–5), employees in the scene (Phase 5), clicking characters (Phase 5), postprocessing and adaptive quality (Phase 6), choosing a founder character.

---

## 7. Phase 3 detailed design — interns + Chapter 2 (approved 2026-10-01)

### 7.1 Decisions

| Topic | Decision |
|---|---|
| Hire model | Everyone (founder or hire) does the same four tasks (Research / Develop / Emails / Sales) through one shared task engine. Role decides what each person is good at. This replaces the earlier plan of handing off to legacy role systems; legacy campaigns and PM loops may come back later as "advanced" tasks. |
| Assigning work | Each hire has a **standing assignment** that repeats until you change it. The founder stays one-task-at-a-time, as in Chapter 1. |
| Scope | Interns only. Full-time hires arrive with the bigger locations in Phase 4. Managers come later; see 7.6. |
| Home capacity | Founder + **2 interns**, both visible and animated in the room. |

### 7.2 Intern rules

| Role | Main task | Speed (× founder) on main / other tasks |
|---|---|---|
| developer | develop | 0.7 / 0.35 |
| product_manager | research | 0.7 / 0.35 |
| marketing | emails | 0.7 / 0.35 |
| sales | sales | 0.7 / 0.35 |

- **Duration:** a hire's task takes `founderDurationDays / speed` (Develop's founder duration is already `baseDays / 0.6`).
- **Skills:** the same four skills as the founder (research/build/outreach/sales). They start at **3** in the main skill and **1** in the others. Each completed task adds **+0.25**, capped at **6**. Outcome formulas are exactly the founder's (Phase 1 §5.2), using the worker's own skills. The first-sale guarantee applies to the founder only.
- **Mistakes:** chance = `max(0.05, 0.15 − 0.02 × (mainSkill − 3))`, rolled on each completed task. Effects:
  - research → only 1 feature
  - develop → effects ×0.5, +5 tech debt
  - emails → leads ×0.5 (rounded down)
  - sales → 1 extra lead lost (after conversion; leads floored at 0)
  Each mistake writes a short story line. The founder never makes mistakes.
- **Salary:** `600 + floor(rng·5)·100` ($600–$1,000/mo). No upfront cost. Burn comes from the legacy monthly salary deduction.
- **Candidates:** a pool of 3 intern candidates of random roles, reusing the legacy name pools. Refreshing is free. **Hire** is blocked when `team.length ≥ capacity` (Home: 2) or `cash < salary` (they must be able to pay the first month).
- **Firing:** "Let go" removes the hire from the team and from `employees`. A feature they were building goes back to `proposed`.
- **Standing assignment** (`chooseNextTask`):
  - research → repeats; stays idle while roadmap + fallback are exhausted.
  - develop → takes the first `proposed` feature nobody is building; idle if none.
  - emails → repeats.
  - sales → runs when `leads ≥ 1`, otherwise waits.
  - idle → nothing.
- **One builder per feature:** a feature in development belongs to exactly one worker (`assignedToDevId`).

### 7.3 Chapter 2

| Beat | Trigger | Coach card |
|---|---|---|
| 0 | Family money claimed | "You can't do everything yourself. Hire an intern: cheap, eager, a bit messy." (unlocks the **Team** tab) |
| 1 | First intern hired | "Give them a job. They'll keep doing it until you change it." |
| 2 | Any intern finishes a task | "That's leverage: work happening without you." |
| (extra) | First intern mistake | "Interns make mistakes. They get better with practice." (doesn't block progress) |
| complete | **MRR ≥ $1,000** | "Chapter 2 done. Your bedroom is getting crowded… Chapter 3: a bigger space, coming soon." (banner) |

**Events:** random events stay suppressed until Chapter 2 is complete. They're still sized for a $100k company and would bankrupt a $1k-MRR startup with interns. Scaling events to company size is Phase 4 work. *(This decision was made during spec writing; flagged for review.)*

### 7.4 UI and room

- **Team tab** (BottomNavV2):
  - header: `Team n/cap · burn $X/mo · runway ~N mo`
  - **Candidates:** cards showing role badge, skills, salary, bio and **Hire**, plus a disabled reason when needed. A **Refresh** button.
  - **Your team:** one row per hire with a task dropdown (Research/Develop/Emails/Sales/Idle), progress, skills, salary and **Let go**.
- **Room** (Home layout gains furniture as seats are filled):
  - seat 1: beanbag + laptop by the bookshelf
  - seat 2: small desk by the window
  - Seated tasks (research/develop/emails) play `sit` + typing at the hire's seat.
  - Sales paces on its own path.
  - Idle hires sit at their seat.
  - Interns use different Kenney characters from the founder, **cloned per person** (`SkeletonUtils.clone`). Task icons are shown in-scene.
  - Furniture for a seat appears only when someone occupies it.

### 7.5 Engine integration

- **Hire record:** each hire lives in two places.
  - Legacy `employees` as a payroll mirror: `role: 'developer'`, `status: 'busy' | 'idle'` (mirrors whether they have a task), `currentFeatureId` **unset**. This makes the legacy developer loop inert, so legacy produces no customers or features from hires.
  - `v2.team[id]`: `{ role, tier: 'intern', skills, assignment, task, mistakes, seat, characterModel, reportsTo?: string }`.
- **v2 owns morale/stress:** after each legacy tick, `v2Tick` resets every hire's legacy `morale`, `stress`, `xp` and `level` to fixed values (72 / 15 / 0 / 1). This neutralizes the legacy `cash < $10k` stress spiral, the stressed-developer tech-debt nudge, and legacy level-up messages.
- **Generalized task engine:** the Phase 1 founder task logic becomes worker-based (founder or hire) with a per-worker speed, mistake rule and skill cap. `v2Tick` advances the founder and every hire each game hour; when a hire finishes a task, `chooseNextTask` gives them their next one.
- **Saves:** `v2.team` is part of the v2 slice. Saves without `team` load with `team: {}` and `chapter2` defaults.

### 7.6 Manager-ready shape (not built in Phase 3)

`tier` (`'intern'` now; `'fulltime' | 'manager'` later) and an optional `reportsTo` exist on every team member. The decision of what a worker does next lives in a single function, `chooseNextTask(worker, state)`. Later, a manager can provide that function for the workers who report to them (auto-assigning interns, improving their speed or mistake rates) without changing the task engine or UI.

### 7.7 Testing and acceptance

- **Unit tests:**
  - speed per role on main and other tasks
  - each mistake effect at fixed rolls, and the mistake rate shrinking with skill
  - skill growth and its cap
  - standing assignment repeats and picks the next free proposed feature
  - no two workers building one feature
  - hire blocked when the room is full or the first month is unaffordable
  - firing frees the feature
  - salaries appear in burn
  - the legacy tick produces no customers or features from hires
  - the morale/stress reset
  - Chapter 2 beats in order, and completion at $1k MRR
  - events suppressed until Chapter 2 is complete
  - saves round-trip with a team, and old saves load
- **Screenshot harness:** founder + 2 interns visible at their seats, with no console errors.
- **Gates:** `tsc`, `npm test`, `npm run build`. Legacy files unchanged.

### 7.8 Out of scope for Phase 3

Full-time hires, managers, the map and moving (Phase 4), resizing events, and morale effects on intern speed.
