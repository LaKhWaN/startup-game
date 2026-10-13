import { describe, expect, it } from 'vitest'
import { addStory, createV2State, createV2Slice, isV2Game, isValidV2Slice, migrateV2Slice, FOUNDER_START_CASH } from '../state'
import { makeConfig } from './fixtures'

describe('createV2State', () => {
  const s = createV2State(makeConfig())

  it('starts the founder alone at home with $500 and no burn', () => {
    expect(s.cash).toBe(FOUNDER_START_CASH)
    expect(s.cash).toBe(500)
    expect(s.infraCostMonthly).toBe(0)
    expect(s.v2.team).toEqual({})
    expect(s.v2.location).toBe('home')
    expect(s.phase).toBe('playing')
  })

  it('prefixes the game id with v2-', () => {
    expect(s.gameId.startsWith('v2-')).toBe(true)
  })

  it('rewrites the day-0 metrics snapshot for the solo start', () => {
    expect(s.metricsHistory).toHaveLength(1)
    expect(s.metricsHistory[0].cash).toBe(500)
    expect(s.metricsHistory[0].burn).toBe(0)
    expect(s.fullMetricsHistory[0].cash).toBe(500)
  })

  it('creates a fresh v2 slice', () => {
    expect(s.v2).toEqual(createV2Slice())
    expect(s.v2.founder.skills).toEqual({ research: 4, build: 4, outreach: 4, sales: 4 })
    expect(s.v2.chapter).toEqual({ beat: 0, complete: false, seenCards: [] })
    expect(s.v2.leads).toBe(0)
    expect(s.v2.firstSaleDone).toBe(false)
  })
})

describe('isValidV2Slice', () => {
  it('accepts a fresh slice', () => {
    expect(isValidV2Slice(createV2Slice())).toBe(true)
  })

  it('rejects junk and partial slices', () => {
    expect(isValidV2Slice(undefined)).toBe(false)
    expect(isValidV2Slice({})).toBe(false)
    const noSkills = { ...createV2Slice(), founder: { name: 'You', task: null } }
    expect(isValidV2Slice(noSkills)).toBe(false)
    const badBeat = { ...createV2Slice(), chapter: { beat: 7, complete: false, seenCards: [] } }
    expect(isValidV2Slice(badBeat)).toBe(false)
  })
})

describe('isV2Game', () => {
  it('is true for a v2 game', () => {
    expect(isV2Game(createV2State(makeConfig()))).toBe(true)
  })

  it('is false without a v2 id or slice', () => {
    expect(isV2Game({ gameId: 'game-123', v2: createV2Slice() })).toBe(false)
    expect(isV2Game({ gameId: 'v2-game-1' })).toBe(false)
  })
})

describe('addStory', () => {
  it('prepends an entry for the current day and caps the log at 20', () => {
    let s = createV2State(makeConfig())
    for (let i = 0; i < 25; i++) s = addStory(s, [`line ${i}`])
    expect(s.storyLog).toHaveLength(20)
    expect(s.storyLog[0]).toEqual({ day: 0, lines: ['line 24'] })
  })
})

describe('Phase 3 slice fields', () => {
  it('a fresh slice has an empty team, no candidates and Chapter 2 defaults', () => {
    const v2 = createV2Slice()
    expect(v2.team).toEqual({})
    expect(v2.candidates).toEqual([])
    expect(v2.chapter2).toEqual({ beat: 0, complete: false, firstMistake: false })
  })
})

describe('migrateV2Slice', () => {
  it('fills Phase 3 fields onto a Phase 1/2 slice', () => {
    const { team: _t, candidates: _c, chapter2: _ch, ...old } = createV2Slice()
    const migrated = migrateV2Slice(old)
    expect(migrated?.team).toEqual({})
    expect(migrated?.chapter2.beat).toBe(0)
  })

  it('rejects junk', () => {
    expect(migrateV2Slice({})).toBeNull()
    expect(migrateV2Slice(undefined)).toBeNull()
  })
})

describe('migrateV2Slice (Phase 4 fields)', () => {
  it('fills location fields and candidate tiers on a Phase 3 slice', () => {
    const { location: _l, unlockedLocations: _u, peakMrr: _p, chapter3: _c, ...phase3 } = createV2Slice()
    const old = { ...phase3, candidates: [{ id: 'x', name: 'X', gender: 'male', role: 'sales', skills: { research: 1, build: 1, outreach: 1, sales: 3 }, salary: 700, bio: '', characterModel: 'character-male-c' }] }
    const v = migrateV2Slice(old)!
    expect(v.location).toBe('home')
    expect(v.unlockedLocations).toEqual(['home'])
    expect(v.peakMrr).toBe(0)
    expect(v.chapter3).toEqual({ beat: 0, complete: false })
    expect(v.candidates[0].tier).toBe('intern')
  })

  it('falls back to home for an unknown location id', () => {
    const v = migrateV2Slice({ ...createV2Slice(), location: 'moon' })!
    expect(v.location).toBe('home')
  })
})
