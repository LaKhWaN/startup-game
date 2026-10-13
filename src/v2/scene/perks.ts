import type { FurnitureModel } from './assets'
import type { Placement } from './layout'
import type { PerkId } from '../shop'

/** Every perk fits in a 1.0 × 0.45 cell; the spot is the cell's front-left corner (x, z). */
export const PERK_CELL: [number, number] = [1.0, 0.45]

type Piece = { model: FurnitureModel; dx: number; y: number; dz: number; size: [number, number]; origin?: [number, number] }

const PIECES: Record<PerkId, Piece[]> = {
  coffee: [
    { model: 'kitchenCabinet', dx: 0, y: 0, dz: 0, size: [0.43, 0.45] },
    { model: 'kitchenCoffeeMachine', dx: 0.1, y: 0.45, dz: -0.15, size: [0.19, 0.24] },
  ],
  plants: [
    { model: 'pottedPlant', dx: 0.05, y: 0, dz: -0.08, size: [0.255, 0.291] },
    { model: 'pottedPlant', dx: 0.55, y: 0, dz: -0.08, size: [0.255, 0.291] },
  ],
  decor: [
    { model: 'bookcaseClosed', dx: 0, y: 0, dz: -0.1, size: [0.4, 0.25] },
    { model: 'plantSmall2', dx: 0.2, y: 0.85, dz: -0.22, size: [0.095, 0.095], origin: [-0.047, 0.047] },
    { model: 'pottedPlant', dx: 0.6, y: 0, dz: -0.08, size: [0.255, 0.291] },
  ],
  sofa: [{ model: 'loungeSofa', dx: 0, y: 0, dz: 0, size: [0.98, 0.41] }],
  games: [
    { model: 'cabinetTelevision', dx: 0.1, y: 0, dz: -0.1, size: [0.8, 0.25] },
    { model: 'televisionModern', dx: 0.5, y: 0.31, dz: -0.23, size: [0.685, 0.128], origin: [-0.342, 0.064] },
  ],
  tableTennis: [{ model: 'table', dx: 0.07, y: 0, dz: 0, size: [0.841, 0.447] }],
}

export function perkPlacements(id: PerkId, spot: [number, number]): Placement[] {
  return PIECES[id].map(p => ({
    model: p.model,
    position: [spot[0] + p.dx, p.y, spot[1] + p.dz] as [number, number, number],
    rotationY: 0 as const,
    size: p.size,
    ...(p.origin ? { origin: p.origin } : {}),
  }))
}
