# v2 Phase 3 — Interns + Chapter 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let the player hire up to 2 interns at Home. Interns work through the same task engine as the founder (on standing assignments), make mistakes, cost salary, and appear animated in the room. Chapter 2 ends at $1k MRR.

**Architecture:** Generalize the Phase 1 founder task engine into a worker engine (`src/v2/work.ts`). The founder and hires share durations, outcomes and skill growth, with per-worker speed, mistakes and skill cap. Hires live in `v2.team` (real data) plus a legacy `employees` payroll mirror stored as an inert `developer`, so the legacy engine deducts salaries but does nothing else. A `TeamPanel` handles hiring and assignments. `Room`/`Hire` scene components render the seats and the cloned intern characters.

**Spec:** `docs/superpowers/specs/2026-09-29-v2-founder-journey-design.md` §7.

**Plan format note:** the session that executes this plan is the same one that wrote it. Tasks list exact interfaces and test cases, but omit full code listings (unlike the Phase 1/2 plans). The spec numbers are binding.

## Global Constraints
- **Legacy untouched.** Outside `src/v2`, `scripts`, `public/assets/v2` and `docs`, only `package.json`/lockfile may change.
- **Intern speed:** 0.7× on the main task, 0.35× off it. Hire duration = founder duration / speed.
- **Skills:** start at main 3 / other 1. +0.25 per completed task, cap 6. The founder keeps +0.5 / cap 8.
- **Mistake chance:** `max(0.05, 0.15 − 0.02·(mainSkill − 3))`.
- **Salary:** `600 + floor(rng·5)·100`. Home capacity is 2 interns. Hiring is blocked when the team is full or `cash < salary`.
- **Legacy mirror for each hire:** `role: 'developer'`, `currentFeatureId` unset, status mirrors the task. After every tick, morale/stress/xp/level are reset to 72/15/0/1.
- **Events:** suppressed until Chapter 2 is complete.
- **Selector rule:** stored refs or primitives only. No pushes. No AI attribution.

## Review Focus
1. **A legacy event removes an employee** (key-employee-quit after Chapter 2) → `v2.team` must drop them and free their feature, with no dangling seat or character.
2. **Founder and intern doing sales at the same moment** → they share the leads pool; leads never go negative and no double conversion.
3. **Firing mid-build** → the feature returns to `proposed`, the seat frees up, and the 3D character unmounts cleanly.
4. **Loading a Phase 1/2 save** (no `team` field) → it loads with an empty team and Chapter 2 defaults instead of being rejected.
5. **Cash dips below a hire's salary** → the legacy month tick deducts salary and can reach $0 = lost. That's the intended pressure, but the runway shown in the header must warn first.

---

### Task 1: State shape + save compatibility
- Files: `src/v2/state.ts`, `src/v2/saveV2.ts`, tests `state.test.ts`, `saveV2.test.ts`.
- Add to `state.ts`:
  - `type TeamRole = EmployeeRole`, `type Tier = 'intern'`
  - `type Assignment = FounderTaskType | 'idle'`
  - `interface TeamMember { id; name; gender: 'male'|'female'; role: TeamRole; tier: Tier; skills: Record<FounderSkill, number>; assignment: Assignment; task: FounderTask | null; mistakes: number; seat: number; characterModel: string; salary: number; reportsTo?: string }`
  - `interface InternCandidate { id; name; gender; role: TeamRole; skills; salary; bio; characterModel }`
  - `V2Slice` gains `team: Record<string, TeamMember>`, `candidates: InternCandidate[]`, `chapter2: { beat: 0|1|2; complete: boolean; firstMistake: boolean }`
- `createV2Slice` defaults: `team {}`, `candidates []`, `chapter2 { beat: 0, complete: false, firstMistake: false }`.
- New `migrateV2Slice(v): V2Slice | null` fills the missing Phase 3 fields onto an otherwise-valid Phase 1/2 slice. `isValidV2Slice` keeps validating only the Phase 1 core. `loadGameV2` calls the migration.
- Tests:
  - a fresh slice has the defaults
  - an old slice without `team` migrates and loads
  - a junk slice is still rejected

### Task 2: Worker engine (generalize founder tasks)
- Files: new `src/v2/work.ts`; `src/v2/founder.ts` becomes a thin founder facade; tests `work.test.ts`. Existing `founder.test.ts` must stay green unchanged.
- `work.ts` exports:
  - `MAIN_TASK: Record<TeamRole, FounderTaskType>`
  - `hireSpeed(role, type): number` (0.7 / 0.35)
  - `mistakeChance(member): number`
  - `workerDurationDays(state, type, featureId, speed)`
  - `applyOutcome(state, worker: Worker, task, rng, opts: { mistake: boolean; firstSaleGuarantee: boolean }): V2GameState | null`
- `interface Worker { id: string; name: string; skills: Record<FounderSkill, number> }`. Outcomes use `worker.skills` instead of `state.v2.founder.skills`, and develop's `devName = worker.name`.
- Mistake effects (spec §7.2):
  - research → 1 template
  - develop → est fields ×0.5 (rounded) and techDebt +5
  - emails → `floor(gained × 0.5)`
  - sales → converted −1 (floored at 0) *(ruling: the spec's "1 extra lead lost" is a no-op, since sales already consumes every lead)*
- Each mistake adds a story line naming the worker.
- `pickResearchTemplates(state, rng, count = 2)` gains the count parameter.
- Tests:
  - speeds per role
  - mistake chance at skill 3 → 0.15, skill 6 → 0.09, floor 0.05
  - each mistake effect at fixed rng
  - outcomes use the worker's skills
  - the founder path is unchanged (existing tests)

### Task 3: Team logic — hiring, firing, standing assignment, ticking hires
- Files: new `src/v2/team.ts`, test `team.test.ts`.
- Exports:
  - `HOME_CAPACITY = 2`
  - `INTERN_MODELS: { male: string[]; female: string[] }` (`character-male-c`, `character-male-e`, `character-female-b`, `character-female-d`)
  - `generateInternCandidates(rng, count = 3)`: names, gender and bio come from legacy `generateCandidate(role)`; skills, salary and model come from v2 rules
  - `canHire(state, candidateId): 'ok' | 'full' | 'cash' | 'missing'`
  - `hireIntern(state, candidateId, rng)`: adds the team member (lowest free seat), the legacy mirror employee and a story line; removes the candidate; chapter2 beat 0→1
  - `fireMember(state, id)`: frees the feature and removes the member and the mirror
  - `setAssignment(state, id, assignment)`
  - `chooseNextTask(member, state): FounderTask | null` (spec §7.2 rules; develop picks the first proposed feature not assigned to anyone)
  - `advanceTeam(state, hours, rng)`: for each member, start a task from `chooseNextTask` if idle, advance progress, apply the outcome (mistake roll via `mistakeChance`), grow the skill (+0.25, cap 6), and emit `{ completedBy: string[]; mistakes: string[] }`
  - `syncPayroll(state)`: reconcile with legacy `employees` (drop team members missing from employees, free their features), set mirror status/morale/stress/xp/level/currentFeatureId
- Tests:
  - hire blocked when full or out of cash; succeeds otherwise (mirror is `developer`, salary matches)
  - seats get assigned 0 then 1
  - firing frees the feature and the seat
  - standing develop picks the next free feature and never one being built by the founder
  - sales waits for leads
  - research goes idle when nothing is left
  - a hire's task duration = founder duration / speed
  - skill cap at 6
  - mistakes counted
  - `syncPayroll` drops a member removed from employees and resets morale/stress

### Task 4: Chapter 2 + tick integration + events
- Files: `src/v2/chapter.ts`, `src/v2/v2Tick.ts`, tests.
- `chapter.ts` gains:
  - `CHAPTER2_CARDS` (ids `c2-0`, `c2-1`, `c2-2`, `c2-mistake`, `c2-done`)
  - `currentChapter2Card(state)`
  - `onTeamProgress(state, { completedBy, mistakes })`: beat 1→2 on the first completion; `firstMistake` set
  - `checkChapter2Complete(state)`: `mrr >= 1000` → complete
- `isTeamUnlocked(state)` = chapter1 complete.
- `v2Tick`:
  - after the founder: `advanceTeam`, then `onTeamProgress`, `syncPayroll`, `checkChapter2Complete`
  - the event-suppression condition becomes `!chapter.complete || employees.length === 0 || !chapter2.complete`
- Tests:
  - beats advance in order
  - the mistake card appears once
  - completion at MRR 1000
  - events kept only when both chapters are complete and the team is non-empty
  - an end-to-end pure run: hire → assign emails → leads grow without the founder

### Task 5: Actions + Team panel UI
- Files: `src/v2/actions.ts`, `src/v2/TeamPanel.tsx`, `src/v2/BottomNavV2.tsx` (adds a `team` tab), `src/v2/GameScreenV2.tsx`, `src/v2/FounderPanel.tsx` (shows the Chapter 2 card + banner), `v2.css`.
- Actions: `hireCandidate(id)`, `fireTeamMember(id)`, `assignTeamMember(id, a)`, `refreshCandidates()` (fills when empty on first Team-tab open).
- Team panel:
  - header with team n/cap, burn and runway (via `getMonthlyBurn` / `getRunwayMonths`)
  - candidate cards with Hire + disabled reason, and Refresh
  - team rows with an assignment `<select>`, progress, skills, salary and Let go
- Tests: action tests for hire/fire/assign through the store (sfx mocked).
- Selector grep check (no array/object-building selectors).

### Task 6: Room seats + intern characters
- Files: `src/v2/scene/layout.ts` (seat furniture + `HIRE_SEATS` spots and pace paths), `src/v2/scene/assets.ts` (new models), `scripts/fetch-v2-assets.mjs`, `src/v2/scene/Character.tsx` (shared animated character, extracted from Founder: clone via `SkeletonUtils.clone`, clip/walk/typing logic), `Founder.tsx` (uses Character), `Hires.tsx` (one Character per team member), `Room.tsx` (seat furniture only when occupied), `GameScreenV2.tsx`.
- Layout tests extended: hire seats are inside their seat furniture, hire pace spots aren't inside furniture, seat furniture is inside the room.
- Asset test covers the new models.
- Screenshot harness: hire 2 interns, assign them, and screenshot. Acceptance: 3 characters, no overlaps, no console errors.

### Task 7: Final gates, legacy guard, review
- `tsc`, `npm test`, `npm run build`, harness, and the legacy guard.
- Fresh whole-branch review (Phase 3 range), then a fix pass on Critical/Important findings with tests.
