import { beforeEach, describe, expect, it } from 'vitest'
import { EVENTS } from '../../data/events'
import { EVENT_MIN_STAGE, filterPendingEvent, isScaled, PAYOUT_MONTHS } from '../eventsV2'
import { loadGameV2, saveGameV2 } from '../saveV2'
import { createV2Slice, migrateV2Slice, type LocationId, type V2GameState } from '../state'
import { makeState, seq, withV2 } from './fixtures'

const ev = (id: string) => EVENTS.find(e => e.id === id)!
const at = (location: LocationId, over: Partial<V2GameState> = {}) =>
  withV2(makeState({ cash: 2000, infraCostMonthly: 900, ...over }), { location })

describe('payout events sized for v2', () => {
  it('gates seed/angel to the Villa and Series A to the Small office', () => {
    expect(EVENT_MIN_STAGE['investor-seed']).toBe(2)
    expect(EVENT_MIN_STAGE['angel-meeting']).toBe(2)
    expect(EVENT_MIN_STAGE['investor-series-a']).toBe(4)
    expect(filterPendingEvent(at('biggerHome', { pendingEvent: ev('investor-seed') }), seq(0)).pendingEvent).toBeNull()
  })

  it('caps a payout at burn × PAYOUT_MONTHS (min $5k)', () => {
    const s = at('villa', { pendingEvent: ev('investor-seed') })
    const kept = filterPendingEvent(s, seq(0))
    expect(isScaled(kept.pendingEvent!)).toBe(true)
    const out = kept.pendingEvent!.choices[0].effect(kept)
    expect(out.cash! - s.cash).toBe(900 * PAYOUT_MONTHS['investor-seed'])
  })

  it('rewrites the angel headline amount to the capped one', () => {
    const kept = filterPendingEvent(at('villa', { pendingEvent: ev('angel-meeting'), infraCostMonthly: 2000 }), seq(0))
    expect(kept.pendingEvent!.description).toMatch(/\$12k/) // 2,000 × 6
  })
})

describe('loading a save with a pending event', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, String(v)) },
      removeItem: (k: string) => { store.delete(k) }, clear: () => store.clear(),
      key: (i: number) => [...store.keys()][i] ?? null, get length() { return store.size },
    } as Storage
  })

  it('comes back already scaled (no full legacy cost in the first second)', () => {
    const s = at('home', { pendingEvent: ev('aws-spike'), infraCostMonthly: 0 })
    saveGameV2(2, s)
    const loaded = loadGameV2(2)!
    expect(isScaled(loaded.pendingEvent!)).toBe(true)
    expect(loaded.pendingEvent!.description).toMatch(/\$250 due now/)
  })
})

describe('migrating a Phase 3 save past Chapter 2', () => {
  it('credits the $1,000 peak so the first move is open even if MRR dipped', () => {
    const { location: _l, unlockedLocations: _u, peakMrr: _p, chapter3: _c, ...phase3 } = createV2Slice()
    const v = migrateV2Slice({ ...phase3, chapter2: { beat: 2, complete: true, firstMistake: false } })!
    expect(v.peakMrr).toBe(1000)
    expect(v.unlockedLocations).toEqual(['home', 'biggerHome'])
  })
})

describe('a hire a legacy event removed', () => {
  it('is dropped before the team works that hour', async () => {
    const { v2Tick } = await import('../v2Tick')
    const { hireIntern } = await import('../team')
    const { withChapter } = await import('./fixtures')
    let s = withChapter(makeState({ cash: 5000 }), { beat: 5, complete: true })
    s = withV2(s, { candidates: [{ id: 'c1', name: 'Sam', gender: 'male', role: 'marketing', tier: 'intern', skills: { research: 1, build: 1, outreach: 3, sales: 1 }, salary: 700, bio: '', characterModel: 'character-male-c' }] })
    s = hireIntern(s, 'c1')
    s = withV2(s, { leads: 0, team: { c1: { ...s.v2.team.c1, task: { type: 'emails', progress: 0.9999 } } } })
    const out = v2Tick({ ...s, employees: [] }, 1, seq(0.99))
    expect(out.v2.team.c1).toBeUndefined()
    expect(out.v2.leads).toBe(0)
  })
})
