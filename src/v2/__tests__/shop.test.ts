import { describe, expect, it } from 'vitest'
import {
  activePerks, buyPerk, canBuyPerk, canUpgradeSetup, perkEffects, PERKS, PERK_SLOTS, SETUPS, setupOf, upgradeSetup,
} from '../shop'
import { makeState, withV2 } from './fixtures'

const rich = (over = {}) => withV2(makeState({ cash: 50_000 }), { setups: { founder: 1, seats: [] }, ...over })

describe('perks', () => {
  it('catalog and slots match the spec', () => {
    expect(PERKS.map(p => p.id)).toEqual(['coffee', 'plants', 'decor', 'sofa', 'games', 'tableTennis'])
    expect(PERK_SLOTS).toEqual({ home: 1, biggerHome: 2, villa: 3, coworking: 3, smallOffice: 4, bigOffice: 5, building: 6 })
  })

  it('buying costs cash, needs a free slot, and only once per perk', () => {
    let s = rich()
    expect(canBuyPerk(s, 'coffee')).toBe('ok')
    s = buyPerk(s, 'coffee')
    expect(s.cash).toBe(50_000 - 400)
    expect(s.v2.perks).toEqual(['coffee'])
    expect(canBuyPerk(s, 'coffee')).toBe('owned')
    expect(canBuyPerk(s, 'plants')).toBe('full') // bedroom has 1 slot
    expect(canBuyPerk(withV2(makeState({ cash: 50 }), {}), 'coffee')).toBe('cash')
  })

  it('only as many perks as the location has slots are active', () => {
    const s = rich({ perks: ['coffee', 'plants', 'sofa'], location: 'biggerHome' })
    expect(activePerks(s)).toEqual(['coffee', 'plants'])
  })

  it('effects add up', () => {
    const e = perkEffects(rich({ perks: ['coffee', 'plants', 'games'], location: 'villa' }))
    expect(e).toMatchObject({ energyDrain: 0.8, moraleBonus: 7, idleStressRelief: 2, overnightEnergy: 0, workStressRelief: 0 })
  })
})

describe('setups', () => {
  it('everyone starts on the old XP laptop', async () => {
    const { createV2State } = await import('../state')
    const { makeConfig } = await import('./fixtures')
    const real = createV2State(makeConfig())
    expect(SETUPS[0]).toMatchObject({ tier: 1, speed: 0.8, mistakes: 1.4 })
    expect(setupOf(real, 'founder').tier).toBe(1)
    expect(setupOf(real, 0).tier).toBe(1)
  })

  it('upgrades a desk one tier at a time, for cash', () => {
    let s = rich()
    expect(canUpgradeSetup(s, 'founder')).toBe('ok')
    s = upgradeSetup(s, 'founder')
    expect(setupOf(s, 'founder')).toMatchObject({ tier: 2, speed: 1 })
    expect(s.cash).toBe(50_000 - 800)
    s = upgradeSetup(upgradeSetup(s, 'founder'), 'founder')
    expect(setupOf(s, 'founder').tier).toBe(4)
    expect(canUpgradeSetup(s, 'founder')).toBe('max')
    expect(canUpgradeSetup(withV2(makeState({ cash: 10 }), { setups: { founder: 1, seats: [] } }), 2)).toBe('cash')
  })
})

describe('shop effects on people and work', () => {
  it('coffee slows the energy drain; a sofa adds overnight energy; perks lift morale', async () => {
    const { peopleDay, peopleHour } = await import('../engine/people')
    const { member, withTeam } = await import('./fixtures')
    const base = withTeam(makeState(), member({ id: 'b', task: { type: 'emails', progress: 0 }, energy: 100 }))
    const coffee = withV2(base, { perks: ['coffee'] })
    expect(peopleHour(coffee).v2.team.b.energy).toBeCloseTo(100 - 7 * 0.8 / 3)
    const sofa = withV2({ ...base, v2: { ...base.v2, team: { b: { ...base.v2.team.b, energy: 20 } } } }, { perks: ['sofa'] })
    expect(peopleDay(sofa, 1).v2.team.b.energy).toBe(20 + 60 + 12)
    const plain = peopleDay(base, 1).v2.team.b.morale!
    const happy = peopleDay(withV2(base, { perks: ['plants'] }), 1).v2.team.b.morale!
    expect(happy).toBeGreaterThan(plain)
  })

  it('better setups make desks faster', async () => {
    const { deskSpeed } = await import('../shop')
    expect(deskSpeed(withV2(makeState(), { setups: { founder: 1, seats: [] } }), 0)).toBe(0.8)
    expect(deskSpeed(withV2(makeState(), { setups: { founder: 4, seats: [3] } }), 'founder')).toBe(1.4)
    expect(deskSpeed(withV2(makeState(), { setups: { founder: 4, seats: [3] } }), 0)).toBe(1.2)
  })
})
