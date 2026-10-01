import { describe, expect, it } from 'vitest'
import { applyOutcome } from '../founder'
import { createV2Slice, migrateV2Slice } from '../state'
import { railStats } from '../stats'
import { makeFeature, makeState, seq, withChapter, withV2 } from './fixtures'

const w = { id: 'h1', name: 'Sam', skills: { research: 3, build: 3, outreach: 3, sales: 3 } }
const ok = { mistake: false, firstSaleGuarantee: false }

describe('lifetime stats', () => {
  it('start at zero and migrate onto old saves', () => {
    expect(makeState().v2.stats).toEqual({ researchRounds: 0, featuresShipped: 0, emailRounds: 0, leadsFound: 0, salesCalls: 0, customersWon: 0, mistakes: 0 })
    const { stats: _s, ...old } = createV2Slice()
    expect(migrateV2Slice(old)!.stats.emailRounds).toBe(0)
  })

  it('count email rounds and the leads they found', () => {
    const s = applyOutcome(makeState(), w, { type: 'emails', progress: 1 }, seq(0.5), ok)!
    expect(s.v2.stats.emailRounds).toBe(1)
    expect(s.v2.stats.leadsFound).toBe(s.v2.leads)
  })

  it('count sales calls and customers won', () => {
    const s0 = withV2(makeState(), { leads: 5, firstSaleDone: true })
    const s = applyOutcome(s0, w, { type: 'sales', progress: 1 }, seq(0.01), ok)!
    expect(s.v2.stats.salesCalls).toBe(1)
    expect(s.v2.stats.customersWon).toBe(s.customers - s0.customers)
    expect(s.v2.stats.customersWon).toBeGreaterThan(0)
  })

  it('count shipped features and mistakes', () => {
    const s0 = { ...withV2(makeState(), { firstSaleDone: true }), features: [makeFeature({ status: 'in_development', assignedToDevId: 'h1' })] }
    const s = applyOutcome(s0, w, { type: 'develop', featureId: 'feat-test', progress: 1 }, seq(0.5), { mistake: true, firstSaleGuarantee: false })!
    expect(s.v2.stats.featuresShipped).toBe(1)
    expect(s.v2.stats.mistakes).toBe(1)
  })
})

describe('railStats', () => {
  it('summarises who is working and what is queued', () => {
    let s = withChapter(makeState(), { complete: true, beat: 5 })
    s = { ...s, features: [makeFeature({ id: 'a' }), makeFeature({ id: 'b', status: 'in_development', assignedToDevId: 'x' })] }
    s = withV2(s, {
      founder: { ...s.v2.founder, task: { type: 'research', progress: 0.3 } },
      team: {
        x: { id: 'x', name: 'X', gender: 'male', role: 'developer', tier: 'intern', skills: { research: 1, build: 3, outreach: 1, sales: 1 }, assignment: 'develop', task: { type: 'develop', featureId: 'b', progress: 0.2 }, mistakes: 0, seat: 0, characterModel: 'character-male-b', salary: 700 },
        y: { id: 'y', name: 'Y', gender: 'male', role: 'sales', tier: 'intern', skills: { research: 1, build: 1, outreach: 1, sales: 3 }, assignment: 'sales', task: null, mistakes: 0, seat: 1, characterModel: 'character-male-c', salary: 700 },
        z: { id: 'z', name: 'Z', gender: 'male', role: 'sales', tier: 'intern', skills: { research: 1, build: 1, outreach: 1, sales: 3 }, assignment: 'idle', task: null, mistakes: 0, seat: 2, characterModel: 'character-male-d', salary: 700 },
      },
    })
    expect(railStats(s)).toMatchObject({ working: 2, waiting: 1, idle: 1, ideas: 1, building: 1 })
  })
})
