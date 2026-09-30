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
  position: [i % 4, -0.05, -Math.floor(i / 4)] as [number, number, number], // tile top sits at y = 0
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
  { model: 'sideTable', position: [0.3, 0, -2.1], rotationY: 90, size: [0.534, 0.22] },
  { model: 'lampSquareTable', position: [0.14, 0.384, -2.25], rotationY: 0, size: [0.12, 0.12] },
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
  bookshelf: { position: [3.2, 0, -3.4], yaw: Math.PI, seat: undefined },
  desk: { position: [1.55, 0.22, -2.95], yaw: Math.PI, seat: 'chairDesk' },
  paceA: { position: [2.6, 0, -2.6], yaw: Math.PI / 2 },
  paceB: { position: [3.5, 0, -2.0], yaw: -Math.PI / 2 },
}
