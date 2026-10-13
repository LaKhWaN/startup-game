import { monthlyBurn } from './engine/money'
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
  { id: 'biggerHome', name: 'Bigger home', icon: '🏠', capacity: 4, rent: 500, moveIn: 1_200, unlockMrr: 1_500 },
  { id: 'villa', name: 'Villa', icon: '🏡', capacity: 6, rent: 1_500, moveIn: 4_000, unlockMrr: 4_000 },
  { id: 'coworking', name: 'Co-working space', icon: '☕', capacity: 10, rent: 3_500, moveIn: 7_000, unlockMrr: 8_000 },
  { id: 'smallOffice', name: 'Small office', icon: '🏢', capacity: 16, rent: 8_000, moveIn: 18_000, unlockMrr: 18_000 },
  { id: 'bigOffice', name: 'Big office', icon: '🏬', capacity: 28, rent: 16_000, moveIn: 45_000, unlockMrr: 40_000 },
  { id: 'building', name: 'Your own building', icon: '🏙️', capacity: 50, rent: 32_000, moveIn: 100_000, unlockMrr: 90_000 },
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
  // Computers travel with their people (setups are stored per seat).
  const oldSeats = state.v2.setups?.seats ?? []
  const setups = state.v2.setups ? { ...state.v2.setups, seats: ordered.map(m => oldSeats[m.seat] ?? 1) } : state.v2.setups
  const next: V2GameState = {
    ...state,
    cash: state.cash - def.moveIn,
    infraCostMonthly: def.rent,
    v2: { ...state.v2, location: id, team, setups },
  }
  const cost = def.moveIn > 0 ? ` Move-in cost $${def.moveIn.toLocaleString()}, rent $${def.rent.toLocaleString()}/mo.` : ''
  return addStory(next, [`${def.icon} ${state.startupName} moved to: ${def.name}.${cost}`])
}

/** Cash left after moving in, and a month of costs at the new place (rent swapped in). */
export function moveCushion(state: V2GameState, id: LocationId): { cashAfter: number; monthCost: number; risky: boolean } {
  const def = locationDef(id)
  const cashAfter = state.cash - def.moveIn
  const monthCost = monthlyBurn(state) - state.infraCostMonthly + def.rent
  // Less than one month of costs in the bank: one bad month and you're out.
  return { cashAfter, monthCost, risky: cashAfter < monthCost }
}

/** The next rung up from where you are, or null at the top. */
export function nextLocation(state: Pick<V2GameState, 'v2'>): LocationDef | null {
  return LOCATIONS[locationIndex(state.v2.location) + 1] ?? null
}
