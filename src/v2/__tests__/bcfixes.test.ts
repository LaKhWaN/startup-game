import { describe, expect, it } from 'vitest'
import { applyOutcome } from '../founder'
import { churnBreakdown } from '../engine/churn'
import { processDay } from '../engine/day'
import { applyEventChoice } from '../engine/events'
import { EVENTS } from '../engine/eventData'
import { peopleDay, peopleHour } from '../engine/people'
import { reputationFactor } from '../engine/market'
import { hireSpeed } from '../work'
import { makeFeature, makeState, member, withTeam, withV2 } from './fixtures'

const BIG = { hosting: 5, wifi: 'home' as const, tools: [] }
const w = { id: 'h', name: 'Sam', skills: { research: 3, build: 3, outreach: 3, sales: 3 } }

describe('retention lasts (review #1)', () => {
  it('a feature\'s churn drop survives the next day', () => {
    const s0 = withV2({ ...makeState({ cash: 1e6, customers: 100 }), features: [makeFeature({ status: 'in_development', assignedToDevId: 'h', effects: { churnRate: -3 } })] }, { firstSaleDone: true, infra: BIG })
    const built = applyOutcome(s0, w, { type: 'develop', featureId: 'feat-test', progress: 1 }, () => 0.5, { mistake: false, firstSaleGuarantee: false })!
    expect(built.churnRelief).toBeGreaterThan(0)
    const next = processDay(built, 1, () => 0.99)
    expect(churnBreakdown(next).relief).toBeGreaterThan(0)
    expect(next.churnRate).toBeLessThan(churnBreakdown({ ...next, churnRelief: 0 }).total)
  })
  it('never pushes churn below the floor', () => {
    const b = churnBreakdown(withV2(makeState({ churnRelief: 50, customers: 10, productProgress: 60 }), { infra: BIG }))
    expect(b.total).toBe(b.floor)
  })
})

describe('good events help (review #2)', () => {
  it('an event that lowers churn leaves a fading relief', () => {
    const s = withV2(makeState({ pendingEvent: EVENTS[0], churnShock: 0, customers: 100 }), { infra: BIG })
    const after = applyEventChoice(s, 0, { churnRate: s.churnRate - 3 })
    expect(after.churnShock).toBeCloseTo(-3)
    expect(churnBreakdown(after).shock).toBeCloseTo(-3)
    const faded = processDay(after, 1, () => 0.99)
    expect(faded.churnShock).toBeCloseTo(-2.85)
  })
})

describe('burnout is reachable (review #3)', () => {
  it('a hire busy every hour of every workday burns out within ~10 weeks, without perks', () => {
    let s = withTeam(makeState(), member({ id: 'b', task: { type: 'emails', progress: 0 } }))
    let noticeDay: number | undefined
    for (let day = 1; day <= 75 && noticeDay === undefined; day++) {
      const weekend = (day - 1) % 7 >= 5
      if (!weekend) for (let h = 0; h < 8; h++) s = peopleHour({ ...s, v2: { ...s.v2, team: { b: { ...s.v2.team.b, task: { type: 'emails', progress: 0 } } } } }, true)
      s = peopleDay(s, day, (day % 7) >= 5, weekend)
      noticeDay = s.v2.team.b?.leavingOn
    }
    expect(noticeDay).toBeDefined()
    expect(noticeDay!).toBeLessThanOrEqual(70)
  })
  it('a hire with regular idle time stays fine', () => {
    let s = withTeam(makeState(), member({ id: 'b' }))
    for (let day = 1; day <= 60; day++) {
      const weekend = (day - 1) % 7 >= 5
      if (!weekend) for (let h = 0; h < 8; h++) s = peopleHour({ ...s, v2: { ...s.v2, team: { b: { ...s.v2.team.b, task: h < 5 ? { type: 'emails', progress: 0 } : null } } } }, true)
      s = peopleDay(s, day, (day % 7) >= 5, weekend)
    }
    expect(s.v2.team.b.leavingOn).toBeUndefined()
  })
})

describe('support scales (review #4)', () => {
  it('everyone answers support at their main-task speed', () => {
    expect(hireSpeed('developer', 'support', 'intern')).toBe(0.8)
    expect(hireSpeed('sales', 'support', 'fulltime')).toBe(1)
  })
  it('tiny companies are not punished for a single ticket', () => {
    const tiny = withV2(makeState({ customers: 5 }), { tickets: 1, infra: BIG })
    expect(churnBreakdown(tiny).support).toBeLessThan(3)
    expect(reputationFactor(tiny)).toBeGreaterThan(0.95)
  })
})
