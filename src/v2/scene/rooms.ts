import { locationDef } from '../locations'
import type { LocationId } from '../state'
import type { FurnitureModel } from './assets'
import { AMENITY_STRIP, THEMES, type Theme } from './themes'
import { PERK_SLOTS } from '../shop'
import {
  FLOOR, FURNITURE, HIRE_SPOTS, SEAT_FURNITURE, SPOTS, WALLS,
  type HireSpots, type Placement, type Spot, type SpotId,
} from './layout'

export interface Seat {
  furniture: Placement[]
  spots: HireSpots
}

/** Everything the scene needs to draw one location. Floor spans x ∈ [0, width], z ∈ [−depth, 0]. */
export interface RoomLayout {
  width: number
  depth: number
  floor: Placement[]
  walls: Placement[]
  furniture: Placement[]
  /** The founder's spots. 'bed' is wherever the founder rests when idle. */
  spots: Record<SpotId, Spot>
  seats: Seat[]
  /** Where hires walk out at 17:00 and back in at 09:00. */
  door: Spot
  /** One spot per perk slot (front-left corner of a 1.0 × 0.45 cell, see scene/perks). */
  perkSpots: [number, number][]
  /** Desk corners for monitors on tier-3+ setups: the founder's and each seat's (null = no desk). */
  deskPivots: { founder: [number, number]; seats: ([number, number] | null)[] }
  /** Where the founder's laptop glows. */
  laptopGlow: [number, number, number]
  /** Floor lamp light, if the room has one. */
  lamp?: [number, number, number]
  /** The bedroom's hand-placed wall picture. */
  pictureFrame?: boolean
  theme: Theme
  /** Draw workstations nobody sits at yet (offices show their capacity; the bedroom doesn't). */
  showEmptySeats: boolean
  /** Generated rooms: the x-range on the right that holds the theme's amenities. */
  amenityStrip?: { x0: number; x1: number }
}

const HOME: RoomLayout = {
  width: 4,
  depth: 4,
  floor: FLOOR,
  walls: WALLS,
  furniture: FURNITURE,
  spots: SPOTS,
  seats: SEAT_FURNITURE.map((furniture, i) => ({ furniture, spots: HIRE_SPOTS[i] })),
  door: { position: [3.7, 0, -0.3], yaw: Math.PI / 2 },
  perkSpots: [[2.98, -0.76]],
  deskPivots: { founder: [1.13, -3.42], seats: [null, [2.2, -3.42]] },
  laptopGlow: [1.47, 0.52, -3.55],
  lamp: [0.33, 0.95, -3.52],
  pictureFrame: true,
  theme: THEMES.home,
  showEmptySeats: false,
}

// ── Generated rooms ─────────────────────────────────────────────────────────
// A founder corner on the left (desk, bookcase, lounge chair, a pace lane), then
// the hires' desks grouped the way that space works (islands, benches, pods),
// aisles with plants between groups, and a walkway along the front for sales calls.

const FOUNDER_ZONE = 1.6
const STRIP_GAP = 0.1
const RIGHT_MARGIN = 0.3
const BACK_GAP = 0.05
const FRONT_LANE = 0.9
const INSET = 0.13

const DESK: [number, number] = [0.734, 0.556]
const CHAIR: [number, number] = [0.479, 0.443]
const LAPTOP: [number, number] = [0.6, 0.546]
const PLANT: [number, number] = [0.255, 0.291]
const RUG: [number, number] = [1.57, 0.92]

/** How a space groups its desks. */
export interface RoomStyle {
  /** Desks per group: side by side × front to back. */
  pod: { cols: number; rows: number }
  /** Desk pitch inside a group. */
  cellW: number
  cellD: number
  /** Gaps between groups, side to side and front to back. */
  aisle: number
  rowGap: number
  /** Group columns per group row; more = wider, shallower room. */
  podCols: (pods: number) => number
  /** A plant at the back of each aisle. */
  aislePlants: boolean
  /** A rug under each group (homes). */
  rugs: boolean
  /** Every n-th back-wall panel is a window. */
  windowEvery: number
}

export const ROOM_STYLES: Record<Exclude<LocationId, 'home'>, RoomStyle> = {
  // Two desks side by side, two little corners of a house.
  biggerHome: { pod: { cols: 2, rows: 1 }, cellW: 1.05, cellD: 1.5, aisle: 0.9, rowGap: 0.6, podCols: () => 2, aislePlants: true, rugs: true, windowEvery: 2 },
  // Every desk its own island with a rug and room to breathe.
  villa: { pod: { cols: 1, rows: 1 }, cellW: 1, cellD: 1.5, aisle: 0.8, rowGap: 0.7, podCols: () => 3, aislePlants: true, rugs: true, windowEvery: 2 },
  // Long shared benches.
  coworking: { pod: { cols: 3, rows: 1 }, cellW: 0.82, cellD: 1.5, aisle: 1.0, rowGap: 0.6, podCols: () => 2, aislePlants: true, rugs: false, windowEvery: 3 },
  // Pods of four, two by two.
  smallOffice: { pod: { cols: 2, rows: 2 }, cellW: 0.9, cellD: 1.45, aisle: 0.9, rowGap: 0.7, podCols: n => Math.min(n, 2), aislePlants: true, rugs: false, windowEvery: 2 },
  // Rows of four with wide aisles.
  bigOffice: { pod: { cols: 4, rows: 1 }, cellW: 0.85, cellD: 1.45, aisle: 1.0, rowGap: 0.55, podCols: () => 2, aislePlants: true, rugs: false, windowEvery: 2 },
  // Team pods of six spread across the floor.
  building: { pod: { cols: 3, rows: 2 }, cellW: 0.92, cellD: 1.5, aisle: 1.1, rowGap: 0.8, podCols: n => Math.ceil(Math.sqrt(n * 1.2)), aislePlants: true, rugs: false, windowEvery: 1 },
}

const place = (model: FurnitureModel, x: number, y: number, z: number, size: [number, number], extra: Partial<Placement> = {}): Placement =>
  ({ model, position: [x, y, z], rotationY: 0, size, ...extra })

/** Desk, laptop and chair with the same offsets as the bedroom desk (known-good visually). */
function workstation(px: number, pz: number): { furniture: Placement[]; seat: Spot } {
  return {
    furniture: [
      place('desk', px, 0, pz, DESK),
      place('laptop', px + 0.17, 0.384, pz - 0.08, LAPTOP, { scale: 0.55 }),
      place('chairDesk', px + 0.2, 0, pz + 0.67, CHAIR),
    ],
    seat: { position: [px + 0.42, 0.22, pz + 0.47], yaw: Math.PI, seat: 'chairDesk' },
  }
}

function walls(width: number, depth: number, windowEvery: number): Placement[] {
  return [
    ...Array.from({ length: width }, (_, i) => ({
      // windowEvery 1 = a glass wall with solid corners.
      model: (windowEvery === 1 ? i > 0 && i < width - 1 : i % windowEvery === 1) ? 'wallWindow' as FurnitureModel : 'wall' as FurnitureModel,
      position: [i, 0, -depth] as [number, number, number],
      rotationY: 0 as const,
      size: [1, 0.05] as [number, number],
    })),
    ...Array.from({ length: depth }, (_, j) => ({
      model: (j % 3 === 1 ? 'wallWindow' : 'wall') as FurnitureModel,
      position: [0, 0, -j] as [number, number, number],
      rotationY: 90 as const,
      size: [1, 0.05] as [number, number],
    })),
  ]
}

function floor(width: number, depth: number): Placement[] {
  return Array.from({ length: width * depth }, (_, i) => ({
    model: 'floorFull' as const,
    position: [i % width, -0.05, -Math.floor(i / width)] as [number, number, number],
    rotationY: 0 as const,
    size: [1, 1] as [number, number],
  }))
}

const PERK_COL_W = 1.15
const PERK_ROW_D = 1.0

/** Desk corners for `capacity` seats, filled group by group, plus where aisle plants and rugs go. */
function deskPlan(capacity: number, st: RoomStyle) {
  const perPod = st.pod.cols * st.pod.rows
  const pods = Math.ceil(capacity / perPod)
  const podCols = Math.max(1, Math.min(pods, st.podCols(pods)))
  const podRows = Math.ceil(pods / podCols)
  const podW = st.pod.cols * st.cellW
  const podPitchX = podW + st.aisle
  const podPitchZ = st.pod.rows * st.cellD + st.rowGap
  const desks: [number, number][] = []
  for (let i = 0; i < capacity; i++) {
    const pod = Math.floor(i / perPod)
    const k = i % perPod
    const px = FOUNDER_ZONE + (pod % podCols) * podPitchX + (k % st.pod.cols) * st.cellW + INSET
    // z measured from the back wall; the caller adds `back`.
    const dz = BACK_GAP + DESK[1] + Math.floor(pod / podCols) * podPitchZ + Math.floor(k / st.pod.cols) * st.cellD
    desks.push([px, dz])
  }
  const lastDz = Math.max(...desks.map(d => d[1]))
  const usedW = podCols * podW + (podCols - 1) * st.aisle
  const plants: [number, number][] = []
  const rugs: [number, number][] = []
  for (let r = 0; r < podRows; r++) {
    const dz = BACK_GAP + DESK[1] + r * podPitchZ
    for (let c = 0; c < podCols; c++) {
      const podX = FOUNDER_ZONE + c * podPitchX
      // A rug centred under the group, from just behind the desks to past the chairs.
      const podCentre = podX + INSET + ((st.pod.cols - 1) * st.cellW + DESK[0]) / 2
      if (st.rugs && r * podCols + c < pods) rugs.push([podCentre - RUG[0] / 2, dz + 0.78])
      // Plant at the back of the aisle to the right of this group.
      if (st.aislePlants && c < podCols - 1 && (r * podCols + c + 1) < pods) {
        const deskEnd = podX + (st.pod.cols - 1) * st.cellW + INSET + DESK[0]
        const nextStart = podX + podPitchX + INSET
        plants.push([(deskEnd + nextStart) / 2 - PLANT[0] / 2, dz - 0.05])
      }
    }
  }
  return { desks, plants, rugs, usedW, lastDz }
}

export function generateRoom(capacity: number, theme: Theme, perkSlots: number, style: RoomStyle): RoomLayout {
  const plan = deskPlan(capacity, style)
  const stripX0 = FOUNDER_ZONE + plan.usedW + STRIP_GAP + 0.2
  // Perk row: two columns of perk cells to the right of the amenity strip.
  const perkX0 = stripX0 + AMENITY_STRIP + 0.15
  const width = Math.ceil(perkX0 + 2 * PERK_COL_W + RIGHT_MARGIN)
  const depth = Math.max(5, Math.ceil(plan.lastDz + 0.67 + FRONT_LANE))
  const back = -depth

  // Founder corner
  const founderDesk = workstation(0.3, back + BACK_GAP + DESK[1])
  const lounge = place('loungeChair', 0.75, 0, -0.35, [0.49, 0.41], { rotationY: 90 })
  const furniture: Placement[] = [
    ...founderDesk.furniture,
    place('bookcaseOpen', 1.1, 0, back + 0.25, [0.4, 0.25]),
    place('books', 1.15, 0.44, back + 0.18, [0.2, 0.15]),
    lounge,
    place('lampRoundFloor', 0.05, 0, back + 0.85, [0.152, 0.176]),
    place('plantSmall1', 0.47, 0.384, back + 0.2, [0.189, 0.189]),
    ...plan.plants.map(([x, dz]) => place('pottedPlant', x, 0, back + dz, PLANT)),
    ...plan.rugs.map(([x, dz]) => place('rugRectangle', x, 0.002, back + dz, RUG)),
    ...theme.amenities(stripX0, back),
  ]
  const spots: Record<SpotId, Spot> = {
    bed: { position: [0.53, 0.16, -0.6], yaw: Math.PI / 2, seat: 'loungeChair' },
    bookshelf: { position: [1.3, 0, back + 0.55], yaw: Math.PI },
    desk: founderDesk.seat,
    paceA: { position: [1.35, 0, back + 1.6], yaw: 0 },
    paceB: { position: [1.35, 0, Math.min(-1.3, back + 2.6)], yaw: Math.PI },
  }

  const seats: Seat[] = plan.desks.map(([px, dz]) => {
    const ws = workstation(px, back + dz)
    const laneX = px + 0.42
    return {
      furniture: ws.furniture,
      spots: {
        seat: ws.seat,
        paceA: { position: [laneX - 0.3, 0, -FRONT_LANE / 2], yaw: Math.PI / 2 },
        paceB: { position: [laneX + 0.3, 0, -FRONT_LANE / 2], yaw: -Math.PI / 2 },
      },
    }
  })

  return {
    width,
    depth,
    floor: floor(width, depth),
    walls: walls(width, depth, style.windowEvery),
    furniture,
    spots,
    seats,
    door: { position: [width - 0.2, 0, -0.3], yaw: Math.PI / 2 },
    perkSpots: Array.from({ length: perkSlots }, (_, i) => [perkX0 + (i % 2) * PERK_COL_W, back + 0.7 + Math.floor(i / 2) * PERK_ROW_D] as [number, number]),
    deskPivots: {
      founder: [0.3, back + BACK_GAP + DESK[1]],
      seats: plan.desks.map(([px, dz]) => [px, back + dz] as [number, number]),
    },
    laptopGlow: [0.3 + 0.34, 0.52, back + BACK_GAP + DESK[1] - 0.2],
    lamp: [0.13, 0.95, back + 0.76],
    theme,
    showEmptySeats: true,
    amenityStrip: { x0: stripX0, x1: stripX0 + AMENITY_STRIP },
  }
}

const cache = new Map<LocationId, RoomLayout>()

export function roomFor(id: LocationId): RoomLayout {
  if (id === 'home') return HOME
  let room = cache.get(id)
  if (!room) {
    room = generateRoom(locationDef(id).capacity, THEMES[id], PERK_SLOTS[id], ROOM_STYLES[id])
    cache.set(id, room)
  }
  return room
}
