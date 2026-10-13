# v2 Phase 4 — Location Ladder, Map, Full-time Hires — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Seven-location ladder with a Map tab, moving, full-time hires and promotion, Chapter 3, and legacy events scaled to company size.

**Architecture:** Pure modules in `src/v2/` (`locations.ts`, `eventsV2.ts`, extended `team.ts`/`work.ts`/`chapter.ts`) driven from `v2Tick`; thin store actions; React panels; scene picks a layout per location.

**Tech Stack:** TS 5.7, React 18, Zustand 5, R3F 8 / drei 9, vitest.

**Spec:** `docs/superpowers/specs/2026-09-29-v2-founder-journey-design.md` §8.

## Global Constraints

- All code in `src/v2/`, `scripts/`, `public/assets/v2/`, `docs/`. No legacy file edits.
- Zustand selectors return stored refs/primitives only.
- No push / PR. Commit locally on `v2/founder-journey`. No AI attribution in commits.
- Location table, tier table, event factors: exactly spec §8.2/8.3/8.5 unless the balance sim forces a change (ruling).

## Review Focus

1. **Moving with a worker mid-task** → task continues, seat renumbering never leaves two hires on one seat, characters re-seat.
2. **Legacy event bumps infra then you move** → rent becomes the new location's rent, not stacked.
3. **Loading a Phase 3 save** (no location fields; candidates without tier) → loads at Home with Home unlocked; candidates treated as interns.
4. **Event effect scaling with a 0-burn company** → factor floor 0.2 applies; no NaN, no positive-cash flip.
5. **Promoting a member mid-task** → task continues, speed rule switches from the next progress step, salary mirror updates.

---

### Task 1: Locations + state

- Files: create `src/v2/locations.ts`; modify `src/v2/state.ts`; tests `src/v2/__tests__/locations.test.ts`, `state.test.ts`.
- Produces: `LocationId`, `LOCATIONS: LocationDef[]` (`{ id, name, icon, capacity, rent, moveIn, unlockMrr }`), `locationIndex(id)`, `currentLocation(state)`, `updateUnlocks(state)` (peakMrr + unlock story lines), `canMove(state, id): 'ok'|'locked'|'current'|'cash'|'capacity'`, `moveTo(state, id)` (cash, rent, location, seat renumber, story). State: `Tier = 'intern' | 'fulltime'`, `V2Slice.location`, `unlockedLocations`, `peakMrr`, `chapter3: { beat: 0|1; complete }`, `InternCandidate.tier`. `migrateV2Slice` fills all.
- Tests: table monotonic (capacity, rent, unlock increase); unlocks at thresholds and only forward; each `canMove` reason; move effects incl. infra reset and seat renumbering; migration of a Phase 3 slice.
- Commit: "Add v2 location ladder with unlocks and moving"

### Task 2: Full-time tier + promotion

- Files: `src/v2/work.ts`, `src/v2/team.ts`; tests `work.test.ts`, `team.test.ts`.
- Produces: `TIER_RULES: Record<Tier, { mainSpeed, offSpeed, skillMain, skillOther, gain, cap }>`, `hireSpeed(member|role, type, tier)`, `mistakeChance({role, skills, tier})`, `isFullTimeUnlocked(state)` (stage ≥ 2), `generateCandidates(rng, { fullTime })` (3 interns + 2 full-time), `canPromote(state, id)`, `promoteMember(state, id)`; `teamCapacity` from location.
- Tests: speeds per tier; full-time mistake formula; full-time skill gain/cap; salary ranges; pool composition; promote rules (skill < 5, locked, already full-time) and effects (tier, salary max(current, 2000), mirror salary).
- Commit: "Add full-time hires and intern promotion"

### Task 3: Chapter 3 + tick wiring

- Files: `src/v2/chapter.ts`, `src/v2/v2Tick.ts`; tests `chapter.test.ts`, `v2Tick.test.ts`.
- Produces: `isMapUnlocked`, `CHAPTER3_GOAL_MRR = 5000`, `CHAPTER3_CARDS` (c3-0, c3-1, c3-done), `currentChapter3Card`, `onMoved(state)` (beat 0→1), `checkChapter3Complete`. v2Tick calls `updateUnlocks` and `checkChapter3Complete`.
- Tests: card order; beat on move; completion at $5k only after chapter 2; unlocks happen in the tick.
- Commit: "Add Chapter 3 and run location unlocks in the tick"

### Task 4: Events scaled to company size

- Files: create `src/v2/eventsV2.ts`; modify `v2Tick.ts`; tests `eventsV2.test.ts`.
- Produces: `EVENT_KEEP_CHANCE`, `EVENT_MIN_STAGE`, `EXEMPT_EVENTS`, `costFactor(state)`, `scaleText(text, f)`, `scaleEvent(event, f)`, `isScaled(event)`, `filterPendingEvent(state, rng)`.
- Tests: factor clamp at 0 burn and big burn; negative cash delta scaled and rounded to $50, positive untouched; infra increase scaled; text "$1,200" → scaled; exempt events untouched; gated event dropped below its stage; keep-chance roll; scale once (a scaled event isn't rescaled).
- Commit: "Scale legacy events to company size in v2"

### Task 5: Map tab, Team tab tiers, actions

- Files: create `src/v2/MapPanel.tsx`; modify `TeamPanel.tsx`, `FounderPanel.tsx`, `BottomNavV2.tsx`, `GameScreenV2.tsx`, `actions.ts`, `v2.css`; tests `actions.test.ts`.
- Produces: actions `moveToLocation(id)`, `promoteTeamMember(id)`; `refreshCandidates` respects full-time unlock.
- Tests: move through the store; promote through the store.
- Commit: "Add the Map tab and full-time hiring UI"

### Task 6: Generated rooms per location

- Files: `src/v2/scene/layout.ts` (or new `rooms.ts`), `Room.tsx`, `HomeScene.tsx`, `Founder.tsx`, `Hires.tsx`, `RoomView.tsx`, `devHooks.ts`, `scripts/v2-screenshot.mjs`; tests `rooms.test.ts`.
- Produces: `RoomLayout { width, depth, floor, walls, furniture, spots (founder), seats: { furniture, spots }[] }`, `roomFor(locationId)`; Home returns the existing layout.
- Tests: every location's layout has `capacity` seats; all furniture inside the room; seat furniture doesn't overlap; standing/pace spots not inside furniture; founder spots present.
- Screenshot: Villa with 4+ hires; Map tab. No console errors.
- Commit: "Render a generated room for each location"

### Task 7: Balance simulation

- Files: `src/v2/__tests__/balance.test.ts` (+ `src/v2/locations.ts` tuning if needed).
- Test: seeded Math.random, scripted player, 730 days, reaches coworking, never lost.
- Commit: "Add v2 balance simulation"

### Task 8: Gates + review

- tsc, npm test, build, harness, legacy guard; fresh opus review of the Phase 4 range; one fix pass.
