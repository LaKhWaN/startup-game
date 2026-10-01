import { describe, expect, it } from 'vitest'
import { churnBreakdown } from '../engine/churn'
import { processDay } from '../engine/day'
import { applyEventChoice } from '../engine/events'
import { EVENTS } from '../engine/eventData'
import { migrateV2Slice, createV2Slice } from '../state'
import { makeState, withV2 } from './fixtures'

/** Plenty of hosting so the 'slow app' term stays out of these checks. */
const BIG = { hosting: 5, wifi: 'home' as const, tools: [] }

describe('churnBreakdown', () => {
  it('is the tier floor when the product is healthy', () => {
    const s = withV2(makeState({ techDebt: 0, productProgress: 60, customers: 100, churnShock: 0 }), { infra: BIG })
    const b = churnBreakdown(s)
    expect(b).toMatchObject({ bugs: 0, support: 0, thin: 0, shock: 0 })
    expect(b.total).toBe(b.floor)
  })

  it('adds bugs, support backlog, a thin product and shocks', () => {
    const s = withV2(makeState({ techDebt: 50, productProgress: 15, customers: 100, churnShock: 2 }), { tickets: 10, infra: BIG })
    const b = churnBreakdown(s)
    expect(b.bugs).toBeCloseTo(3)
    expect(b.support).toBeCloseTo(4) // 10/100 × 40
    expect(b.thin).toBeCloseTo(2) // (30 − 15)/30 × 4
    expect(b.shock).toBe(2)
    expect(b.total).toBeCloseTo(b.floor + 11)
  })

  it('caps the support part at 8%', () => {
    expect(churnBreakdown(withV2(makeState({ customers: 10 }), { tickets: 50 })).support).toBe(8)
  })
})

describe('processDay (market reality)', () => {
  const always = () => 0 // every probabilistic roll rounds up

  it('leads go cold', () => {
    const s = processDay(withV2(makeState({ cash: 1e6 }), { leads: 100 }), 1, always)
    expect(s.v2.leads).toBe(92)
  })

  it('customers raise support tickets, more with tech debt', () => {
    const clean = processDay(makeState({ cash: 1e6, customers: 100, techDebt: 0 }), 1, () => 0.99)
    const debt = processDay(makeState({ cash: 1e6, customers: 100, techDebt: 100 }), 1, () => 0.99)
    expect(clean.v2.tickets).toBe(3)
    expect(debt.v2.tickets).toBe(6)
  })

  it('sets churn from the breakdown and fades shocks', () => {
    const s = processDay(makeState({ cash: 1e6, customers: 0, churnShock: 1 }), 1, () => 0.99)
    expect(s.churnShock).toBeCloseTo(0.85)
    expect(s.churnRate).toBeCloseTo(churnBreakdown(s).total)
  })
})

describe('events and churn', () => {
  it('turn an event churn change into a fading shock', () => {
    const bug = EVENTS.find(e => e.id === 'critical-bug')!
    const s = makeState({ pendingEvent: bug, churnShock: 0 })
    const patch = { churnRate: s.churnRate + 5 }
    const after = applyEventChoice(s, 1, patch)
    expect(after.churnShock).toBeCloseTo(5)
  })
})

describe('migration', () => {
  it('older slices get an empty ticket queue', () => {
    const { tickets: _t, ...old } = createV2Slice()
    expect(migrateV2Slice(old)!.tickets).toBe(0)
  })
})
