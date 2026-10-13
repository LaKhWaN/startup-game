import type { Placement } from './layout'

/** Instance positions for the floor tiles (all tiles share one model, rotation and scale). */
export function floorInstances(floor: Placement[]): [number, number, number][] {
  return floor.map(p => p.position)
}
