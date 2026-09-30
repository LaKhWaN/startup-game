# v2 Phase 2 — Renderer Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Phase 1 placeholder card at `/new` with an R3F 2.5D isometric cozy bedroom-desk Home room. A Kenney chibi founder walks to a spot and animates for the current task. Music moves out of Phaser for v2, and there is a no-WebGL fallback.

**Architecture:**
- **Pure logic:** `src/v2/scene/layout.ts`, `motion.ts`, `founderPose.ts`, `assets.ts`, `webgl.ts`, all unit-tested.
- **Thin R3F components:** `HomeScene`, `Room`, `Founder`. They read state only through `useV2`.
- **Loading:** `HomeScene` is lazy-loaded. The Phase 1 `PlaceholderRoom` doubles as the Suspense fallback and the no-WebGL fallback.
- **Assets:** a fetch script pulls the Kenney GLBs we use into `public/assets/v2/` (committed).
- **Visual check:** a Playwright script screenshots `/new` headless so camera, light and scale get tuned against real pixels.

**Tech Stack:** three ^0.183.2, @react-three/fiber ^8.18.0, @react-three/drei ^9.122.0, React 18.3, vitest 3.2, playwright ^1.63 (new dev dependency).

**Spec:** `docs/superpowers/specs/2026-09-29-v2-founder-journey-design.md` §6 (Phase 2)

## Global Constraints

- **Legacy stays untouched.** Outside `src/v2/`, `scripts/`, `public/assets/v2/` and `docs/`, the only files that may change are `package.json` and `package-lock.json`.
- **Assets:** Kenney Mini Characters + Kenney Furniture Kit, CC0. Only the GLBs actually used get committed, plus `public/assets/v2/LICENSE-kenney.txt`.
- **Character asset layout:** `public/assets/v2/characters/character-male-a.glb` + `public/assets/v2/characters/Textures/colormap.png`. The GLB references `Textures/colormap.png` relatively, so the pair must stay together.
- **Measured asset facts:**
  - 1 unit = 1 floor tile.
  - `wall` is 1 × 1.29 × 0.05.
  - Furniture pivots sit at a corner: models extend +x and −z from their origin.
  - The character is ≈0.67 tall. Bones: `root`, `torso`, `head`, `arm-left`, `arm-right`, `leg-left`, `leg-right`.
- **Character clips used:** `idle`, `walk`, `sit`, `interact-right`, `emote-yes`. There is no typing clip; typing is procedural bone motion.
- **Camera:** orthographic, fixed isometric (≈35° down, 45° around), no orbit controls. Lighting: warm key light through the window + soft shadows, hemisphere fill, warm lamp point light, contact shadows, ACES tone mapping.
- **Walking:** ≈1.2 units/s of scene time, trips capped at ~2 real seconds, independent of game speed. A task change mid-walk retargets, never teleports.
- **Selector rule (from Phase 1):** `useV2` selectors return stored references or primitives only.
- **Commits:** only committed locally; do not push (user rule: push once when all v2 phases are done). No AI attribution in commits.

## Review Focus

1. **The camera frame at unusual aspect ratios** (narrow mobile widths, ultrawide) — the whole room should stay in view. → Task 5 screenshots at 1440×900 and 390×844.
2. **Game speed at 10× or paused while the founder is mid-walk** — the walk should still look natural (scene time, not game time), and a paused game shouldn't freeze the render loop into a frozen, half-rotated pose. → Task 2 `stepToward` tests; Task 6 screenshots at 10×.
3. **Assets fail to load** (404, or `colormap.png` missing next to the GLB) — the player should never get a blank or crashed canvas area. → Task 1 manifest test checks the texture sits next to the GLB; Task 5 wraps the scene in an error boundary that falls back to `PlaceholderRoom`.
4. **Music on first load** — browsers block autoplay. Music should start after the first click, never throw, and stop when leaving `/new`. → Task 3 hook design; Task 6 manual check.
5. **Leaving `/new` and coming back** (remount) — there should be no duplicate music, no leaked audio elements, and no WebGL context warnings piling up. → Task 3 cleanup; Task 6 check.

---

## File Map

| File | Responsibility |
|---|---|
| `scripts/fetch-v2-assets.mjs` | Download the Kenney zips, extract only the used GLBs + textures + license into `public/assets/v2/` |
| `public/assets/v2/**` | Committed GLBs, `characters/Textures/colormap.png`, `LICENSE-kenney.txt` |
| `src/v2/scene/assets.ts` | Model URLs, character clip list, preload list |
| `src/v2/scene/layout.ts` | Room bounds, furniture placements with footprints, named spots |
| `src/v2/scene/motion.ts` | `stepToward` walking math, yaw math |
| `src/v2/scene/founderPose.ts` | task → spot/clip/typing/pace/icon |
| `src/v2/scene/webgl.ts` | WebGL detection |
| `src/v2/audio.ts` | `useBackgroundMusic`, `useTypingLoop` |
| `src/v2/devHooks.ts` | Dev-only `window.__v2` helpers for the screenshot script |
| `scripts/v2-screenshot.mjs` | Playwright: drive `/new`, save PNGs, fail on a blank canvas |
| `src/v2/scene/HomeScene.tsx` | `<Canvas>`, camera rig, lights, Suspense, error boundary |
| `src/v2/scene/Room.tsx` | Floor, walls, window, furniture, picture frame, lamp light |
| `src/v2/scene/Founder.tsx` | Character, mixer, walking, typing bob, icons, progress ring, emote |
| `src/v2/RoomView.tsx` | Chooses `HomeScene` or `PlaceholderRoom` |
| `src/v2/GameScreenV2.tsx` | Swaps `PlaceholderRoom` → `RoomView`; mounts audio hooks |
| `src/v2/__tests__/*.test.ts` | Unit tests |

---

### Task 1: Asset pipeline + manifest

**Files:**
- Create: `scripts/fetch-v2-assets.mjs`
- Create (generated, committed): `public/assets/v2/furniture/*.glb`, `public/assets/v2/characters/character-male-a.glb`, `public/assets/v2/characters/Textures/colormap.png`, `public/assets/v2/LICENSE-kenney.txt`
- Create: `src/v2/scene/assets.ts`
- Test: `src/v2/__tests__/assets.test.ts`

**Interfaces:**
- Produces:
  - `FURNITURE_MODELS` (const tuple of model names)
  - `type FurnitureModel = typeof FURNITURE_MODELS[number]`
  - `furnitureUrl(name: FurnitureModel): string`
  - `CHARACTER_URL`, `CHARACTER_CLIPS` (const tuple of all 32 clip names)
  - `type CharacterClip`
  - `PRELOAD_URLS: string[]`

- [ ] **Step 1: Write the failing test `src/v2/__tests__/assets.test.ts`**

```ts
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CHARACTER_CLIPS, CHARACTER_URL, FURNITURE_MODELS, furnitureUrl, PRELOAD_URLS } from '../scene/assets'

const PUBLIC = join(process.cwd(), 'public')
const onDisk = (url: string) => existsSync(join(PUBLIC, url))

describe('asset manifest', () => {
  it('every furniture model exists under public/', () => {
    for (const m of FURNITURE_MODELS) expect(onDisk(furnitureUrl(m)), furnitureUrl(m)).toBe(true)
  })

  it('the character GLB exists with its colormap texture beside it', () => {
    expect(onDisk(CHARACTER_URL)).toBe(true)
    expect(onDisk(join(dirname(CHARACTER_URL), 'Textures', 'colormap.png'))).toBe(true)
  })

  it('ships the Kenney license', () => {
    expect(onDisk('/assets/v2/LICENSE-kenney.txt')).toBe(true)
  })

  it('lists the clips the scene relies on', () => {
    for (const c of ['idle', 'walk', 'sit', 'interact-right', 'emote-yes']) expect(CHARACTER_CLIPS).toContain(c)
  })

  it('preloads every model', () => {
    expect(PRELOAD_URLS).toContain(CHARACTER_URL)
    expect(PRELOAD_URLS).toHaveLength(FURNITURE_MODELS.length + 1)
  })
})
```

- [ ] **Step 2: Run it — expect FAIL**

Run: `npx vitest run src/v2/__tests__/assets.test.ts`
Expected: FAIL — `Cannot find module '../scene/assets'`.

- [ ] **Step 3: Create `src/v2/scene/assets.ts`**

```ts
export const FURNITURE_MODELS = [
  'floorFull', 'wall', 'wallWindow',
  'desk', 'chairDesk', 'laptop',
  'bedSingle', 'pillow', 'sideTable', 'lampSquareTable',
  'bookcaseOpen', 'books', 'pottedPlant', 'plantSmall1',
  'lampRoundFloor', 'rugRectangle',
] as const

export type FurnitureModel = typeof FURNITURE_MODELS[number]

export function furnitureUrl(name: FurnitureModel): string {
  return `/assets/v2/furniture/${name}.glb`
}

export const CHARACTER_URL = '/assets/v2/characters/character-male-a.glb'

/** Clip names read from the Kenney Mini Characters GLB (all 12 characters share them). */
export const CHARACTER_CLIPS = [
  'static', 'idle', 'walk', 'sprint', 'jump', 'fall', 'crouch', 'sit', 'drive', 'die', 'pick-up',
  'emote-yes', 'emote-no', 'holding-right', 'holding-left', 'holding-both', 'holding-right-shoot',
  'holding-left-shoot', 'holding-both-shoot', 'attack-melee-right', 'attack-melee-left',
  'attack-kick-right', 'attack-kick-left', 'interact-right', 'interact-left', 'wheelchair-sit',
  'wheelchair-look-left', 'wheelchair-look-right', 'wheelchair-move-forward', 'wheelchair-move-back',
  'wheelchair-move-left', 'wheelchair-move-right',
] as const

export type CharacterClip = typeof CHARACTER_CLIPS[number]

export const PRELOAD_URLS: string[] = [...FURNITURE_MODELS.map(furnitureUrl), CHARACTER_URL]
```

- [ ] **Step 4: Create `scripts/fetch-v2-assets.mjs`**

```js
#!/usr/bin/env node
// Re-fetches the Kenney CC0 packs and extracts only what /new uses into
// public/assets/v2/. The results are committed; run this only to refresh them.
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHARS_ZIP = 'https://kenney.nl/media/pages/assets/mini-characters/bfc7e272b4-1774770718/kenney_mini-characters.zip'
const FURN_ZIP = 'https://kenney.nl/media/pages/assets/furniture-kit/440e0608a4-1677580847/kenney_furniture-kit.zip'

const FURNITURE = [
  'floorFull', 'wall', 'wallWindow', 'desk', 'chairDesk', 'laptop', 'bedSingle', 'pillow', 'sideTable',
  'lampSquareTable', 'bookcaseOpen', 'books', 'pottedPlant', 'plantSmall1', 'lampRoundFloor', 'rugRectangle',
]
const CHARACTER = 'character-male-a'

const OUT = join(process.cwd(), 'public', 'assets', 'v2')
const work = mkdtempSync(join(tmpdir(), 'kenney-'))

async function download(url, file) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
  writeFileSync(file, Buffer.from(await res.arrayBuffer()))
}

await download(CHARS_ZIP, join(work, 'chars.zip'))
await download(FURN_ZIP, join(work, 'furn.zip'))
execFileSync('unzip', ['-oq', join(work, 'chars.zip'), '-d', join(work, 'chars')])
execFileSync('unzip', ['-oq', join(work, 'furn.zip'), '-d', join(work, 'furn')])

mkdirSync(join(OUT, 'furniture'), { recursive: true })
mkdirSync(join(OUT, 'characters', 'Textures'), { recursive: true })

for (const name of FURNITURE) {
  copyFileSync(join(work, 'furn', 'Models', 'GLTF format', `${name}.glb`), join(OUT, 'furniture', `${name}.glb`))
}
const charDir = join(work, 'chars', 'Models', 'GLB format')
copyFileSync(join(charDir, `${CHARACTER}.glb`), join(OUT, 'characters', `${CHARACTER}.glb`))
copyFileSync(join(charDir, 'Textures', 'colormap.png'), join(OUT, 'characters', 'Textures', 'colormap.png'))
copyFileSync(join(work, 'furn', 'License.txt'), join(OUT, 'LICENSE-kenney.txt'))

console.log(`Wrote ${FURNITURE.length} furniture models + ${CHARACTER} to ${OUT}`)
```

- [ ] **Step 5: Run the fetch script**

Run: `node scripts/fetch-v2-assets.mjs && du -sh public/assets/v2 && ls public/assets/v2/furniture | wc -l`
Expected: `Wrote 16 furniture models + character-male-a ...`, about 1–2 MB total, 16 furniture files.

- [ ] **Step 6: Run the test — expect PASS**

Run: `npx vitest run src/v2/__tests__/assets.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 7: Commit**

```bash
git add scripts/fetch-v2-assets.mjs public/assets/v2 src/v2/scene/assets.ts src/v2/__tests__/assets.test.ts
git commit -m "Add Kenney CC0 assets and manifest for the v2 room"
```

---

### Task 2: Room layout, motion and founder pose (pure)

**Files:**
- Create: `src/v2/scene/layout.ts`, `src/v2/scene/motion.ts`, `src/v2/scene/founderPose.ts`
- Test: `src/v2/__tests__/layout.test.ts`, `src/v2/__tests__/motion.test.ts`, `src/v2/__tests__/founderPose.test.ts`

**Interfaces:**
- Consumes: `FurnitureModel`, `CharacterClip`, `CHARACTER_CLIPS` (Task 1); `FounderTask` (`src/v2/state.ts`).
- Produces:
  - `layout.ts`: `ROOM = { width: 4, depth: 4 }` (x ∈ [0,4], z ∈ [−4,0]); `WALL_HEIGHT = 1.29`; `interface Placement { model: FurnitureModel; position: [number, number, number]; rotationY: 0 | 90 | 180 | 270; scale?: number; size: [number, number] }` (footprint width × depth, pre-rotation); `FURNITURE: Placement[]`; `WALLS: Placement[]`; `FLOOR: Placement[]`; `type SpotId = 'bed' | 'bookshelf' | 'desk' | 'paceA' | 'paceB'`; `interface Spot { position: [number, number, number]; yaw: number; seat?: FurnitureModel }`; `SPOTS: Record<SpotId, Spot>`; `footprint(p: Placement): { x0: number; x1: number; z0: number; z1: number }`
  - `motion.ts`: `WALK_SPEED = 1.2`, `MAX_TRIP_SECONDS = 2`; `tripSpeed(distance: number): number`; `stepToward(from: [number, number], to: [number, number], speed: number, dt: number): { pos: [number, number]; arrived: boolean }`; `yawTowards(from: [number, number], to: [number, number]): number`
  - `founderPose.ts`: `interface FounderPose { spot: SpotId; clip: CharacterClip; typing: boolean; pace: boolean; icon: '✉️' | '📞' | null }`; `founderPose(task: FounderTask | null): FounderPose`

- [ ] **Step 1: Write the failing tests**

`src/v2/__tests__/motion.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { MAX_TRIP_SECONDS, stepToward, tripSpeed, WALK_SPEED, yawTowards } from '../scene/motion'

describe('tripSpeed', () => {
  it('walks at 1.2 u/s for short trips', () => {
    expect(tripSpeed(1)).toBe(WALK_SPEED)
  })
  it('speeds up so no trip takes longer than 2 seconds', () => {
    expect(tripSpeed(6)).toBeCloseTo(6 / MAX_TRIP_SECONDS)
  })
})

describe('stepToward', () => {
  it('moves by speed*dt toward the target', () => {
    const r = stepToward([0, 0], [3, 4], 1, 1)
    expect(r.pos[0]).toBeCloseTo(0.6)
    expect(r.pos[1]).toBeCloseTo(0.8)
    expect(r.arrived).toBe(false)
  })
  it('lands exactly on the target without overshooting', () => {
    expect(stepToward([0, 0], [0.5, 0], 1.2, 1)).toEqual({ pos: [0.5, 0], arrived: true })
  })
  it('does not move when dt is 0 (paused render frames stay still)', () => {
    expect(stepToward([1, 1], [2, 2], 1.2, 0)).toEqual({ pos: [1, 1], arrived: false })
  })
  it('reports arrival when already there', () => {
    expect(stepToward([1, 1], [1, 1], 1.2, 0.016).arrived).toBe(true)
  })
})

describe('yawTowards', () => {
  it('faces +z at yaw 0 and +x at yaw π/2', () => {
    expect(yawTowards([0, 0], [0, 1])).toBeCloseTo(0)
    expect(yawTowards([0, 0], [1, 0])).toBeCloseTo(Math.PI / 2)
  })
})
```

`src/v2/__tests__/layout.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { FURNITURE, footprint, ROOM, SPOTS, type SpotId } from '../scene/layout'

const inside = (x: number, z: number, f: { x0: number; x1: number; z0: number; z1: number }) =>
  x > f.x0 && x < f.x1 && z > f.z0 && z < f.z1

describe('room layout', () => {
  it('keeps every spot inside the room', () => {
    for (const [id, s] of Object.entries(SPOTS)) {
      const [x, , z] = s.position
      expect(x > 0 && x < ROOM.width, `${id} x`).toBe(true)
      expect(z < 0 && z > -ROOM.depth, `${id} z`).toBe(true)
    }
  })

  it('keeps all furniture inside the room', () => {
    for (const p of FURNITURE) {
      const f = footprint(p)
      expect(f.x0 >= -0.01 && f.x1 <= ROOM.width + 0.01, `${p.model} x ${JSON.stringify(f)}`).toBe(true)
      expect(f.z0 >= -ROOM.depth - 0.01 && f.z1 <= 0.01, `${p.model} z ${JSON.stringify(f)}`).toBe(true)
    }
  })

  it('never puts a standing spot inside furniture', () => {
    const standing: SpotId[] = ['bookshelf', 'paceA', 'paceB']
    const floorItems = FURNITURE.filter(p => p.model !== 'rugRectangle' && p.position[1] === 0)
    for (const id of standing) {
      const [x, , z] = SPOTS[id].position
      for (const p of floorItems) expect(inside(x, z, footprint(p)), `${id} in ${p.model}`).toBe(false)
    }
  })

  it('puts seated spots on their seat', () => {
    for (const id of ['bed', 'desk'] as SpotId[]) {
      const spot = SPOTS[id]
      const seat = FURNITURE.find(p => p.model === spot.seat)
      expect(seat, id).toBeDefined()
      const [x, , z] = spot.position
      expect(inside(x, z, footprint(seat!)), `${id} on ${spot.seat}`).toBe(true)
    }
  })
})

describe('footprint', () => {
  it('extends +x/−z from the pivot and swaps axes when rotated 90°', () => {
    expect(footprint({ model: 'desk', position: [1, 0, -1], rotationY: 0, size: [0.7, 0.5] }))
      .toEqual({ x0: 1, x1: 1.7, z0: -1.5, z1: -1 })
    const r = footprint({ model: 'desk', position: [1, 0, -1], rotationY: 90, size: [0.7, 0.5] })
    expect(r.x1 - r.x0).toBeCloseTo(0.5)
    expect(r.z1 - r.z0).toBeCloseTo(0.7)
  })
})
```

`src/v2/__tests__/founderPose.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { CHARACTER_CLIPS } from '../scene/assets'
import { founderPose } from '../scene/founderPose'
import { SPOTS } from '../scene/layout'
import type { FounderTaskType } from '../state'

const task = (type: FounderTaskType) => ({ type, progress: 0.3 })

describe('founderPose', () => {
  it('maps every task and idle to a real spot and a real clip', () => {
    for (const t of [null, task('research'), task('develop'), task('emails'), task('sales')]) {
      const p = founderPose(t)
      expect(SPOTS[p.spot]).toBeDefined()
      expect(CHARACTER_CLIPS).toContain(p.clip)
    }
  })

  it('matches the spec table', () => {
    expect(founderPose(null)).toEqual({ spot: 'bed', clip: 'sit', typing: false, pace: false, icon: null })
    expect(founderPose(task('research'))).toEqual({ spot: 'bookshelf', clip: 'interact-right', typing: false, pace: false, icon: null })
    expect(founderPose(task('develop'))).toEqual({ spot: 'desk', clip: 'sit', typing: true, pace: false, icon: null })
    expect(founderPose(task('emails'))).toEqual({ spot: 'desk', clip: 'sit', typing: true, pace: false, icon: '✉️' })
    expect(founderPose(task('sales'))).toEqual({ spot: 'paceA', clip: 'walk', typing: false, pace: true, icon: '📞' })
  })
})
```

- [ ] **Step 2: Run them — expect FAIL**

Run: `npx vitest run src/v2/__tests__/motion.test.ts src/v2/__tests__/layout.test.ts src/v2/__tests__/founderPose.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create `src/v2/scene/motion.ts`**

```ts
export const WALK_SPEED = 1.2
export const MAX_TRIP_SECONDS = 2

/** Walk speed for a trip: normal pace, but never longer than MAX_TRIP_SECONDS. */
export function tripSpeed(distance: number): number {
  return Math.max(WALK_SPEED, distance / MAX_TRIP_SECONDS)
}

export function stepToward(
  from: [number, number],
  to: [number, number],
  speed: number,
  dt: number,
): { pos: [number, number]; arrived: boolean } {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const dist = Math.hypot(dx, dz)
  if (dist < 1e-6) return { pos: [to[0], to[1]], arrived: true }
  const step = speed * dt
  if (step >= dist) return { pos: [to[0], to[1]], arrived: true }
  return { pos: [from[0] + (dx / dist) * step, from[1] + (dz / dist) * step], arrived: false }
}

/** Yaw (rotation about Y) that faces from → to; 0 faces +z. */
export function yawTowards(from: [number, number], to: [number, number]): number {
  return Math.atan2(to[0] - from[0], to[1] - from[1])
}
```

- [ ] **Step 4: Create `src/v2/scene/layout.ts`**

The numbers below are the starting layout. Task 5/6 screenshots may nudge them; the layout tests keep any nudge honest.

```ts
import type { FurnitureModel } from './assets'

/** Floor spans x ∈ [0, 4], z ∈ [−4, 0]. Back wall at z = −4, left wall at x = 0. */
export const ROOM = { width: 4, depth: 4 } as const
export const WALL_HEIGHT = 1.29

export interface Placement {
  model: FurnitureModel
  position: [number, number, number]
  rotationY: 0 | 90 | 180 | 270
  scale?: number
  /** Footprint width (x) × depth (z) before rotation, from the model's measured bounds. */
  size: [number, number]
}

/** Kenney pivots sit at a corner: footprint extends +x and −z from the pivot at rotation 0. */
export function footprint(p: Placement): { x0: number; x1: number; z0: number; z1: number } {
  const s = p.scale ?? 1
  const [w, d] = [p.size[0] * s, p.size[1] * s]
  const [x, , z] = p.position
  switch (p.rotationY) {
    case 0: return { x0: x, x1: x + w, z0: z - d, z1: z }
    case 90: return { x0: x - d, x1: x, z0: z - w, z1: z }
    case 180: return { x0: x - w, x1: x, z0: z, z1: z + d }
    case 270: return { x0: x, x1: x + d, z0: z, z1: z + w }
  }
}

export const FLOOR: Placement[] = Array.from({ length: 16 }, (_, i) => ({
  model: 'floorFull' as const,
  position: [i % 4, 0, -Math.floor(i / 4)] as [number, number, number],
  rotationY: 0 as const,
  size: [1, 1] as [number, number],
}))

export const WALLS: Placement[] = [
  // Back wall (z = −4), window above the desk at x ∈ [1, 2]
  ...[0, 1, 2, 3].map(i => ({
    model: (i === 1 ? 'wallWindow' : 'wall') as FurnitureModel,
    position: [i, 0, -4] as [number, number, number],
    rotationY: 0 as const,
    size: [1, 0.05] as [number, number],
  })),
  // Left wall (x = 0)
  ...[0, 1, 2, 3].map(j => ({
    model: 'wall' as FurnitureModel,
    position: [0, 0, -j] as [number, number, number],
    rotationY: 90 as const,
    size: [1, 0.05] as [number, number],
  })),
]

export const FURNITURE: Placement[] = [
  { model: 'desk', position: [1.13, 0, -3.42], rotationY: 0, size: [0.734, 0.556] },
  { model: 'laptop', position: [1.3, 0.384, -3.5], rotationY: 0, scale: 0.55, size: [0.6, 0.546] },
  { model: 'chairDesk', position: [1.33, 0, -2.75], rotationY: 0, size: [0.479, 0.443] },
  { model: 'lampRoundFloor', position: [0.25, 0, -3.6], rotationY: 0, size: [0.152, 0.176] },
  { model: 'bedSingle', position: [0.08, 0, -0.05], rotationY: 0, size: [1.623, 1.892] },
  { model: 'pillow', position: [0.35, 0.35, -1.7], rotationY: 0, size: [0.23, 0.088] },
  { model: 'sideTable', position: [0.08, 0, -2.1], rotationY: 90, size: [0.534, 0.22] },
  { model: 'lampSquareTable', position: [0.1, 0.384, -2.2], rotationY: 0, size: [0.12, 0.12] },
  { model: 'bookcaseOpen', position: [3.0, 0, -3.73], rotationY: 0, size: [0.4, 0.25] },
  { model: 'books', position: [3.05, 0.44, -3.8], rotationY: 0, size: [0.2, 0.15] },
  { model: 'pottedPlant', position: [3.55, 0, -3.7], rotationY: 0, size: [0.255, 0.291] },
  { model: 'plantSmall1', position: [1.75, 0.384, -3.55], rotationY: 0, size: [0.189, 0.189] },
  { model: 'rugRectangle', position: [1.9, 0.002, -1.1], rotationY: 0, size: [1.57, 0.92] },
]

export type SpotId = 'bed' | 'bookshelf' | 'desk' | 'paceA' | 'paceB'

export interface Spot {
  position: [number, number, number]
  /** Facing when settled; 0 faces +z. */
  yaw: number
  /** Furniture the founder sits on, when seated. */
  seat?: FurnitureModel
}

export const SPOTS: Record<SpotId, Spot> = {
  bed: { position: [1.0, 0.3, -1.0], yaw: Math.PI / 2, seat: 'bedSingle' },
  bookshelf: { position: [3.2, 0, -3.1], yaw: Math.PI, seat: undefined },
  desk: { position: [1.55, 0.22, -2.95], yaw: Math.PI, seat: 'chairDesk' },
  paceA: { position: [2.6, 0, -2.6], yaw: Math.PI / 2 },
  paceB: { position: [3.5, 0, -2.0], yaw: -Math.PI / 2 },
}
```

- [ ] **Step 5: Create `src/v2/scene/founderPose.ts`**

```ts
import type { FounderTask } from '../state'
import type { CharacterClip } from './assets'
import type { SpotId } from './layout'

export interface FounderPose {
  spot: SpotId
  clip: CharacterClip
  typing: boolean
  pace: boolean
  icon: '✉️' | '📞' | null
}

export function founderPose(task: FounderTask | null): FounderPose {
  switch (task?.type) {
    case 'research': return { spot: 'bookshelf', clip: 'interact-right', typing: false, pace: false, icon: null }
    case 'develop': return { spot: 'desk', clip: 'sit', typing: true, pace: false, icon: null }
    case 'emails': return { spot: 'desk', clip: 'sit', typing: true, pace: false, icon: '✉️' }
    case 'sales': return { spot: 'paceA', clip: 'walk', typing: false, pace: true, icon: '📞' }
    default: return { spot: 'bed', clip: 'sit', typing: false, pace: false, icon: null }
  }
}
```

- [ ] **Step 6: Run the tests — expect PASS; adjust layout numbers if a layout test fails**

Run: `npx vitest run src/v2/__tests__/motion.test.ts src/v2/__tests__/layout.test.ts src/v2/__tests__/founderPose.test.ts`
Expected: PASS. If a layout test fails, move the offending spot or furniture (not the test) and note the change.

- [ ] **Step 7: Commit**

```bash
git add src/v2/scene/motion.ts src/v2/scene/layout.ts src/v2/scene/founderPose.ts src/v2/__tests__/motion.test.ts src/v2/__tests__/layout.test.ts src/v2/__tests__/founderPose.test.ts
git commit -m "Add v2 room layout, walking math and founder poses"
```

---

### Task 3: WebGL detection + audio hooks

**Files:**
- Create: `src/v2/scene/webgl.ts`, `src/v2/audio.ts`
- Test: `src/v2/__tests__/webgl.test.ts`

**Interfaces:**
- Produces:
  - `hasWebGL(create?: () => { getContext(kind: string): unknown }): boolean`
  - `useBackgroundMusic(src?: string): void`
  - `useTypingLoop(active: boolean, src?: string): void`

- [ ] **Step 1: Write the failing test `src/v2/__tests__/webgl.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { hasWebGL } from '../scene/webgl'

describe('hasWebGL', () => {
  it('is true when a webgl2 or webgl context is available', () => {
    expect(hasWebGL(() => ({ getContext: (k: string) => (k === 'webgl2' ? {} : null) }))).toBe(true)
    expect(hasWebGL(() => ({ getContext: (k: string) => (k === 'webgl' ? {} : null) }))).toBe(true)
  })
  it('is false when no context can be created', () => {
    expect(hasWebGL(() => ({ getContext: () => null }))).toBe(false)
  })
  it('is false when creating the canvas throws', () => {
    expect(hasWebGL(() => { throw new Error('no DOM') })).toBe(false)
  })
})
```

- [ ] **Step 2: Run it — expect FAIL**

Run: `npx vitest run src/v2/__tests__/webgl.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/v2/scene/webgl.ts`**

```ts
type CanvasLike = { getContext(kind: string): unknown }

export function hasWebGL(create: () => CanvasLike = () => document.createElement('canvas')): boolean {
  try {
    const canvas = create()
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}
```

- [ ] **Step 4: Create `src/v2/audio.ts`**

```ts
import { useEffect, useRef } from 'react'
import { useAudioStore } from '../audio/audioStore'

const TYPING_VOLUME_SCALE = 0.12 // matches the legacy Phaser typing loop

/** Loops background music at the user's music volume. Starts on the first click/key (autoplay policy). */
export function useBackgroundMusic(src = '/assets/music/bg_music.mp3'): void {
  const musicVolume = useAudioStore(s => s.musicVolume)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio(src)
    audio.loop = true
    audio.volume = useAudioStore.getState().musicVolume
    audioRef.current = audio

    const start = () => { void audio.play().catch(() => { /* still blocked; next gesture retries */ }) }
    start()
    window.addEventListener('pointerdown', start)
    window.addEventListener('keydown', start)
    return () => {
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, [src])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = musicVolume
  }, [musicVolume])
}

/** Soft keyboard loop while the founder is typing. */
export function useTypingLoop(active: boolean, src = '/assets/music/keyboard_typing.mp3'): void {
  const sfxVolume = useAudioStore(s => s.sfxVolume)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio(src)
    audio.loop = true
    audioRef.current = audio
    return () => {
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, [src])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = sfxVolume * TYPING_VOLUME_SCALE
    if (active) void audio.play().catch(() => { /* blocked until a gesture; harmless */ })
    else audio.pause()
  }, [active, sfxVolume])
}
```

- [ ] **Step 5: Run the test and typecheck**

Run: `npx vitest run src/v2/__tests__/webgl.test.ts && npx tsc --noEmit -p .`
Expected: PASS (3 tests), no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/v2/scene/webgl.ts src/v2/audio.ts src/v2/__tests__/webgl.test.ts
git commit -m "Add v2 WebGL detection and audio hooks"
```

---

### Task 4: Playwright screenshot harness + dev hooks

**Files:**
- Modify: `package.json` / `package-lock.json` (dev dependency)
- Create: `src/v2/devHooks.ts`
- Modify: `src/v2/AppV2.tsx` (install dev hooks in dev only)
- Create: `scripts/v2-screenshot.mjs`

**Interfaces:**
- Consumes: `newGameV2`, `startFounderTask`, `stepGame`, `getV2State` (from `./actions`).
- Produces: `installDevHooks(): void`, which sets `window.__v2 = { quickStart, startFounderTask, fastForward(hours), getV2State }`, dev only.

- [ ] **Step 1: Install Playwright and Chromium**

Run: `npm install -D playwright@^1.63.0 && npx playwright install chromium`
Expected: installs without error.

- [ ] **Step 2: Create `src/v2/devHooks.ts`**

```ts
import { scoreToDifficulty } from '../ai/gemini'
import { FEATURE_TEMPLATES } from '../data/featureTemplates'
import { getV2State, newGameV2, startFounderTask, stepGame } from './actions'

/** Dev-only helpers so scripts/v2-screenshot.mjs can drive /new without the Groq onboarding. */
export function installDevHooks(): void {
  const w = window as unknown as { __v2?: unknown }
  w.__v2 = {
    quickStart: () => newGameV2({
      idea: 'A scheduling tool for dog groomers',
      ideaScore: 6,
      ideaFeedback: 'Dev quick start',
      workspace: 'home',
      startupName: 'Groomly',
      aiRoadmap: FEATURE_TEMPLATES.slice(0, 6),
      difficulty: scoreToDifficulty(6),
    }),
    startFounderTask,
    fastForward: (hours: number) => { for (let i = 0; i < hours; i++) stepGame() },
    getV2State,
  }
}
```

- [ ] **Step 3: Install the hooks in `src/v2/AppV2.tsx`**

Add the import below the existing ones:
```tsx
import { installDevHooks } from './devHooks'
```
In the mount effect, add the dev-only call as the first line:
```tsx
  useEffect(() => {
    if (import.meta.env.DEV) installDevHooks()
    resetStoreForV2()
```

- [ ] **Step 4: Create `scripts/v2-screenshot.mjs`**

```js
#!/usr/bin/env node
// Usage: node scripts/v2-screenshot.mjs [baseUrl] [outDir]
// Needs `npm run dev` running. Drives /new via window.__v2 (dev-only hooks),
// saves PNGs, and exits non-zero if the canvas area renders blank.
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:5173'
const out = process.argv[3] ?? join(tmpdir(), 'v2-shots')
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const errors = []

async function shoot(viewport, tag) {
  const page = await browser.newPage({ viewport })
  page.on('console', m => { if (m.type() === 'error') errors.push(`[${tag}] ${m.text()}`) })
  page.on('pageerror', e => errors.push(`[${tag}] ${e.message}`))
  await page.goto(`${base}/new`)
  await page.waitForFunction(() => 'window' in globalThis && window.__v2)
  await page.evaluate(() => window.__v2.quickStart())
  await page.waitForTimeout(3000)
  await page.screenshot({ path: join(out, `${tag}-1-idle.png`) })

  await page.evaluate(() => { window.__v2.startFounderTask('research'); window.__v2.fastForward(12) })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: join(out, `${tag}-2-research.png`) })

  await page.evaluate(() => {
    window.__v2.fastForward(72)
    const f = window.__v2.getV2State().features.find(x => x.status === 'proposed')
    if (f) window.__v2.startFounderTask('develop', f.id)
    window.__v2.fastForward(6)
  })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: join(out, `${tag}-3-develop.png`) })

  // Blank check: sample the canvas-area pixels from a real screenshot of that element.
  const area = page.locator('.game-canvas-area')
  const png = await area.screenshot()
  const distinct = await page.evaluate(async (b64) => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width; c.height = img.height
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const { data } = ctx.getImageData(0, 0, c.width, c.height)
    const seen = new Set()
    for (let i = 0; i < data.length; i += 4 * 97) seen.add(`${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`)
    return seen.size
  }, png.toString('base64'))
  await page.close()
  return distinct
}

const desktop = await shoot({ width: 1440, height: 900 }, 'desktop')
const mobile = await shoot({ width: 390, height: 844 }, 'mobile')
await browser.close()

console.log(`screenshots → ${out}`)
console.log(`distinct colors: desktop=${desktop} mobile=${mobile}`)
if (errors.length) console.log(`console errors:\n${errors.join('\n')}`)
if (desktop < 12 || mobile < 12) { console.error('Canvas area looks blank.'); process.exit(1) }
```

- [ ] **Step 5: Run the harness against the current (placeholder) screen**

Run: `npm run dev` in the background, then `node scripts/v2-screenshot.mjs`.
Expected: it prints the screenshot dir and distinct-color counts ≥ 12, with no console errors. Open `desktop-1-idle.png` with the Read tool and confirm it shows the Phase 1 placeholder card inside the game layout.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/v2/devHooks.ts src/v2/AppV2.tsx scripts/v2-screenshot.mjs
git commit -m "Add Playwright screenshot harness and dev hooks for /new"
```

---

### Task 5: Static room scene + fallback wiring

**Files:**
- Create: `src/v2/scene/HomeScene.tsx`, `src/v2/scene/Room.tsx`, `src/v2/RoomView.tsx`
- Modify: `src/v2/GameScreenV2.tsx` (swap `PlaceholderRoom` for `RoomView`)
- Modify: `src/v2/v2.css` (scene container)

**Interfaces:**
- Consumes: `FLOOR`, `WALLS`, `FURNITURE`, `ROOM`, `WALL_HEIGHT` (Task 2); `furnitureUrl`, `PRELOAD_URLS` (Task 1); `hasWebGL` (Task 3); `PlaceholderRoom` (Phase 1).
- Produces:
  - `default export HomeScene` (lazy-loadable), with a `children` slot so Task 6 can add the founder.
  - `RoomView()`: renders `HomeScene` inside Suspense + an error boundary when WebGL is available, else `PlaceholderRoom`.

- [ ] **Step 1: Create `src/v2/scene/Room.tsx`**

```tsx
import { Clone, useGLTF } from '@react-three/drei'
import { furnitureUrl } from './assets'
import { FLOOR, FURNITURE, WALLS, type Placement } from './layout'

function Piece({ p }: { p: Placement }) {
  const { scene } = useGLTF(furnitureUrl(p.model))
  return (
    <Clone
      object={scene}
      position={p.position}
      rotation={[0, (p.rotationY * Math.PI) / 180, 0]}
      scale={p.scale ?? 1}
      castShadow
      receiveShadow
    />
  )
}

/** A simple framed picture on the left wall; the kit has no posters. */
function PictureFrame() {
  return (
    <group position={[0.03, 0.75, -2.6]} rotation={[0, Math.PI / 2, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.46, 0.34, 0.03]} />
        <meshStandardMaterial color="#6b4a2f" />
      </mesh>
      <mesh position={[0, 0, 0.017]}>
        <planeGeometry args={[0.38, 0.26]} />
        <meshStandardMaterial color="#e9b872" />
      </mesh>
    </group>
  )
}

export function Room() {
  return (
    <group>
      {FLOOR.map((p, i) => <Piece key={`f${i}`} p={p} />)}
      {WALLS.map((p, i) => <Piece key={`w${i}`} p={p} />)}
      {FURNITURE.map((p, i) => <Piece key={`${p.model}-${i}`} p={p} />)}
      <PictureFrame />
    </group>
  )
}
```

- [ ] **Step 2: Create `src/v2/scene/HomeScene.tsx`**

```tsx
import { ContactShadows, useGLTF } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, type ReactNode } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { PRELOAD_URLS } from './assets'
import { ROOM } from './layout'
import { Room } from './Room'

PRELOAD_URLS.forEach(url => useGLTF.preload(url))

const CENTER: [number, number, number] = [ROOM.width / 2, 0.45, -ROOM.depth / 2]
// Isometric direction: 45° around, ≈33° down.
const CAMERA_DIR: [number, number, number] = [1, 0.9, 1]
const CAMERA_DISTANCE = 20
/** World units that must fit across the smaller viewport dimension. */
const VIEW_SPAN = 6.4

function CameraRig() {
  const { camera, size } = useThree()
  useEffect(() => {
    const len = Math.hypot(...CAMERA_DIR)
    camera.position.set(
      CENTER[0] + (CAMERA_DIR[0] / len) * CAMERA_DISTANCE,
      CENTER[1] + (CAMERA_DIR[1] / len) * CAMERA_DISTANCE,
      CENTER[2] + (CAMERA_DIR[2] / len) * CAMERA_DISTANCE,
    )
    camera.lookAt(...CENTER)
    camera.zoom = Math.min(size.width, size.height) / VIEW_SPAN
    camera.updateProjectionMatrix()
  }, [camera, size])
  return null
}

function Lights() {
  return (
    <>
      <hemisphereLight args={['#fff1dc', '#4a3a2c', 0.9]} />
      {/* Warm evening light coming in through the back-wall window */}
      <directionalLight
        position={[1.5, 5, -7]}
        intensity={2.2}
        color="#ffd9a8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-bias={-0.0005}
      />
      {/* Soft front fill so the cut-away side isn't black */}
      <directionalLight position={[8, 6, 6]} intensity={0.6} color="#cfd8ff" />
      {/* Floor lamp by the desk */}
      <pointLight position={[0.33, 0.95, -3.52]} intensity={3} distance={3.5} decay={2} color="#ffb46b" />
    </>
  )
}

export default function HomeScene({ children }: { children?: ReactNode }) {
  return (
    <div className="v2-scene">
      <Canvas
        orthographic
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: import.meta.env.DEV }}
        onCreated={({ gl }) => { gl.toneMapping = ACESFilmicToneMapping }}
      >
        <color attach="background" args={['#2b2119']} />
        <CameraRig />
        <Lights />
        <Room />
        <ContactShadows position={[ROOM.width / 2, 0.006, -ROOM.depth / 2]} scale={4.5} blur={2.4} opacity={0.45} far={1.5} />
        {children}
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/v2/RoomView.tsx`**

```tsx
import { Component, lazy, Suspense, useMemo, type ReactNode } from 'react'
import { PlaceholderRoom } from './PlaceholderRoom'
import { hasWebGL } from './scene/webgl'

const HomeScene = lazy(() => import('./scene/HomeScene'))

/** Any asset/render failure falls back to the placeholder instead of a blank area. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err: unknown) { console.error('[v2 scene] falling back to placeholder:', err) }
  render() { return this.state.failed ? <PlaceholderRoom /> : this.props.children }
}

export function RoomView({ children }: { children?: ReactNode }) {
  const webgl = useMemo(() => hasWebGL(), [])
  if (!webgl) return <PlaceholderRoom />
  return (
    <SceneBoundary>
      <Suspense fallback={<PlaceholderRoom />}>
        <HomeScene>{children}</HomeScene>
      </Suspense>
    </SceneBoundary>
  )
}
```

- [ ] **Step 4: Add the scene container style to `src/v2/v2.css`**

Append:
```css
.v2-scene { flex: 1; min-height: 0; position: relative; background: #2b2119; }
.v2-scene canvas { display: block; }
```

- [ ] **Step 5: Swap the view in `src/v2/GameScreenV2.tsx`**

Replace `import { PlaceholderRoom } from './PlaceholderRoom'` with `import { RoomView } from './RoomView'`, and replace `<PlaceholderRoom />` with `<RoomView />`.

- [ ] **Step 6: Gates**

Run: `npx tsc --noEmit -p . && npm test && npm run build`
Expected: all green.

- [ ] **Step 7: Screenshot, look, tune**

Run: `node scripts/v2-screenshot.mjs` with the dev server running. Read `desktop-1-idle.png` and `mobile-1-idle.png`.
Acceptance, by looking at the images:
- the whole room (both walls, floor, bed, desk, shelf) is in frame at both sizes
- furniture sits on the floor, oriented sensibly (desk and chair face each other, bed against the left wall, bookcase against the back wall)
- lighting reads as a warm evening, and nothing is pure black or blown out
- there are no console errors

Tune only these values until it passes: `layout.ts` positions/rotations (then re-run `npx vitest run src/v2/__tests__/layout.test.ts`), `VIEW_SPAN`, `CAMERA_DIR`, and light intensities/colors. Record each tuning change in the commit message.

- [ ] **Step 8: Commit**

```bash
git add src/v2/scene/Room.tsx src/v2/scene/HomeScene.tsx src/v2/RoomView.tsx src/v2/v2.css src/v2/GameScreenV2.tsx src/v2/scene/layout.ts
git commit -m "Render the v2 Home room in R3F with placeholder fallback"
```

---

### Task 6: Founder character, audio wiring, final checks

**Files:**
- Create: `src/v2/scene/Founder.tsx`
- Modify: `src/v2/GameScreenV2.tsx` (`<RoomView><Founder /></RoomView>`, audio hooks)

**Interfaces:**
- Consumes: `CHARACTER_URL` (Task 1); `SPOTS` (Task 2); `founderPose` (Task 2); `stepToward`, `tripSpeed`, `yawTowards` (Task 2); `useV2` (Phase 1); `useBackgroundMusic`, `useTypingLoop` (Task 3).
- Produces: `Founder()` and `LaptopGlow()` (R3F components, used inside `HomeScene`).

- [ ] **Step 1: Create `src/v2/scene/Founder.tsx`**

```tsx
import { Html, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimationClip, AnimationMixer, LoopOnce, type AnimationAction, type Group, type Object3D } from 'three'
import { useV2 } from '../actions'
import { CHARACTER_URL, type CharacterClip } from './assets'
import { founderPose } from './founderPose'
import { SPOTS, type SpotId } from './layout'
import { stepToward, tripSpeed, yawTowards } from './motion'

const CHARACTER_SCALE = 0.85
const FADE = 0.25

export function Founder() {
  const task = useV2(s => s.v2.founder.task)
  const pose = founderPose(task)

  const gltf = useGLTF(CHARACTER_URL)
  const root = useRef<Group>(null)
  const mixer = useMemo(() => new AnimationMixer(gltf.scene), [gltf.scene])
  const actions = useMemo(() => {
    const map = new Map<CharacterClip, AnimationAction>()
    for (const clip of gltf.animations) map.set(clip.name as CharacterClip, mixer.clipAction(AnimationClip.findByName(gltf.animations, clip.name)))
    return map
  }, [gltf.animations, mixer])
  const bones = useMemo(() => ({
    head: gltf.scene.getObjectByName('head') as Object3D | undefined,
    armL: gltf.scene.getObjectByName('arm-left') as Object3D | undefined,
    armR: gltf.scene.getObjectByName('arm-right') as Object3D | undefined,
  }), [gltf.scene])

  useEffect(() => {
    gltf.scene.traverse(o => { o.castShadow = true })
  }, [gltf.scene])

  // Walking state lives in refs: it's per-frame, not React state.
  const pos = useRef<[number, number]>([SPOTS.bed.position[0], SPOTS.bed.position[2]])
  const target = useRef<SpotId>('bed')
  const walking = useRef(false)
  const current = useRef<AnimationAction | null>(null)
  const [emoting, setEmoting] = useState(false)
  const prevTask = useRef(task)

  // When a task ends, play a quick nod before settling.
  useEffect(() => {
    if (prevTask.current && !task) {
      setEmoting(true)
      const t = setTimeout(() => setEmoting(false), 1000)
      prevTask.current = task
      return () => clearTimeout(t)
    }
    prevTask.current = task
  }, [task])

  // Retarget on pose change (task switch mid-walk just retargets).
  useEffect(() => {
    target.current = pose.spot
    walking.current = true
  }, [pose.spot])

  function play(name: CharacterClip, once = false) {
    const next = actions.get(name)
    if (!next || next === current.current) return
    next.reset()
    if (once) { next.setLoop(LoopOnce, 1); next.clampWhenFinished = true }
    next.fadeIn(FADE).play()
    current.current?.fadeOut(FADE)
    current.current = next
  }

  useFrame((state, delta) => {
    const g = root.current
    if (!g) return
    const dt = Math.min(delta, 0.1)
    const spot = SPOTS[target.current]
    const goal: [number, number] = [spot.position[0], spot.position[2]]

    if (walking.current) {
      const dist = Math.hypot(goal[0] - pos.current[0], goal[1] - pos.current[1])
      const step = stepToward(pos.current, goal, tripSpeed(dist), dt)
      if (!step.arrived) g.rotation.y = yawTowards(pos.current, goal)
      pos.current = step.pos
      if (step.arrived) {
        walking.current = false
        // Pacing: bounce between the two window-side spots.
        if (pose.pace) {
          target.current = target.current === 'paceA' ? 'paceB' : 'paceA'
          walking.current = true
        }
      }
    }

    const settled = !walking.current
    const y = settled ? spot.position[1] : 0
    g.position.set(pos.current[0], y, pos.current[1])
    if (settled && !pose.pace) g.rotation.y = spot.yaw

    if (emoting) play('emote-yes', true)
    else if (!settled || pose.pace) play('walk')
    else play(pose.clip)

    mixer.update(dt)

    // Procedural motion on top of the clip (the clip rewrites bones each frame).
    const t = state.clock.elapsedTime
    if (settled && pose.typing) {
      if (bones.armL) bones.armL.rotation.x += Math.sin(t * 14) * 0.12
      if (bones.armR) bones.armR.rotation.x += Math.sin(t * 14 + Math.PI) * 0.12
      if (bones.head) bones.head.rotation.x += 0.12 + Math.sin(t * 2.5) * 0.04
    } else if (settled && !task) {
      g.position.y = y + Math.sin(t * 1.6) * 0.006 // breathing
    }
  })

  const progress = task?.progress ?? 0

  return (
    <group ref={root} scale={CHARACTER_SCALE}>
      <primitive object={gltf.scene} />
      {task && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.28, 0.32, 48, 1, 0, Math.max(0.001, progress * Math.PI * 2)]} />
          <meshBasicMaterial color="#e9b872" transparent opacity={0.85} />
        </mesh>
      )}
      {pose.icon && (
        <Html position={[0, 1.05, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="v2-scene-icon">{pose.icon}</div>
        </Html>
      )}
    </group>
  )
}

useGLTF.preload(CHARACTER_URL)

/** Laptop screen light that brightens while the founder types (spec §6.3). */
export function LaptopGlow() {
  const task = useV2(s => s.v2.founder.task)
  const typing = founderPose(task).typing
  const light = useRef<import('three').PointLight>(null)
  useFrame((_, delta) => {
    if (!light.current) return
    const goal = typing ? 1.6 : 0.25
    light.current.intensity += (goal - light.current.intensity) * Math.min(1, delta * 4)
  })
  return <pointLight ref={light} position={[1.47, 0.52, -3.55]} intensity={0.25} distance={1.4} decay={2} color="#bfe0ff" />
}
```

- [ ] **Step 2: Add the icon style to `src/v2/v2.css`**

Append:
```css
.v2-scene-icon { font-size: 22px; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.35)); animation: v2-float 2.4s ease-in-out infinite; }
@keyframes v2-float { 0%, 100% { transform: translateY(0); opacity: 0.85; } 50% { transform: translateY(-8px); opacity: 1; } }
```

- [ ] **Step 3: Mount the founder and audio in `src/v2/GameScreenV2.tsx`**

Add imports:
```tsx
import { useBackgroundMusic, useTypingLoop } from './audio'
import { Founder, LaptopGlow } from './scene/Founder'
import { founderPose } from './scene/founderPose'
```
Inside `GameScreenV2`, after the existing selectors, add:
```tsx
  useBackgroundMusic()
  useTypingLoop(founderPose(v2.founder.task).typing && phase === 'playing' && gameSpeed > 0)
```
Replace `<RoomView />` with:
```tsx
          <RoomView><Founder /><LaptopGlow /></RoomView>
```

- [ ] **Step 4: Gates**

Run: `npx tsc --noEmit -p . && npm test && npm run build`
Expected: all green.

- [ ] **Step 5: Screenshot, look, tune**

Run: `node scripts/v2-screenshot.mjs` with the dev server running. Read the six PNGs.
Acceptance:
- **Idle:** the founder is sitting on the bed.
- **Research:** the founder is standing at the bookcase, facing it, with a partial progress ring.
- **Develop:** the founder is seated on the desk chair facing the desk, not sunk into or floating above the seat.
- **Scale:** the character reads as person-sized against the bed and desk.
- **Laptop:** the screen area is visibly brighter in the develop shot than in idle.
- **Console:** no errors.

Tune only `CHARACTER_SCALE`, `SPOTS` positions/yaw/seat heights (then re-run the layout test), and the typing-bob amplitudes. Also run with the dev 10× speed (`window.__v2` + UI) and confirm the walk still looks natural.

- [ ] **Step 6: Legacy guard + manual audio check**

Run: `git diff main --stat -- . ':!src/v2' ':!docs' ':!scripts' ':!public/assets/v2'`
Expected: only `package.json`, `package-lock.json`, and the Phase 1 lines (`src/router.tsx`, `vitest.config.ts`).

Manual (browser, or note it's unverified): music starts after the first click at `/new` and stops when navigating to `/`. Returning to `/new` doesn't double the music.

- [ ] **Step 7: Commit**

```bash
git add src/v2/scene/Founder.tsx src/v2/v2.css src/v2/GameScreenV2.tsx src/v2/scene/layout.ts
git commit -m "Add the animated founder to the v2 Home room with music and typing audio"
```
