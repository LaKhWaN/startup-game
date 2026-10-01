import { addStory, type LocationId, type V2GameState } from './state'

export interface LocationDef {
  id: LocationId
  name: string
  icon: string
  /** Hires that fit (the founder always has a spot). */
  capacity: number
  rent: number
  moveIn: number
  /** Peak MRR that unlocks it. */
  unlockMrr: number
}

/** The ladder (spec §8.2). Ordered; index = company stage. */
export const LOCATIONS: LocationDef[] = [
  { id: 'home', name: 'Your bedroom', icon: '🛏️', capacity: 2, rent: 0, moveIn: 0, unlockMrr: 0 },
  { id: 'biggerHome', name: 'Bigger home', icon: '🏠', capacity: 4, rent: 300, moveIn: 800, unlockMrr: 1_000 },
  { id: 'villa', name: 'Villa', icon: '🏡', capacity: 6, rent: 900, moveIn: 2_500, unlockMrr: 2_500 },
  { id: 'coworking', name: 'Co-working space', icon: '☕', capacity: 10, rent: 2_000, moveIn: 4_000, unlockMrr: 5_000 },
  { id: 'smallOffice', name: 'Small office', icon: '🏢', capacity: 16, rent: 4_500, moveIn: 10_000, unlockMrr: 10_000 },
  { id: 'bigOffice', name: 'Big office', icon: '🏬', capacity: 28, rent: 9_000, moveIn: 25_000, unlockMrr: 25_000 },
  { id: 'building', name: 'Your own building', icon: '🏙️', capacity: 50, rent: 18_000, moveIn: 60_000, unlockMrr: 60_000 },
]

export function locationIndex(id: LocationId): number {
  return Math.max(0, LOCATIONS.findIndex(l => l.id === id))
}

export function locationDef(id: LocationId): LocationDef {
  return LOCATIONS[locationIndex(id)]
}

export function currentLocation(state: Pick<V2GameState, 'v2'>): LocationDef {
  return locationDef(state.v2.location)
}

/** Tracks peak MRR and unlocks every location it has reached. Unlocks are permanent. */
export function updateUnlocks(state: V2GameState): V2GameState {
  const peakMrr = Math.max(state.v2.peakMrr, state.mrr)
  const fresh = LOCATIONS.filter(l => l.unlockMrr <= peakMrr && !state.v2.unlockedLocations.includes(l.id))
  if (peakMrr === state.v2.peakMrr && fresh.length === 0) return state
  const unlockedLocations = LOCATIONS.filter(l => state.v2.unlockedLocations.includes(l.id) || fresh.includes(l)).map(l => l.id)
  const next: V2GameState = { ...state, v2: { ...state.v2, peakMrr, unlockedLocations } }
  return fresh.length === 0
    ? next
    : addStory(next, fresh.map(l => `${l.icon} ${l.name} is now available on the Map.`))
}

export type MoveCheck = 'ok' | 'locked' | 'current' | 'cash' | 'capacity'

export function canMove(state: V2GameState, id: LocationId): MoveCheck {
  const def = locationDef(id)
  if (state.v2.location === id) return 'current'
  if (!state.v2.unlockedLocations.includes(id)) return 'locked'
  if (Object.keys(state.v2.team).length > def.capacity) return 'capacity'
  if (state.cash < def.moveIn) return 'cash'
  return 'ok'
}

export function moveTo(state: V2GameState, id: LocationId): V2GameState {
  if (canMove(state, id) !== 'ok') return state
  const def = locationDef(id)
  const ordered = Object.values(state.v2.team).sort((a, b) => a.seat - b.seat)
  const team = Object.fromEntries(ordered.map((m, seat) => [m.id, { ...m, seat }]))
  const next: V2GameState = {
    ...state,
    cash: state.cash - def.moveIn,
    infraCostMonthly: def.rent,
    v2: { ...state.v2, location: id, team },
  }
  const cost = def.moveIn > 0 ? ` Move-in cost $${def.moveIn.toLocaleString()}, rent $${def.rent.toLocaleString()}/mo.` : ''
  return addStory(next, [`${def.icon} ${state.startupName} moved to: ${def.name}.${cost}`])
}
