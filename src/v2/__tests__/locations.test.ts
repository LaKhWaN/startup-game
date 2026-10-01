import { describe, expect, it } from 'vitest'
import { canMove, currentLocation, LOCATIONS, locationIndex, moveTo, updateUnlocks } from '../locations'
import type { InternCandidate, V2GameState } from '../state'
import { hireIntern, teamCapacity } from '../team'
import { makeState, withChapter, withV2 } from './fixtures'

const cand = (id: string): InternCandidate => ({
  id, name: id, gender: 'male', role: 'developer', tier: 'intern',
  skills: { research: 1, build: 3, outreach: 1, sales: 1 }, salary: 600, bio: '', characterModel: 'character-male-c',
})

function withTeam(s: V2GameState, n: number): V2GameState {
  let out = withChapter({ ...s, cash: s.cash + 100_000 }, { beat: 5, complete: true })
  for (let i = 0; i < n; i++) {
    out = withV2(out, { candidates: [cand(`c${i}`)] })
    out = hireIntern(out, `c${i}`)
  }
  return { ...out, cash: s.cash }
}

const unlocked = (s: V2GameState, ...ids: string[]) =>
  withV2(s, { unlockedLocations: ['home', ...ids] as V2GameState['v2']['unlockedLocations'] })

describe('LOCATIONS', () => {
  it('is the seven-step ladder from the bedroom to a building', () => {
    expect(LOCATIONS.map(l => l.id)).toEqual(['home', 'biggerHome', 'villa', 'coworking', 'smallOffice', 'bigOffice', 'building'])
    expect(LOCATIONS[0]).toMatchObject({ capacity: 2, rent: 0, moveIn: 0, unlockMrr: 0 })
  })

  it('grows capacity, rent, move-in and unlock threshold at every step', () => {
    for (let i = 1; i < LOCATIONS.length; i++) {
      for (const k of ['capacity', 'rent', 'moveIn', 'unlockMrr'] as const) {
        expect(LOCATIONS[i][k], `${LOCATIONS[i].id}.${k}`).toBeGreaterThan(LOCATIONS[i - 1][k])
      }
    }
  })

  it('indexes locations by id', () => {
    expect(locationIndex('home')).toBe(0)
    expect(locationIndex('building')).toBe(6)
  })
})

describe('a new game', () => {
  it('starts at home with only home unlocked', () => {
    const s = makeState()
    expect(s.v2.location).toBe('home')
    expect(s.v2.unlockedLocations).toEqual(['home'])
    expect(s.v2.peakMrr).toBe(0)
    expect(currentLocation(s).id).toBe('home')
    expect(teamCapacity(s)).toBe(2)
  })
})

describe('updateUnlocks', () => {
  it('unlocks every location at or below peak MRR, with a story line', () => {
    const s = updateUnlocks(makeState({ mrr: 2600 }))
    expect(s.v2.peakMrr).toBe(2600)
    expect(s.v2.unlockedLocations).toEqual(['home', 'biggerHome', 'villa'])
    expect(s.storyLog[0].lines.join(' ')).toMatch(/Villa/)
  })

  it('never re-locks when MRR falls', () => {
    const s = updateUnlocks(makeState({ mrr: 1200 }))
    const after = updateUnlocks({ ...s, mrr: 100 })
    expect(after.v2.peakMrr).toBe(1200)
    expect(after.v2.unlockedLocations).toEqual(['home', 'biggerHome'])
  })

  it('returns the same state when nothing changes', () => {
    const s = makeState({ mrr: 0 })
    expect(updateUnlocks(s)).toBe(s)
  })
})

describe('canMove', () => {
  it('explains each block', () => {
    const s = makeState({ cash: 100_000 })
    expect(canMove(s, 'home')).toBe('current')
    expect(canMove(s, 'villa')).toBe('locked')
    expect(canMove({ ...unlocked(s, 'biggerHome'), cash: 100 }, 'biggerHome')).toBe('cash')
    expect(canMove(unlocked(s, 'biggerHome'), 'biggerHome')).toBe('ok')
  })

  it('blocks moving somewhere too small for the team', () => {
    const big = withV2(withTeam(makeState({ cash: 100_000 }), 2), { location: 'biggerHome', unlockedLocations: ['home', 'biggerHome'] })
    const crowded = withV2(withTeam(big, 0), {})
    let s = crowded
    for (let i = 2; i < 4; i++) { s = withV2(s, { candidates: [cand(`d${i}`)] }); s = hireIntern(s, `d${i}`) }
    expect(Object.keys(s.v2.team)).toHaveLength(4)
    expect(canMove(s, 'home')).toBe('capacity')
  })
})

describe('moveTo', () => {
  it('pays the move-in, switches rent, and moves', () => {
    const s = { ...unlocked(makeState({ cash: 5000 }), 'biggerHome'), infraCostMonthly: 350 }
    const after = moveTo(s, 'biggerHome')
    const def = LOCATIONS[1]
    expect(after.cash).toBe(5000 - def.moveIn)
    expect(after.infraCostMonthly).toBe(def.rent)
    expect(after.v2.location).toBe('biggerHome')
    expect(after.storyLog[0].lines.join(' ')).toMatch(/Bigger home/i)
  })

  it('does nothing when the move is blocked', () => {
    const s = makeState({ cash: 5000 })
    expect(moveTo(s, 'villa')).toBe(s)
  })

  it('renumbers seats 0..n-1 in seat order and keeps tasks', () => {
    let s = withTeam(makeState({ cash: 5000 }), 2)
    const [a, b] = Object.values(s.v2.team).sort((x, y) => x.seat - y.seat)
    // Seat gap: a sits at 3, b at 1
    s = withV2(s, { team: { [a.id]: { ...a, seat: 3, task: { type: 'emails', progress: 0.4 } }, [b.id]: { ...b, seat: 1 } } })
    const after = moveTo(unlocked(s, 'biggerHome'), 'biggerHome')
    expect(after.v2.team[b.id].seat).toBe(0)
    expect(after.v2.team[a.id].seat).toBe(1)
    expect(after.v2.team[a.id].task).toEqual({ type: 'emails', progress: 0.4 })
  })

  it('makes capacity follow the location', () => {
    const after = moveTo(unlocked(makeState({ cash: 5000 }), 'biggerHome'), 'biggerHome')
    expect(teamCapacity(after)).toBe(LOCATIONS[1].capacity)
  })
})
