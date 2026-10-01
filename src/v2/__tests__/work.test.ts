import { describe, expect, it } from 'vitest'
import { estimateFeatureEffects } from '../engine/features'
import { applyOutcome, pickResearchTemplates } from '../founder'
import { hireSpeed, MAIN_TASK, mistakeChance, workerDurationDays } from '../work'
import type { V2GameState } from '../state'
import { makeFeature, makeState, seq, withV2 } from './fixtures'

const priya = { id: 'h1', name: 'Priya', skills: { research: 1, build: 1, outreach: 3, sales: 1 } }
const noMistake = { mistake: false, firstSaleGuarantee: false }
const mistake = { mistake: true, firstSaleGuarantee: false }

describe('hire speeds', () => {
  it('maps each role to its main task', () => {
    expect(MAIN_TASK).toEqual({ developer: 'develop', product_manager: 'research', marketing: 'emails', sales: 'sales' })
  })
  it('is 0.7 on the main task and 0.35 elsewhere', () => {
    expect(hireSpeed('marketing', 'emails')).toBe(0.7)
    expect(hireSpeed('marketing', 'develop')).toBe(0.35)
  })
  it('stretches the founder duration by 1/speed', () => {
    const s = makeState()
    expect(workerDurationDays(s, 'emails', undefined, 0.7)).toBeCloseTo(2 / 0.7)
    expect(workerDurationDays(s, 'emails', undefined, 1)).toBe(2)
  })
})

describe('mistakeChance', () => {
  it('starts at 15%, drops 2% per main-skill point, floors at 5%', () => {
    expect(mistakeChance({ role: 'marketing', skills: { ...priya.skills, outreach: 3 } })).toBeCloseTo(0.15)
    expect(mistakeChance({ role: 'marketing', skills: { ...priya.skills, outreach: 6 } })).toBeCloseTo(0.09)
    expect(mistakeChance({ role: 'marketing', skills: { ...priya.skills, outreach: 20 } })).toBeCloseTo(0.05)
  })
})

describe('applyOutcome for a hire', () => {
  it('emails use the worker’s outreach skill', () => {
    const s = makeState() // brand 10
    const done = applyOutcome(s, priya, { type: 'emails', progress: 1 }, seq(0), noMistake)!
    expect(done.v2.leads).toBe(Math.round((4 + 3) * 1.1)) // 8
    expect(done.storyLog[0].lines[0]).toMatch(/Priya/)
  })

  it('an emails mistake halves the leads (rounded down)', () => {
    const done = applyOutcome(makeState(), priya, { type: 'emails', progress: 1 }, seq(0), mistake)!
    expect(done.v2.leads).toBe(4)
  })

  it('a research mistake finds only 1 feature', () => {
    const done = applyOutcome(makeState(), priya, { type: 'research', progress: 1 }, seq(0), mistake)!
    expect(done.features).toHaveLength(1)
    expect(pickResearchTemplates(makeState(), seq(0), 1).templates).toHaveLength(1)
  })

  it('a develop mistake halves the effects and adds 5 tech debt', () => {
    const s: V2GameState = withV2(makeState({ features: [makeFeature({ status: 'in_development', assignedToDevId: 'h1' })] }), { firstSaleDone: true })
    const est = estimateFeatureEffects({ customers: 10 }, 'medium', 5, s.arpu, s.customers, 1)
    const clean = applyOutcome(s, priya, { type: 'develop', featureId: 'feat-test', progress: 1 }, seq(0), noMistake)!
    const messy = applyOutcome(s, priya, { type: 'develop', featureId: 'feat-test', progress: 1 }, seq(0), mistake)!
    expect(clean.customers).toBe(est.customers)
    expect(messy.customers).toBe(Math.round(est.customers * 0.5))
    expect(messy.techDebt - clean.techDebt).toBe(5)
    expect(messy.recentFeatureResults[0].devName).toBe('Priya')
  })

  it('a sales mistake fumbles one conversion and there is no first-sale guarantee for hires', () => {
    const s = withV2(makeState(), { leads: 4 })
    expect(applyOutcome(s, priya, { type: 'sales', progress: 1 }, seq(0.99), noMistake)!.customers).toBe(0)
    expect(applyOutcome(s, priya, { type: 'sales', progress: 1 }, seq(0), noMistake)!.customers).toBe(4)
    expect(applyOutcome(s, priya, { type: 'sales', progress: 1 }, seq(0), mistake)!.customers).toBe(3)
  })
})
