# v2 Phase 7 — Room-first UI, City Map, Hover Cards, Profit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the sidebar with a room-first layout (founder bar + modals), add a same-canvas 2.5D city map, hover cards, a profit pill and an emoji over every head.

**Architecture:** A small Zustand UI store (`src/v2/ui.ts`) holds view/modal/selection state (not game state, not saved). Existing panels are reused inside a `Modal`. The scene picks `office` or `city` content from the UI store. City layout is pure data in `scene/city.ts`.

**Tech Stack:** React 18, Zustand 5, R3F 8 / drei 9, three 0.183, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-29-v2-founder-journey-design.md` §11.

## Global Constraints

- All code in `src/v2/`, `scripts/`, `public/assets/v2/`, `docs/`. No legacy edits. No push. No AI attribution in commits.
- Zustand selectors return stored refs/primitives only.
- No layout switch; the old layout lives only in git tag `v2-sidebar-layout`.

## Review Focus

1. **Modal open while an event card / family-money modal appears** → event/family modals stay on top and clickable.
2. **City view while a hire is mid-task** → game keeps ticking; returning to the office shows characters at their seats.
3. **Moving from the city** → view returns to office with the transition; selection cleared.
4. **Hover card on a character that unmounts** (fired, moved) → no stuck card or cursor.
5. **Phone (390px)** → founder bar wraps, modals are full-screen and scroll, nav reachable.

---

### Task 1: Emoji everywhere + profit
- Files: `scene/founderPose.ts` (develop 🛠️, no task 💤), `scene/reactions.ts` (⏳ waiting), `scene/Hires.tsx`, `src/v2/finance.ts` (`profitMonthly(state)`), `TopBarV2.tsx` (Profit pill), `TeamPanel.tsx`; tests `hirePose.test.ts`, `reactions.test.ts`, `finance.test.ts`.
- Commit: "Show an emoji over every head and a profit pill"

### Task 2: UI store + modals + room-first layout
- Files: `src/v2/ui.ts`, `src/v2/Modal.tsx`, `src/v2/FounderBar.tsx`, `src/v2/CoachOverlay.tsx`, `src/v2/PersonCard.tsx`, `GameScreenV2.tsx`, `BottomNavV2.tsx`, `FounderPanel.tsx` (coach card extracted), `TeamPanel.tsx` (member card extracted), `v2.css`; tests `ui.test.ts`, `founderBar.test.ts` (pure reason helper).
- Commit: "Room-first layout with a founder bar and modals"

### Task 3: Hover cards
- Files: `scene/Character.tsx` (hover state + `hoverCard` slot), `scene/Hires.tsx`, `scene/Founder.tsx`, `scene/hoverText.ts` (pure); tests `hoverText.test.ts`.
- Commit: "Hover a character to see what they're doing"

### Task 4: City map
- Files: `scripts/fetch-v2-assets.mjs` (city kits), `public/assets/v2/city/**`, `scene/assets.ts` (city models), `scene/city.ts` (layout), `scene/City.tsx`, `CityCard.tsx`, `HomeScene.tsx` (office/city switch + camera), `MapPanel.tsx` (removed), `devHooks.ts`, `scripts/v2-screenshot.mjs`; tests `city.test.ts`, `assets.test.ts`.
- Commit: "Add the 2.5D city map on the room canvas"

### Task 5: Gates + review
- tsc, npm test, build, harness (desktop/portrait/phone, modals, city), legacy guard; fresh opus review; one fix pass.
