import { locationDef } from '../locations'
import type { LocationId } from '../state'
import type { FurnitureModel } from './assets'
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
  /** Where the founder's laptop glows. */
  laptopGlow: [number, number, number]
  /** Floor lamp light, if the room has one. */
  lamp?: [number, number, number]
  /** The bedroom's hand-placed wall picture. */
  pictureFrame?: boolean
}

const HOME: RoomLayout = {
  width: 4,
  depth: 4,
  floor: FLOOR,
  walls: WALLS,
  furniture: FURNITURE,
  spots: SPOTS,
  seats: SEAT_FURNITURE.map((furniture, i) => ({ furniture, spots: HIRE_SPOTS[i] })),
  laptopGlow: [1.47, 0.52, -3.55],
  lamp: [0.33, 0.95, -3.52],
  pictureFrame: true,
}

// ── Generated rooms ─────────────────────────────────────────────────────────
// A founder corner on the left (desk, bookcase, lounge chair, a pace lane),
// then a grid of desks, with a walkway along the front for sales calls.

const FOUNDER_ZONE = 1.6
const RIGHT_MARGIN = 0.6
const BACK_GAP = 0.05
const CELL_W = 1.0
const CELL_D = 1.4
const FRONT_LANE = 0.9

const DESK: [number, number] = [0.734, 0.556]
const CHAIR: [number, number] = [0.479, 0.443]
const LAPTOP: [number, number] = [0.6, 0.546]

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

function gridSize(capacity: number): { cols: number; rows: number } {
  const cols = Math.max(2, Math.ceil(Math.sqrt(capacity * 1.4)))
  return { cols, rows: Math.ceil(capacity / cols) }
}

function walls(width: number, depth: number): Placement[] {
  return [
    ...Array.from({ length: width }, (_, i) => ({
      model: (i % 2 === 1 ? 'wallWindow' : 'wall') as FurnitureModel,
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

export function generateRoom(capacity: number): RoomLayout {
  const { cols, rows } = gridSize(capacity)
  const width = Math.ceil(FOUNDER_ZONE + cols * CELL_W + RIGHT_MARGIN)
  const depth = Math.max(4, Math.ceil(BACK_GAP + DESK[1] + (rows - 1) * CELL_D + 0.67 + FRONT_LANE))
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
    place('pottedPlant', width - 0.35, 0, back + 0.32, [0.255, 0.291]),
    place('plantSmall1', 0.47, 0.384, back + 0.2, [0.189, 0.189]),
  ]
  const spots: Record<SpotId, Spot> = {
    bed: { position: [0.53, 0.16, -0.6], yaw: Math.PI / 2, seat: 'loungeChair' },
    bookshelf: { position: [1.3, 0, back + 0.55], yaw: Math.PI },
    desk: founderDesk.seat,
    paceA: { position: [1.35, 0, back + 1.6], yaw: 0 },
    paceB: { position: [1.35, 0, Math.min(-1.3, back + 2.6)], yaw: Math.PI },
  }

  const seats: Seat[] = Array.from({ length: capacity }, (_, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const px = FOUNDER_ZONE + col * CELL_W + 0.13
    const pz = back + BACK_GAP + DESK[1] + row * CELL_D
    const ws = workstation(px, pz)
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
    walls: walls(width, depth),
    furniture,
    spots,
    seats,
    laptopGlow: [0.3 + 0.34, 0.52, back + BACK_GAP + DESK[1] - 0.2],
    lamp: [0.13, 0.95, back + 0.76],
  }
}

const cache = new Map<LocationId, RoomLayout>()

export function roomFor(id: LocationId): RoomLayout {
  if (id === 'home') return HOME
  let room = cache.get(id)
  if (!room) {
    room = generateRoom(locationDef(id).capacity)
    cache.set(id, room)
  }
  return room
}
