import { describe, expect, it } from 'vitest'
import { scoreToDifficulty } from '../../ai/gemini'
import { applyOutcome } from '../founder'
import { leadSaturation, marketCeiling, salesBase, TIER_MARKET } from '../engine/market'
import { makeFeature, makeState, seq, withV2 } from './fixtures'

const w = { id: 'h', name: 'Sam', skills: { research: 3, build: 3, outreach: 4, sales: 4 } }
const ok = { mistake: false, firstSaleGuarantee: false }
const withTier = (score: number) => makeState({ difficultyModifier: scoreToDifficulty(score) })

describe('market ceiling', () => {
  it('depends on the idea tier', () => {
    expect(TIER_MARKET).toEqual({ promising: 2000, competitive: 1200, risky: 700, brutal: 350 })
    expect(marketCeiling(withTier(9))).toBe(Math.round(2000 * (1 + 10 / 400)))
    expect(marketCeiling(withTier(2))).toBeLessThan(marketCeiling(withTier(6)))
  })

  it('grows with shipped features and brand', () => {
    const base = makeState({ brand: 0 })
    const grown = { ...base, features: [makeFeature({ status: 'completed' }), makeFeature({ id: 'b', status: 'completed' })] }
    expect(marketCeiling(grown)).toBeCloseTo(marketCeiling(base) * 1.1, 0)
  })
})

describe('lead saturation', () => {
  it('shrinks email returns near the ceiling, never below 10%', () => {
    const s = makeState({ brand: 0 })
    const cap = marketCeiling(s)
    expect(leadSaturation(s)).toBe(1)
    expect(leadSaturation({ ...s, customers: cap * 0.5 })).toBeCloseTo(0.5)
    expect(leadSaturation({ ...s, customers: cap })).toBe(0.1)
  })

  it('emails find fewer leads in a crowded market', () => {
    const empty = applyOutcome(makeState({ brand: 0 }), w, { type: 'emails', progress: 1 }, seq(0.5), ok)!
    const s = makeState({ brand: 0 })
    const crowded = applyOutcome({ ...s, customers: Math.round(marketCeiling(s) * 0.9) }, w, { type: 'emails', progress: 1 }, seq(0.5), ok)!
    expect(crowded.v2.leads).toBeLessThan(empty.v2.leads / 3)
  })
})

describe('sales', () => {
  it('converts better for better ideas', () => {
    expect(salesBase('promising')).toBe(0.3)
    expect(salesBase('brutal')).toBe(0.15)
  })

  it('never sells past the market ceiling', () => {
    const s0 = withV2(makeState({ brand: 0 }), { leads: 500, firstSaleDone: true })
    const cap = marketCeiling(s0)
    const s = applyOutcome({ ...s0, customers: cap - 2 }, w, { type: 'sales', progress: 1 }, () => 0, ok)!
    expect(s.customers).toBe(cap)
  })
})
