import { describe, expect, it } from 'vitest'
import {
  HOSTING, canMigrate, hostingCap, hostingLoad, infraServicesCost, outageChance, setWifi, slowAppChurn, startMigration, finishMigrations,
  toggleTool, wifiSpeed, toolEffects, OUTAGE,
} from '../engine/infra'
import { monthlyBurn } from '../engine/money'
import { churnBreakdown } from '../engine/churn'
import { processDay } from '../engine/day'
import { makeState, withV2 } from './fixtures'

const at = (customers: number, over = {}) => withV2(makeState({ cash: 1e6, customers }), over)

describe('hosting', () => {
  it('starts on the free tier: 20 customers', () => {
    expect(HOSTING.map(h => h.cap)).toEqual([20, 150, 600, 2500, 10000])
    expect(hostingCap(makeState())).toBe(20)
    expect(hostingLoad(at(18))).toBeCloseTo(0.9)
  })

  it('above 90% load the app feels slow (+1% churn); above 100% outages start', () => {
    expect(slowAppChurn(at(17))).toBe(0)
    expect(slowAppChurn(at(19))).toBe(1)
    expect(churnBreakdown(at(19)).slow).toBe(1)
    expect(outageChance(at(20))).toBe(0)
    expect(outageChance(at(30))).toBeCloseTo(0.45)
    expect(outageChance(at(100))).toBe(0.5)
  })

  it('migrations: pay at once, capacity when done, one at a time', () => {
    let s = startMigration(makeState({ cash: 1000 }), 2, 10)
    expect(s.v2.infra.migratingTo).toBe(2)
    expect(s.v2.infra.migrationDoneDay).toBe(11)
    expect(hostingCap(s)).toBe(20)
    expect(infraServicesCost(s)).toBe(50)
    expect(canMigrate(s, 3)).toBe('busy')
    s = finishMigrations(s, 11)
    expect(hostingCap(s)).toBe(150)
    expect(s.v2.infra.migratingTo).toBeUndefined()
    expect(canMigrate(s, 1)).toBe('current-or-lower')
  })

  it('an outage loses customers and pops up a decision', () => {
    const s = processDay(at(60, { infra: { hosting: 1, wifi: 'home', tools: [] } }), 2, () => 0) // 0 → everything fires
    expect([OUTAGE.id, 'incident']).toContain(s.pendingEvent?.id)
  })
})

describe('wifi and tools', () => {
  it('wifi changes work speed and cost', () => {
    expect(wifiSpeed(makeState())).toBe(1)
    const fiber = setWifi(makeState(), 'business')
    expect(wifiSpeed(fiber)).toBe(1.1)
    expect(infraServicesCost(fiber)).toBe(250)
  })

  it('tools cost money and change support, incidents and builds', () => {
    let s = toggleTool(makeState(), 'helpdesk')
    s = toggleTool(s, 'monitoring')
    expect(infraServicesCost(s)).toBe(250)
    expect(toolEffects(s)).toMatchObject({ supportBoost: 1.5, incidentFactor: 0.6, buildSpeed: 1, buildMistakes: 1 })
    expect(toolEffects(toggleTool(s, 'helpdesk')).supportBoost).toBe(1)
  })

  it('services are part of the monthly burn', () => {
    const s = setWifi(makeState({ infraCostMonthly: 300 }), 'fiber')
    expect(monthlyBurn(s)).toBe(300 + 80)
  })
})
