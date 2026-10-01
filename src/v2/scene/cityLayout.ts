import type { LocationId } from '../state'

/** City models, as `<kit>/<model>` under public/assets/v2/city/. */
export const CITY_MODELS = [
  'suburban/building-type-h', 'suburban/building-type-a', 'suburban/building-type-m',
  'suburban/tree-large', 'suburban/tree-small',
  'commercial/building-e', 'commercial/building-a', 'commercial/building-skyscraper-a', 'commercial/building-skyscraper-c',
  'roads/road-straight', 'roads/light-square',
] as const

export type CityModel = typeof CITY_MODELS[number]

export function cityModelUrl(m: CityModel): string {
  return `/assets/v2/city/${m}.glb`
}

/** Ground extent. The main road runs along x at z = ROAD_Z; lots sit north of it, in ladder order. */
export const CITY = { x0: -2, x1: 16, z0: -4, z1: 3 } as const
export const ROAD_Z = 0
export const ROAD_TILES = Array.from({ length: CITY.x1 - CITY.x0 }, (_, i) => CITY.x0 + 0.5 + i)

export interface Lot {
  model: CityModel
  /** Centre of the building (Kenney city pivots are centred). */
  position: [number, number, number]
  /** Measured footprint [w, d]. */
  size: [number, number]
}

const LOT_Z = -1.6
const STEP = 2.3

export const LOTS: Record<LocationId, Lot> = {
  home: { model: 'suburban/building-type-h', position: [0, 0, LOT_Z], size: [1.3, 0.92] },
  biggerHome: { model: 'suburban/building-type-a', position: [STEP, 0, LOT_Z], size: [1.3, 1.02] },
  villa: { model: 'suburban/building-type-m', position: [STEP * 2, 0, LOT_Z], size: [1.42, 1.42] },
  coworking: { model: 'commercial/building-e', position: [STEP * 3, 0, LOT_Z], size: [1.64, 1.0] },
  smallOffice: { model: 'commercial/building-a', position: [STEP * 4, 0, LOT_Z], size: [0.88, 0.94] },
  bigOffice: { model: 'commercial/building-skyscraper-a', position: [STEP * 5, 0, LOT_Z], size: [1.36, 1.36] },
  building: { model: 'commercial/building-skyscraper-c', position: [STEP * 6, 0, LOT_Z], size: [1.28, 1.38] },
}

export function lotFootprint(id: LocationId): { x0: number; x1: number; z0: number; z1: number } {
  const { position: [x, , z], size: [w, d] } = LOTS[id]
  return { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 }
}

/** Street dressing south of the road. */
export const TREES: { model: CityModel; position: [number, number, number] }[] = [
  -1, 1.2, 3.4, 5.8, 8.1, 10.4, 12.6, 14.9,
].map((x, i) => ({ model: i % 2 ? 'suburban/tree-small' : 'suburban/tree-large', position: [x, 0, 1.4] }))

export const STREET_LIGHTS: [number, number, number][] = [1.15, 5.75, 10.35, 14.95].map(x => [x, 0, 0.62])
