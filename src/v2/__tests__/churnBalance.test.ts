import { describe, expect, it } from 'vitest'
import { churnBreakdown, competitionChurn, staleChurn } from '../engine/churn'
import { processDay, TICKETS_PER_CUSTOMER_DAY } from '../engine/day'
import { leadSaturation, marketCeiling, shareFactor } from '../engine/market'
import { TOOLS_PER_CUSTOMER } from '../engine/money'
import { applyOutcome, ARPU_CAP } from '../founder'
import { makeFeature, makeState, withChapter, withV2 } from './fixtures'

/** Plenty of hosting so the 'slow app' term stays out of these checks. */
const BIG = { hosting: 5, wifi: 'home' as const, tools: [] }
const w = { id: 'h', name: 'Sam', skills: { research: 3, build: 3, outreach: 3, sales: 3 } }
const ok = { mistake: false, firstSaleGuarantee: false }
const atDay = (day: number) => ({ totalHours: day * 24 })

describe('competition churn', () => {
  const s = makeState()
  const cap = marketCeiling(s)
  it('is zero up to 40% market share, +8% at full share', () => {
    expect(competitionChurn({ ...s, customers: Math.round(cap * 0.4) })).toBe(0)
    expect(competitionChurn({ ...s, customers: Math.round(cap * 0.7) })).toBeCloseTo(4, 0)
    expect(competitionChurn({ ...s, customers: cap })).toBeCloseTo(8)
  })
  it('shows in the breakdown', () => {
    const b = churnBreakdown(withV2(makeState({ customers: cap, productProgress: 60 }), { infra: BIG }))
    expect(b.competition).toBeCloseTo(8)
  })
})

describe('retention relief', () => {
  it('cancels at most half of the extra churn', () => {
    const s = withV2(makeState({ techDebt: 50, productProgress: 60, customers: 100, churnRelief: 6 }), { infra: BIG })
    const b = churnBreakdown(s)
    expect(b.bugs).toBeCloseTo(3)
    expect(b.relief).toBeCloseTo(1.5)
    expect(b.total).toBeCloseTo(b.floor + 1.5)
  })
})

describe('stale product churn', () => {
  const base = withChapter(makeState({ productProgress: 60 }), { complete: true })
  it('starts 30 days after the last ship: +0.5% a week, at most +3%', () => {
    expect(staleChurn({ ...base, gameTime: { ...base.gameTime, ...atDay(29) } })).toBe(0)
    expect(staleChurn({ ...base, gameTime: { ...base.gameTime, ...atDay(44) } })).toBeCloseTo(1)
    expect(staleChurn({ ...base, gameTime: { ...base.gameTime, ...atDay(400) } })).toBe(3)
  })
  it('resets when a feature ships', () => {
    const shipped = { ...base, features: [makeFeature({ status: 'completed', completedAtDay: 30 })], gameTime: { ...base.gameTime, ...atDay(35) } }
    expect(staleChurn(shipped)).toBe(0)
  })
  it('does not apply during the tutorial chapter', () => {
    expect(staleChurn({ ...makeState(), gameTime: { ...makeState().gameTime, ...atDay(100) } })).toBe(0)
  })
})

describe('new customers churn twice as fast', () => {
  it('adds the base rate × the new share', () => {
    const s = withV2(makeState({ techDebt: 0, productProgress: 60, customers: 100 }), { infra: BIG, freshCustomers: 50 })
    const b = churnBreakdown(s)
    expect(b.fresh).toBeCloseTo(b.floor * 0.5)
    expect(b.total).toBeCloseTo(b.floor * 1.5)
  })
  it('won customers join the new cohort, which ages day by day', () => {
    const s = withV2(makeState({ customers: 0, cash: 1e6 }), { leads: 20, firstSaleDone: true })
    const after = applyOutcome(s, w, { type: 'sales', progress: 1 }, () => 0, ok)!
    const won = after.customers
    expect(won).toBeGreaterThan(0)
    expect(after.v2.freshCustomers).toBe(won)
    const next = processDay(after, 2, () => 0.99)
    expect(next.v2.freshCustomers).toBeLessThan(won)
  })
})

describe('late sales are harder', () => {
  const s = makeState()
  const cap = marketCeiling(s)
  it('conversion × (1 − 0.5 × market share)', () => {
    expect(shareFactor({ ...s, customers: 0 })).toBe(1)
    expect(shareFactor({ ...s, customers: cap })).toBeCloseTo(0.5)
  })
  it('lead flow floors at 5%', () => {
    expect(leadSaturation({ ...s, customers: cap })).toBe(0.05)
  })
})

describe('costs and caps', () => {
  it('support load and per-customer cost are higher', () => {
    expect(TICKETS_PER_CUSTOMER_DAY).toBe(0.05)
    expect(TOOLS_PER_CUSTOMER).toBe(4)
  })
  it('features never push ARPU above the cap', () => {
    expect(ARPU_CAP).toBe(100)
    const s = withV2(makeState({ arpu: 90, customers: 10, features: [makeFeature({ effects: { arpu: 500 } })] }), { firstSaleDone: true })
    const built = applyOutcome(s, w, { type: 'develop', featureId: 'feat-test', progress: 1 }, () => 0.5, ok)!
    expect(built.arpu).toBe(100)
  })
})
