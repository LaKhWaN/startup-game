import { describe, expect, it } from 'vitest'
import { canMigrate, startMigration, toggleTool } from '../engine/infra'
import { stepV2 } from '../v2Tick'
import { moveTo } from '../locations'
import { makeState, member, withChapter, withTeam, withV2 } from './fixtures'

describe('services are billed by the hour (review I1)', () => {
  it('a tool used for part of a day is still paid for those hours', () => {
    let s = withV2(makeState({ cash: 10_000, gameTime: { totalHours: 10 } }), {})
    s = toggleTool(s, 'ci') // $200/mo
    for (let h = 0; h < 6; h++) s = stepV2(s, () => 0.99)
    s = toggleTool(s, 'ci')
    expect(s.cash).toBeCloseTo(10_000 - (200 / 720) * 6, 1)
  })
})

describe('hosting can scale down (review I4)', () => {
  it('downgrades when customers fit the smaller plan, instantly', () => {
    const s = withV2(makeState({ customers: 100 }), { infra: { hosting: 4, wifi: 'home', tools: [] } })
    expect(canMigrate(s, 2)).toBe('ok')
    expect(canMigrate(s, 1)).toBe('too-small')
    const down = startMigration(s, 2, 5)
    expect(down.v2.infra.hosting).toBe(2)
    expect(down.v2.infra.migratingTo).toBeUndefined()
  })
})

describe('desk upgrades follow people when seats renumber (review minor)', () => {
  it('moving keeps each person on their own computer', () => {
    let s = withChapter(makeState({ cash: 100_000 }), { complete: true, beat: 5 })
    s = withTeam(s, member({ id: 'a', seat: 0 }), member({ id: 'b', seat: 2 }))
    s = withV2(s, { setups: { founder: 1, seats: [1, 1, 4] }, unlockedLocations: ['home', 'biggerHome'] })
    const moved = moveTo(s, 'biggerHome')
    expect(moved.v2.team.b.seat).toBe(1)
    expect(moved.v2.setups.seats[1]).toBe(4)
  })
})
