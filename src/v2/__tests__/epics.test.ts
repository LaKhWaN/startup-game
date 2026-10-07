import { describe, expect, it } from 'vitest'
import { adLeadsPerDay, costPerLead, setAdsBudget } from '../engine/ads'
import { debtCreep, processDay } from '../engine/day'
import { infraServicesCost } from '../engine/infra'
import { featureMarketGain, marketCeiling } from '../engine/market'
import { applyRoadmap, canPlanRoadmap, epicFeature, fallbackEpics, roadmapCost } from '../epics'
import { applyOutcome, arpuCap, ARPU_CAP, emailReach, salesCallCap, startTask } from '../founder'
import { moveCushion } from '../locations'
import { advanceTeam } from '../team'
import { makeFeature, makeState, member, withChapter, withTeam, withV2 } from './fixtures'

const w = { id: 'h', name: 'Sam', skills: { research: 3, build: 3, outreach: 3, sales: 3 } }
const ok = { mistake: false, firstSaleGuarantee: false }
const shipped = (n: number) => Array.from({ length: n }, (_, i) => makeFeature({ id: `f${i}`, title: `F${i}`, status: 'completed' }))

describe('diminishing returns on regular features', () => {
  it('each feature adds less market than the last, and it tops out', () => {
    expect(featureMarketGain(1)).toBeCloseTo(0.05)
    expect(featureMarketGain(2) - featureMarketGain(1)).toBeCloseTo(0.05 * 0.93)
    expect(featureMarketGain(50)).toBeLessThan(0.72)
  })

  it('ARPU gains shrink the more you have shipped', () => {
    const feat = makeFeature({ id: 'new', title: 'New', effects: { arpu: 10 } })
    const early = applyOutcome(withV2(makeState({ arpu: 50, customers: 10, features: [feat] }), { firstSaleDone: true }), w, { type: 'develop', featureId: 'new', progress: 1 }, () => 0.5, ok)!
    const late = applyOutcome(withV2(makeState({ arpu: 50, customers: 10, features: [...shipped(20), feat] }), { firstSaleDone: true }), w, { type: 'develop', featureId: 'new', progress: 1 }, () => 0.5, ok)!
    expect(late.arpu - 50).toBeLessThan((early.arpu - 50) / 3)
  })
})

describe('epics', () => {
  const coworking = (over = {}) => withV2(makeState({ cash: 500_000, mrr: 100_000, ...over }), { location: 'coworking' })

  it('turn specs into big proposed features with set effects', () => {
    const f = epicFeature({ title: 'EU launch', description: 'x', baseDays: 99, kind: 'international' }, 1, 5, 'a')
    expect(f).toMatchObject({ status: 'proposed', baseDays: 40, epic: { kind: 'international', round: 1, marketBoost: 0.2 } })
    expect(epicFeature({ title: 'x', description: '', baseDays: 2, kind: 'ai' }, 1, 5, 'b').baseDays).toBe(15)
  })

  it('shipped epics push the market past what regular features can', () => {
    const s = makeState({ brand: 0, features: shipped(60) })
    const epic = { ...epicFeature({ title: 'EU', description: '', baseDays: 20, kind: 'international' }, 1, 0, 'a'), status: 'completed' as const }
    expect(marketCeiling({ ...s, features: [...s.features, epic] })).toBeCloseTo(marketCeiling(s) + 1200 * 0.2, -1)
  })

  it('enterprise epics raise the ARPU cap', () => {
    const ent = { ...epicFeature({ title: 'Ent', description: '', baseDays: 20, kind: 'enterprise' }, 1, 0, 'a'), status: 'completed' as const }
    expect(arpuCap([])).toBe(ARPU_CAP)
    expect(arpuCap([ent])).toBe(ARPU_CAP + 10)
  })

  it('planning costs 75% of MRR (min $10k), ×(1 + rounds planned), and only from Co-working with no epics left', () => {
    expect(roadmapCost(coworking())).toBe(75_000)
    expect(roadmapCost(makeState({ mrr: 1000 }))).toBe(10_000)
    expect(canPlanRoadmap(makeState({ cash: 1e6 }))).toBe('locked')
    expect(canPlanRoadmap(coworking({ cash: 1000 }))).toBe('cash')
    const planned = applyRoadmap(coworking(), fallbackEpics(1))
    expect(planned.cash).toBe(500_000 - 75_000)
    expect(planned.features.filter(f => f.epic)).toHaveLength(8)
    expect(planned.v2.roadmapRound).toBe(1)
    expect(canPlanRoadmap(planned)).toBe('busy')
    expect(roadmapCost(planned)).toBe(150_000) // round 2 costs double
  })

  it('the founder cannot build an epic; developers build it together', () => {
    const epic = epicFeature({ title: 'Big', description: '', baseDays: 20, kind: 'segment' }, 1, 0, 'a')
    const s0 = withChapter(withV2(makeState({ features: [epic] }), { firstSaleDone: true }), { beat: 5, complete: true })
    expect(startTask(s0, 'develop', epic.id)).toEqual({ ok: false, reason: 'no-feature' })
    const dev = (id: string, seat: number) => member({ id, seat, role: 'developer', assignment: 'develop', task: null, energy: 100, stress: 0, morale: 100, context: 100 })
    const solo = withTeam(s0, dev('a', 0))
    const trio = withTeam(s0, dev('a', 0), dev('b', 1), dev('c', 2))
    let one = solo, three = trio
    for (let h = 0; h < 48; h++) { one = advanceTeam(one, 1, () => 0.99).state; three = advanceTeam(three, 1, () => 0.99).state }
    const p1 = one.features[0].buildProgress, p3 = three.features[0].buildProgress
    expect(p3).toBeGreaterThan(p1 * 2.5)
    expect(three.features[0].epic!.helpers).toHaveLength(2)
    // Run to completion: shipped once, everyone freed.
    for (let h = 0; h < 24 * 40 && three.features[0].status !== 'completed'; h++) three = advanceTeam(three, 1, () => 0.99).state
    three = advanceTeam(three, 1, () => 0.99).state
    expect(three.features[0].status).toBe('completed')
    expect(Object.values(three.v2.team).every(m => m.task === null)).toBe(true)
  })

  it('a lead who leaves hands the epic to a helper without losing progress', async () => {
    const { setAssignment } = await import('../team')
    const epic = { ...epicFeature({ title: 'Big', description: '', baseDays: 20, kind: 'segment' }, 1, 0, 'a'), status: 'in_development' as const, assignedToDevId: 'a', buildProgress: 0.4 }
    epic.epic = { ...epic.epic!, helpers: ['b'] }
    const s = withTeam(makeState({ features: [epic] }), member({ id: 'a', task: { type: 'develop', featureId: epic.id, progress: 0.4 } }), member({ id: 'b', seat: 1, task: { type: 'develop', featureId: epic.id, progress: 0.4 } }))
    const after = setAssignment(s, 'a', 'idle')
    expect(after.features[0]).toMatchObject({ status: 'in_development', assignedToDevId: 'b', buildProgress: 0.4 })
  })
})

describe('growth costs money at scale', () => {
  it('cold emails reach fewer people as the company grows', () => {
    expect(emailReach(0)).toBe(1)
    expect(emailReach(1500)).toBeCloseTo(0.5)
  })

  it('a sales call works through at most 12 + 4 × skill leads', () => {
    expect(salesCallCap(5)).toBe(32)
    const s = withV2(makeState({ customers: 10 }), { leads: 100, firstSaleDone: true })
    const after = applyOutcome(s, w, { type: 'sales', progress: 1 }, () => 0.99, ok)!
    expect(after.v2.leads).toBe(100 - salesCallCap(3))
  })

  it('ads buy leads at a cost per lead that rises with market share; the budget is billed', () => {
    const s = setAdsBudget(makeState({ customers: 0 }), 10_000)
    expect(setAdsBudget(makeState(), 1234).v2.adsBudget).toBeUndefined()
    expect(infraServicesCost(s)).toBe(10_000)
    expect(costPerLead(s)).toBe(40)
    expect(adLeadsPerDay(s)).toBeCloseTo(10_000 / 30 / 40)
    expect(costPerLead({ ...s, customers: marketCeiling(s) })).toBe(200)
    const next = processDay(withV2(s, { leads: 0 }), 1, () => 0)
    expect(next.v2.leads).toBeGreaterThanOrEqual(8)
  })

  it('tech debt creeps up every day once you have customers', () => {
    const s = withV2(makeState({ customers: 2000, techDebt: 10, cash: 1e6 }), { firstSaleDone: true })
    expect(processDay(s, 1, () => 0.99).techDebt).toBeCloseTo(10 + debtCreep(2000))
    expect(debtCreep(2000)).toBeCloseTo(1.2)
  })

  it('moving warns when it leaves less than a month of costs', () => {
    const s = withV2(makeState({ cash: 20_000, infraCostMonthly: 3500, mrr: 0 }), { location: 'coworking', unlockedLocations: ['home', 'biggerHome', 'villa', 'coworking', 'smallOffice'] })
    expect(moveCushion(s, 'smallOffice')).toMatchObject({ cashAfter: 2000, risky: true })
    expect(moveCushion({ ...s, cash: 40_000 }, 'smallOffice').risky).toBe(false)
  })
})

describe('events never bankrupt you on a click', () => {
  it('a choice that would take cash below zero is off, unless both would', async () => {
    const { affordableChoices, applyEventChoice } = await import('../engine/events')
    const ev = { id: 't', category: 'crisis' as const, title: 'T', description: '', choices: [
      { label: 'Pay', consequence: 'paid', effect: (s: { cash: number }) => ({ cash: s.cash - 5000 }) },
      { label: 'Lose customers', consequence: 'lost', effect: (s: { customers: number }) => ({ customers: s.customers - 10 }) },
    ] }
    const poor = makeState({ cash: 1000, customers: 100, pendingEvent: ev as never })
    expect(affordableChoices(poor)).toEqual([false, true])
    expect(applyEventChoice(poor, 0).cash).toBe(1000)
    expect(affordableChoices(makeState({ cash: 9000, pendingEvent: ev as never }))).toEqual([true, true])
  })
})
