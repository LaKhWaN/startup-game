import { afterEach, describe, expect, it, vi } from 'vitest'
import { totalDays } from '../engine/clock'
import { applyEventChoice } from '../engine/events'
import { monthlyBurn as getMonthlyBurn } from '../engine/money'
import { createV2State } from '../state'
import { stepV2 } from '../v2Tick'
import { makeConfig } from './fixtures'
import { play, resting, seeded } from './simPlayer'

import { marketCeiling } from '../engine/market'
import { churnBreakdown } from '../engine/churn'
/** Two-year monthly trace for balance work: SIM_PROBE=1 npx vitest run src/v2/__tests__/simProbe.test.ts */
describe.skipIf(!process.env.SIM_PROBE)("sim probe", () => {
  for (const seed of [1, 2]) it('probe '+seed, () => {
    const rng = seeded(seed)
    vi.spyOn(Math, 'random').mockImplementation(rng)
    resting.clear()
    let s = createV2State(makeConfig())
    let lastWon = 0, lastCust = 0
    for (let h = 0; h < 730 * 24 && s.phase === 'playing'; h++) {
      if (h % 6 === 0) s = play(s, rng, true)
      else if (s.pendingEvent) s = applyEventChoice(s, 0)
            s = stepV2(s, rng)
      if (h % (24*30) === 0) {
        const won = s.v2.stats.customersWon - lastWon; lastWon = s.v2.stats.customersWon
        const b = churnBreakdown(s)
        const roles = Object.values(s.v2.team).map(m => m.role[0] + (m.tier==='fulltime'?'F':'i')).join('')
        console.log(`d${totalDays(s.gameTime)} cust ${s.customers} (+${won} won, net ${s.customers-lastCust}) ceil ${marketCeiling(s)} churn ${b.total.toFixed(1)}% [fl ${b.floor} bug ${b.bugs.toFixed(1)} sup ${b.support.toFixed(1)} comp ${b.competition.toFixed(1)} stale ${b.stale.toFixed(1)} fresh ${b.fresh.toFixed(1)} thin ${b.thin.toFixed(1)} slow ${b.slow.toFixed(1)} sh ${b.shock.toFixed(1)} rel ${b.relief.toFixed(1)}] mrr ${s.mrr} burn ${getMonthlyBurn(s)} cash ${Math.round(s.cash)} tix ${s.v2.tickets} debt ${Math.round(s.techDebt)} arpu ${s.arpu} team ${Object.keys(s.v2.team).length} loc ${s.v2.location}`)
        lastCust = s.customers
      }
    }
  }, 120000)
})
