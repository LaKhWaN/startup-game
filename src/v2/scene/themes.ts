import type { LocationId } from '../state'
import type { FurnitureModel } from './assets'
import type { Placement } from './layout'

/** Width of the amenity strip generated rooms add to the right of the desk grid. */
export const AMENITY_STRIP = 2

export interface Theme {
  background: string
  /** Multiplies the floor / wall material colours. '#ffffff' leaves them as modelled. */
  floorTint: string
  wallTint: string
  sun: { color: string; intensity: number }
  fill: { color: string; intensity: number }
  hemi: { sky: string; ground: string; intensity: number }
  /** Furniture for the amenity strip: `sx` = strip's left x, `back` = the back wall's z. */
  amenities: (sx: number, back: number) => Placement[]
}

type P = Omit<Placement, 'rotationY'> & { rotationY?: Placement['rotationY'] }
const at = (p: P): Placement => ({ rotationY: 0, ...p })

// Measured bounds (size [w, d]; origin = local [min x, max z] when the pivot isn't a corner).
const M = {
  loungeSofa: { size: [0.98, 0.41] },
  loungeDesignSofa: { size: [1.12, 0.41] },
  loungeSofaCorner: { size: [0.98, 0.98] },
  tableCoffee: { size: [0.661, 0.4], origin: [-0.461, 0.1] },
  tableCoffeeGlass: { size: [0.661, 0.4], origin: [-0.461, 0.1] },
  televisionModern: { size: [0.685, 0.128], origin: [-0.342, 0.064] },
  cabinetTelevision: { size: [0.8, 0.25] },
  rugRound: { size: [0.92, 0.92] },
  rugRounded: { size: [1.57, 0.92] },
  plantSmall2: { size: [0.095, 0.095], origin: [-0.047, 0.047] },
  pottedPlant: { size: [0.255, 0.291] },
  kitchenBar: { size: [0.43, 0.21] },
  kitchenCoffeeMachine: { size: [0.19, 0.24] },
  stoolBar: { size: [0.265, 0.23] },
  kitchenFridge: { size: [0.43, 0.292], origin: [0, 0.01] },
  coatRackStanding: { size: [0.273, 0.273], origin: [-0.136, 0.136] },
  bookcaseClosed: { size: [0.4, 0.25] },
  kitchenCabinet: { size: [0.43, 0.45] },
  trashcan: { size: [0.208, 0.234], origin: [-0.104, 0.122] },
  speaker: { size: [0.148, 0.148] },
} as const satisfies Partial<Record<FurnitureModel, { size: readonly [number, number]; origin?: readonly [number, number] }>>

type Measured = keyof typeof M

function item(model: Measured, x: number, y: number, z: number, rotationY: Placement['rotationY'] = 0): Placement {
  const m = M[model] as { size: readonly [number, number]; origin?: readonly [number, number] }
  return at({
    model,
    position: [x, y, z],
    rotationY,
    size: [m.size[0], m.size[1]],
    ...(m.origin ? { origin: [m.origin[0], m.origin[1]] as [number, number] } : {}),
  })
}

const tvCorner = (sx: number, back: number): Placement[] => [
  item('cabinetTelevision', sx + 0.6, 0, back + 0.25),
  item('televisionModern', sx + 1.0, 0.31, back + 0.12),
]

const BEDROOM_LIGHTS = {
  sun: { color: '#ffd9a8', intensity: 2.2 },
  fill: { color: '#ffe2c2', intensity: 0.55 },
  hemi: { sky: '#ffe9cc', ground: '#4a3a2c', intensity: 0.9 },
}

export const THEMES: Record<LocationId, Theme> = {
  home: {
    background: '#2b2119', floorTint: '#ffffff', wallTint: '#ffffff', ...BEDROOM_LIGHTS,
    amenities: () => [],
  },
  biggerHome: {
    background: '#2b2119', floorTint: '#f3dcc0', wallTint: '#fff4e2', ...BEDROOM_LIGHTS,
    amenities: (sx, back) => [
      ...tvCorner(sx, back),
      item('pottedPlant', sx + 1.6, 0, back + 0.3),
      item('rugRound', sx + 0.55, 0.002, back + 2.0),
      item('tableCoffee', sx + 1.25, 0, back + 1.6),
      item('loungeSofa', sx + 1.49, 0, back + 2.3, 180),
    ],
  },
  villa: {
    background: '#1f2a22', floorTint: '#fff1dc', wallTint: '#ffffff',
    sun: { color: '#fff0c8', intensity: 2.6 }, fill: { color: '#fff4e0', intensity: 0.7 },
    hemi: { sky: '#fff6dd', ground: '#4a4a3a', intensity: 1.0 },
    amenities: (sx, back) => [
      item('pottedPlant', sx + 0.15, 0, back + 0.35),
      item('pottedPlant', sx + 1.6, 0, back + 0.35),
      item('rugRounded', sx + 0.2, 0.002, back + 2.05),
      item('tableCoffeeGlass', sx + 1.3, 0, back + 1.6),
      item('plantSmall2', sx + 1.0, 0.23, back + 1.42),
      item('loungeDesignSofa', sx + 1.62, 0, back + 2.25, 180),
      item('pottedPlant', sx + 1.6, 0, back + 3.3),
    ],
  },
  coworking: {
    background: '#22262b', floorTint: '#cfcac4', wallTint: '#e8eaec',
    sun: { color: '#fff1e0', intensity: 2.0 }, fill: { color: '#eef2f6', intensity: 0.65 },
    hemi: { sky: '#f2f0ec', ground: '#3a3d42', intensity: 0.95 },
    amenities: (sx, back) => [
      item('kitchenCabinet', sx + 0.2, 0, back + 0.45),
      item('kitchenCabinet', sx + 0.63, 0, back + 0.45),
      item('kitchenCoffeeMachine', sx + 0.3, 0.45, back + 0.3),
      item('kitchenFridge', sx + 1.1, 0, back + 0.3),
      item('pottedPlant', sx + 1.6, 0, back + 0.35),
      item('kitchenBar', sx + 0.3, 0, back + 1.6),
      item('kitchenBar', sx + 0.73, 0, back + 1.6),
      item('stoolBar', sx + 0.38, 0, back + 2.0),
      item('stoolBar', sx + 0.81, 0, back + 2.0),
      item('coatRackStanding', sx + 1.7, 0, back + 3.0),
    ],
  },
  smallOffice: {
    background: '#1e2430', floorTint: '#dcdcdc', wallTint: '#dfe8f3',
    sun: { color: '#f4f6ff', intensity: 2.0 }, fill: { color: '#e6eeff', intensity: 0.7 },
    hemi: { sky: '#eef3ff', ground: '#363b46', intensity: 1.0 },
    amenities: (sx, back) => [
      item('bookcaseClosed', sx + 0.2, 0, back + 0.25),
      item('bookcaseClosed', sx + 0.6, 0, back + 0.25),
      item('kitchenCabinet', sx + 1.15, 0, back + 0.45),
      item('kitchenCoffeeMachine', sx + 1.25, 0.45, back + 0.3),
      item('pottedPlant', sx + 1.65, 0, back + 0.35),
      item('trashcan', sx + 1.0, 0, back + 1.4),
      item('loungeSofa', sx + 1.5, 0, back + 2.3, 180),
      item('pottedPlant', sx + 0.15, 0, back + 2.6),
    ],
  },
  bigOffice: {
    background: '#1b1f27', floorTint: '#b99a7c', wallTint: '#f4f4f4',
    sun: { color: '#f1f4ff', intensity: 2.1 }, fill: { color: '#e4ebff', intensity: 0.7 },
    hemi: { sky: '#eef2ff', ground: '#30343c', intensity: 1.0 },
    amenities: (sx, back) => [
      ...tvCorner(sx, back),
      item('kitchenFridge', sx + 1.5, 0, back + 0.3),
      item('pottedPlant', sx + 0.15, 0, back + 0.35),
      item('loungeSofaCorner', sx + 0.2, 0, back + 2.6),
      item('tableCoffee', sx + 1.75, 0, back + 2.3),
      item('pottedPlant', sx + 1.6, 0, back + 3.6),
      item('kitchenCabinet', sx + 0.2, 0, back + 4.4),
      item('kitchenCoffeeMachine', sx + 0.3, 0.45, back + 4.25),
    ],
  },
  building: {
    background: '#15171c', floorTint: '#8f949c', wallTint: '#fbf6ee',
    sun: { color: '#fff4e4', intensity: 2.3 }, fill: { color: '#eef0ff', intensity: 0.75 },
    hemi: { sky: '#f6f2ea', ground: '#2a2c31', intensity: 1.0 },
    amenities: (sx, back) => [
      item('speaker', sx + 0.35, 0, back + 0.2),
      ...tvCorner(sx, back),
      item('speaker', sx + 1.5, 0, back + 0.2),
      item('rugRounded', sx + 0.2, 0.002, back + 2.05),
      item('tableCoffeeGlass', sx + 1.3, 0, back + 1.6),
      item('loungeDesignSofa', sx + 1.62, 0, back + 2.25, 180),
      item('pottedPlant', sx + 0.15, 0, back + 3.4),
      item('pottedPlant', sx + 1.6, 0, back + 3.4),
      item('loungeDesignSofa', sx + 0.4, 0, back + 4.6),
      item('pottedPlant', sx + 1.7, 0, back + 4.4),
    ],
  },
}
