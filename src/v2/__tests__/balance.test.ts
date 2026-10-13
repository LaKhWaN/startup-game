import { afterEach, describe, expect, it, vi } from 'vitest'
import { totalDays } from '../engine/clock'
import { applyEventChoice } from '../engine/events'
import { monthlyBurn as getMonthlyBurn } from '../engine/money'
import { createV2State } from '../state'
import { stepV2 } from '../v2Tick'
import { makeConfig } from './fixtures'
import { play, resting, seeded } from './simPlayer'

afterEach(() => vi.restoreAllMocks())

describe('balance simulation', () => {
  for (const seed of [1, 2, 3]) {
    it(`seed ${seed}: a sensible manager reaches Co-working within two years without going broke`, () => {
      const rng = seeded(seed)
      vi.spyOn(Math, 'random').mockImplementation(rng)
      resting.clear()
      let s = createV2State(makeConfig()) // real start: XP laptops, free hosting
      const reached: Record<string, number> = {}
      for (let h = 0; h < 730 * 24 && s.phase === 'playing'; h++) {
        if (h % 6 === 0) s = play(s, rng, true)
        else if (s.pendingEvent) s = applyEventChoice(s, 0)
        s = stepV2(s, rng)
        if (!(s.v2.location in reached)) reached[s.v2.location] = totalDays(s.gameTime)
        if (process.env.SIM_TRACE && seed === 1 && h % (24 * 25) === 0) console.log(`d${totalDays(s.gameTime)} mrr ${s.mrr} cust ${s.customers} cash ${Math.round(s.cash)} burn ${getMonthlyBurn(s)} churn ${s.churnRate.toFixed(1)} tickets ${s.v2.tickets} debt ${Math.round(s.techDebt)} team ${Object.keys(s.v2.team).length} fE ${Math.round(s.v2.founder.energy ?? 100)} beat ${s.v2.chapter.beat}/${s.v2.chapter.complete} leads ${s.v2.leads}`)
        if (process.env.SIM_DEBUG && h % (24 * 15) === 0) console.log(`d${totalDays(s.gameTime)} h${s.gameTime.totalHours} mrr ${s.mrr} cust ${s.customers} cash ${Math.round(s.cash)} leads ${s.v2.leads} beat ${s.v2.chapter.beat} task ${s.v2.founder.task?.type} team ${Object.keys(s.v2.team).length} loc ${s.v2.location} :: ${s.storyLog[0]?.lines[0]}`)
        if (reached.coworking !== undefined) break
      }
      if (process.env.SIM_DEBUG) console.log(`seed ${seed}:`, JSON.stringify(reached), `day ${totalDays(s.gameTime)}`, `mrr $${s.mrr}`, `cash $${Math.round(s.cash)}`, `team ${Object.keys(s.v2.team).length}`, s.phase)
      expect(s.phase).toBe('playing')
      expect(reached.coworking).toBeDefined()
      // The manager really used the shop and infra (guards against them silently breaking).
      expect(s.v2.perks.length).toBeGreaterThan(0)
      expect(s.v2.setups.founder).toBeGreaterThanOrEqual(2)
      expect(s.v2.infra.hosting).toBeGreaterThanOrEqual(3)
      expect(reached.coworking).toBeLessThanOrEqual(730)
      // …but not trivially: each rung takes real growth, not one windfall.
      expect(reached.biggerHome).toBeGreaterThanOrEqual(30)
      expect(reached.coworking - reached.biggerHome).toBeGreaterThanOrEqual(30)
      expect(Object.values(s.v2.team).some(m => m.tier === 'fulltime')).toBe(true)
    }, 60_000)
  }

  it('managing support, debt, people, shop and infra beats neglecting them', () => {
    const runFor = (careful: boolean) => {
      const rng = seeded(11)
      vi.spyOn(Math, 'random').mockImplementation(rng)
      resting.clear()
      let s = createV2State(makeConfig())
      for (let h = 0; h < 300 * 24 && s.phase === 'playing'; h++) {
        if (h % 6 === 0) s = play(s, rng, careful)
        else if (s.pendingEvent) s = applyEventChoice(s, 0)
        s = stepV2(s, rng)
      }
      vi.restoreAllMocks()
      return s
    }
    const neglect = runFor(false)
    const careful = runFor(true)
    if (process.env.SIM_DEBUG) console.log('neglect', neglect.customers, Math.round(neglect.churnRate), neglect.v2.tickets, '| careful', careful.customers, Math.round(careful.churnRate), careful.v2.tickets)
    expect(careful.phase).toBe('playing')
    expect(careful.customers).toBeGreaterThan(neglect.customers)
    expect(careful.v2.tickets / careful.customers).toBeLessThan(neglect.v2.tickets / Math.max(1, neglect.customers))
    // Neglect never upgrades hosting, so it's stuck under the free tier's 20-customer cap with outages.
    expect(neglect.v2.infra.hosting).toBe(1)
  }, 60_000)

  it('ignoring stress and morale makes people quit; perks and rest keep them', async () => {
    const { act, resetPersonaMemory } = await import('./simPersonas')
    const quitsFor = (persona: 'medium' | 'hard') => {
      const rng = seeded(5)
      vi.spyOn(Math, 'random').mockImplementation(rng)
      resetPersonaMemory()
      let s = createV2State(makeConfig())
      const log = { quits: 0, fired: 0, maxTeam: 0, peakMrr: 0 }
      for (let h = 0; h < 600 * 24 && s.phase === 'playing'; h++) {
        if (h % 6 === 0) s = act(s, persona, rng, log)
        const ids = Object.keys(s.v2.team)
        s = stepV2(s, rng)
        log.quits += ids.filter(id => !s.v2.team[id]).length
      }
      vi.restoreAllMocks()
      return log.quits
    }
    const ignored = quitsFor('medium')
    const caredFor = quitsFor('hard')
    if (process.env.SIM_DEBUG) console.log('quits: ignored', ignored, '| cared for', caredFor)
    expect(ignored).toBeGreaterThanOrEqual(10)
    expect(caredFor).toBeLessThan(ignored / 4)
  }, 120_000)
})
