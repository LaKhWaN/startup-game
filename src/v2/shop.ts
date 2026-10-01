import { addStory, type LocationId, type V2GameState } from './state'

/** Spec §6. */
export type PerkId = 'coffee' | 'plants' | 'decor' | 'sofa' | 'games' | 'tableTennis'

export interface PerkDef {
  id: PerkId
  icon: string
  name: string
  price: number
  blurb: string
}

export const PERKS: PerkDef[] = [
  { id: 'coffee', icon: '☕', name: 'Coffee machine', price: 400, blurb: 'Busy hours drain 20% less energy' },
  { id: 'plants', icon: '🪴', name: 'Plants', price: 120, blurb: 'A little greener, a little happier (+3 morale)' },
  { id: 'decor', icon: '🖼️', name: 'Decor', price: 200, blurb: '+2 morale, slightly calmer workdays' },
  { id: 'sofa', icon: '🛋️', name: 'Sofa', price: 700, blurb: '+12 energy overnight (power naps count)' },
  { id: 'games', icon: '🎮', name: 'Game corner', price: 1500, blurb: 'Idle time relieves stress twice as fast, +4 morale' },
  { id: 'tableTennis', icon: '🏓', name: 'Table tennis', price: 1800, blurb: 'Calmer workdays (−0.3 stress/h), +5 morale' },
]

export const PERK_SLOTS: Record<LocationId, number> = {
  home: 1, biggerHome: 2, villa: 3, coworking: 3, smallOffice: 4, bigOffice: 5, building: 6,
}

export const perkDef = (id: PerkId): PerkDef => PERKS.find(p => p.id === id)!

/** Owned perks beyond the location's slots stay in storage. */
export function activePerks(s: Pick<V2GameState, 'v2'>): PerkId[] {
  return (s.v2.perks ?? []).slice(0, PERK_SLOTS[s.v2.location])
}

export interface PerkEffects {
  /** Multiplier on energy drained per busy work hour. */
  energyDrain: number
  /** Added to every hire's morale target. */
  moraleBonus: number
  /** Multiplier on stress relief during idle work hours. */
  idleStressRelief: number
  /** Extra energy restored overnight. */
  overnightEnergy: number
  /** Stress removed every work hour. */
  workStressRelief: number
}

export function perkEffects(s: Pick<V2GameState, 'v2'>): PerkEffects {
  const on = new Set(activePerks(s))
  return {
    energyDrain: on.has('coffee') ? 0.8 : 1,
    moraleBonus: (on.has('plants') ? 3 : 0) + (on.has('decor') ? 2 : 0) + (on.has('games') ? 4 : 0) + (on.has('tableTennis') ? 5 : 0),
    idleStressRelief: on.has('games') ? 2 : 1,
    overnightEnergy: on.has('sofa') ? 12 : 0,
    workStressRelief: (on.has('decor') ? 0.1 : 0) + (on.has('tableTennis') ? 0.3 : 0),
  }
}

export type PerkCheck = 'ok' | 'owned' | 'full' | 'cash'

export function canBuyPerk(s: V2GameState, id: PerkId): PerkCheck {
  if ((s.v2.perks ?? []).includes(id)) return 'owned'
  if (activePerks(s).length >= PERK_SLOTS[s.v2.location]) return 'full'
  if (s.cash < perkDef(id).price) return 'cash'
  return 'ok'
}

export function buyPerk(s: V2GameState, id: PerkId): V2GameState {
  if (canBuyPerk(s, id) !== 'ok') return s
  const p = perkDef(id)
  const next: V2GameState = { ...s, cash: s.cash - p.price, v2: { ...s.v2, perks: [...(s.v2.perks ?? []), id] } }
  return addStory(next, [`${p.icon} Bought ${p.name.toLowerCase()} for $${p.price.toLocaleString()}.`])
}

// ── Setups ──────────────────────────────────────────────────────────────────

export interface SetupDef {
  tier: 1 | 2 | 3 | 4
  name: string
  specs: string
  price: number
  speed: number
  mistakes: number
}

export const SETUPS: SetupDef[] = [
  { tier: 1, name: 'Old laptop', specs: 'Windows XP · 2 GB RAM · 500 GB HDD', price: 0, speed: 0.85, mistakes: 1.2 },
  { tier: 2, name: 'Office laptop', specs: '8 GB RAM · SSD', price: 800, speed: 1, mistakes: 1 },
  { tier: 3, name: 'Dev workstation', specs: '16 GB RAM · SSD · second monitor', price: 2000, speed: 1.15, mistakes: 0.9 },
  { tier: 4, name: 'MacBook Pro', specs: 'Apple silicon · 32 GB · Retina', price: 3500, speed: 1.3, mistakes: 0.8 },
]

/** A desk: the founder's, or a hire seat index. */
export type Desk = 'founder' | number

function tierAt(s: Pick<V2GameState, 'v2'>, desk: Desk): number {
  const setups = s.v2.setups ?? { founder: 1, seats: [] }
  return desk === 'founder' ? setups.founder : setups.seats[desk] ?? 1
}

export function setupOf(s: Pick<V2GameState, 'v2'>, desk: Desk): SetupDef {
  return SETUPS[Math.min(SETUPS.length, Math.max(1, tierAt(s, desk))) - 1]
}

/** Work-speed multiplier from a desk's computer. */
export function deskSpeed(s: Pick<V2GameState, 'v2'>, desk: Desk): number {
  return setupOf(s, desk).speed
}

/** Mistake multiplier from a desk's computer. */
export function deskMistakes(s: Pick<V2GameState, 'v2'>, desk: Desk): number {
  return setupOf(s, desk).mistakes
}

export type SetupCheck = 'ok' | 'max' | 'cash'

export function nextSetup(s: Pick<V2GameState, 'v2'>, desk: Desk): SetupDef | null {
  return SETUPS[tierAt(s, desk)] ?? null
}

export function canUpgradeSetup(s: V2GameState, desk: Desk): SetupCheck {
  const next = nextSetup(s, desk)
  if (!next) return 'max'
  if (s.cash < next.price) return 'cash'
  return 'ok'
}

export function upgradeSetup(s: V2GameState, desk: Desk): V2GameState {
  if (canUpgradeSetup(s, desk) !== 'ok') return s
  const next = nextSetup(s, desk)!
  const setups = s.v2.setups ?? { founder: 1, seats: [] }
  const seats = [...setups.seats]
  if (desk !== 'founder') { while (seats.length <= desk) seats.push(1); seats[desk] = next.tier }
  const updated = desk === 'founder' ? { ...setups, founder: next.tier } : { ...setups, seats }
  const who = desk === 'founder' ? 'your desk' : `desk ${desk + 1}`
  return addStory({ ...s, cash: s.cash - next.price, v2: { ...s.v2, setups: updated } }, [`💻 Upgraded ${who} to a ${next.name} ($${next.price.toLocaleString()}).`])
}
