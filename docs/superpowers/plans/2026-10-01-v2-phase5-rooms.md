# v2 Phase 5 — Every Room, More Characters — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give every location its own look (theme + amenities), use all Kenney characters, add in-scene reactions, click-to-open, and a move transition.

**Architecture:** `src/v2/scene/themes.ts` (pure data), `rooms.ts` gains the amenity strip, scene components read the theme from `RoomLayout`; small pure helpers for reactions and the transition trigger.

**Tech Stack:** TS, React 18, R3F 8 / drei 9 / three 0.183, vitest, Playwright harness.

**Spec:** `docs/superpowers/specs/2026-09-29-v2-founder-journey-design.md` §9.

## Global Constraints

- All code in `src/v2/`, `scripts/`, `public/assets/v2/`, `docs/`. No legacy edits. No push. No AI attribution.
- Zustand selectors return stored refs/primitives only.
- Bedroom (home) look unchanged.

## Review Focus

1. **Tinted materials** → cloned per piece, never mutating the shared cached GLTF material (which would tint every room).
2. **Click on a hire behind furniture / on the founder** → only the nearest character handles it (stopPropagation), no panel flicker.
3. **Fired/promoted hire with an open highlight** → TeamPanel focus on a missing id doesn't crash.
4. **Move transition on load** → loading a save at the Villa doesn't play the transition.
5. **Amenity strip widening the room** → camera fit still frames the whole room at the Building size.

---

### Task 1: Themes + amenity strip
- Files: create `src/v2/scene/themes.ts`; modify `src/v2/scene/rooms.ts`, `assets.ts`, `scripts/fetch-v2-assets.mjs` (new furniture); tests `themes.test.ts`, `rooms.test.ts`.
- Produces: `Theme { background, floorTint, wallTint, sun, fill, hemi: [sky, ground], amenities(x0, depth): Placement[] }`, `THEMES: Record<LocationId, Theme>`; `RoomLayout.theme`, `RoomLayout.amenityStrip?: { x0, x1 }`.
- Tests: theme per location; amenities inside strip and room; no overlap with any furniture; no standing/pace spot covered; every amenity model is in FURNITURE_MODELS and on disk.
- Commit: "Give each location a theme and amenities"

### Task 2: Themed scene
- Files: `Room.tsx` (tinted floor/wall pieces with cloned materials), `HomeScene.tsx` (background, light colours from theme); harness loops every location.
- Commit: "Render location themes in the scene"

### Task 3: Characters + reactions
- Files: `team.ts` (INTERN_MODELS: all 11), `assets.ts` (CHARACTER_MODELS), fetch script; `scene/reactions.ts` (pure: `reactionIcon({ idle, mistakeAt, now })`); `Hires.tsx` (flash on mistake count change, 💤 idle); tests.
- Commit: "Use every Kenney character and add in-scene reactions"

### Task 4: Click to open + move transition
- Files: `Character.tsx` (onSelect, pointer cursor), `Hires.tsx`, `Founder.tsx`, `GameScreenV2.tsx` (panel + focus state), `TeamPanel.tsx` (focusId → highlight + scrollIntoView), `MoveTransition.tsx` + pure `shouldShowMove(prev, next)`; tests for the helper.
- Commit: "Click characters to open their panel; add a move transition"

### Task 5: Gates + review
- tsc, npm test, build, harness (all locations + click), legacy guard; fresh opus review; one fix pass.
