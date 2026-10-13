# v2 Phase 6 — Polish, Performance, Mobile — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make /new fast on phones and big rooms, readable on small screens, kind to reduced-motion users, and pay off the Phase 3 minors.

**Architecture:** Scene-level changes in `src/v2/scene/`, CSS in `src/v2/v2.css` scoped under `.v2-game`, small pure helpers with unit tests.

**Tech Stack:** R3F 8 / drei 9 (`PerformanceMonitor`, `AdaptiveDpr`, `useProgress`), three 0.183, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-29-v2-founder-journey-design.md` §10.

## Global Constraints

- All code in `src/v2/`, `scripts/`, `docs/`. No legacy edits, no new dependencies. No push. No AI attribution.
- Zustand selectors return stored refs/primitives only.

## Review Focus

1. **Instanced floor with tinted themes** → the tint still applies; the bedroom floor looks unchanged.
2. **PerformanceMonitor toggling shadows** → no flicker loop (decline/incline hysteresis).
3. **Phone layout with the Map/Team panels** → panel scrolls, nav reachable, room still clickable.
4. **Reduced motion mid-walk** → a character already walking snaps without getting stuck.
5. **Two-click "Let go" across re-renders** → the armed state resets after 3 s and per member.

---

### Task 1: Performance
- Files: `scene/Room.tsx` (InstancedFloor, seat bitmask selector), `scene/Character.tsx` (skeleton dispose), `scene/HomeScene.tsx` (PerformanceMonitor + AdaptiveDpr + shadow toggle), `scene/floor.ts` (pure instance matrices), tests `floor.test.ts`, `seats.test.ts`.
- Commit: "Instance floors, adapt quality, and stop scene leaks"

### Task 2: Reduced motion + loading
- Files: `scene/motion.ts` (`stepFor(reduced)`), `Character.tsx`, `PlaceholderRoom.tsx` / `RoomView.tsx` (progress), tests `motion.test.ts`.
- Commit: "Respect reduced motion and show load progress"

### Task 3: Mobile layout + vignette
- Files: `GameScreenV2.tsx` (`v2-game` class), `v2.css` (≤768px layout, vignette overlay), `scripts/v2-screenshot.mjs` (phone viewport).
- Commit: "Add a phone layout for /new"

### Task 4: UX debts
- Files: `v2Tick.ts` (syncPayroll before work), `TeamPanel.tsx` + `confirm.ts` (two-click helper), tests.
- Commit: "Confirm before letting someone go; drop departed hires before they work"

### Task 5: Gates + final review
- tsc, npm test, build, harness (all viewports), legacy guard; fresh opus review of Phase 5+6; one fix pass.
