import { describe, expect, it } from 'vitest'
import { FEATURE_TEMPLATES } from '../../data/featureTemplates'
import { estimateFeatureEffects } from '../engine/features'
import { advanceFounder, FOUNDER_ID, pickResearchTemplates, startTask, type AdvanceResult } from '../founder'
import type { V2GameState } from '../state'
import { makeFeature, makeState, seq, withChapter, withFounder, withV2 } from './fixtures'

const rng = seq(0)

function started(state: V2GameState, type: Parameters<typeof startTask>[1], featureId?: string): V2GameState {
  const r = startTask(state, type, featureId)
  if (!r.ok) throw new Error(`startTask failed: ${r.reason}`)
  return r.state
}

function advanceHours(state: V2GameState, hours: number): AdvanceResult {
  let result: AdvanceResult = { state, completed: null }
  for (let i = 0; i < hours; i++) {
    result = advanceFounder(result.state, 1, rng)
    if (result.completed) return result
  }
  return result
}

describe('startTask', () => {
  it('refuses a second task while one is running', () => {
    const s = started(makeState(), 'research')
    expect(startTask(s, 'research')).toEqual({ ok: false, reason: 'busy' })
  })

  it('refuses locked tasks', () => {
    expect(startTask(makeState(), 'emails')).toEqual({ ok: false, reason: 'locked' })
  })

  it('refuses sales with no leads', () => {
    const s = withChapter(makeState(), { beat: 3 })
    expect(startTask(s, 'sales')).toEqual({ ok: false, reason: 'no-leads' })
  })

  it('refuses develop without a proposed feature', () => {
    const s = withChapter(makeState({ features: [makeFeature({ status: 'completed' })] }), { beat: 1 })
    expect(startTask(s, 'develop', 'feat-test')).toEqual({ ok: false, reason: 'no-feature' })
    expect(startTask(s, 'develop', 'missing')).toEqual({ ok: false, reason: 'no-feature' })
  })

  it('marks the chosen feature in development by the founder', () => {
    const s = started(withChapter(makeState({ features: [makeFeature()] }), { beat: 1 }), 'develop', 'feat-test')
    expect(s.features[0]).toMatchObject({ status: 'in_development', assignedToDevId: FOUNDER_ID, buildProgress: 0 })
    expect(s.v2.founder.task).toEqual({ type: 'develop', featureId: 'feat-test', progress: 0 })
  })
})

describe('advanceFounder + research', () => {
  it('does nothing without a task or with zero hours', () => {
    const idle = makeState()
    expect(advanceFounder(idle, 1, rng)).toEqual({ state: idle, completed: null })
    const busy = started(makeState(), 'research')
    expect(advanceFounder(busy, 0, rng).state).toBe(busy)
  })

  it('completes research after exactly 36 game hours', () => {
    const s = started(makeState(), 'research')
    const almost = advanceHours(s, 35)
    expect(almost.completed).toBeNull()
    expect(almost.state.v2.founder.task?.progress).toBeCloseTo(35 / 36)
    const done = advanceFounder(almost.state, 1, rng)
    expect(done.completed).toBe('research')
    expect(done.state.v2.founder.task).toBeNull()
  })

  it('reveals the next 2 roadmap features as proposed and advances the index', () => {
    const done = advanceHours(started(makeState(), 'research'), 36).state
    expect(done.features.map(f => f.title)).toEqual([FEATURE_TEMPLATES[0].title, FEATURE_TEMPLATES[1].title])
    expect(done.features.every(f => f.status === 'proposed' && f.discoveredByPMId === FOUNDER_ID)).toBe(true)
    expect(done.featureRoadmapIndex).toBe(2)
    expect(done.v2.founder.skills.research).toBe(4.5)
  })

  it('skips titles that already exist', () => {
    const s = makeState({ features: [makeFeature({ title: FEATURE_TEMPLATES[0].title, status: 'completed' })] })
    const { templates, newIndex } = pickResearchTemplates(s, rng)
    expect(templates.map(t => t.title)).toEqual([FEATURE_TEMPLATES[1].title, FEATURE_TEMPLATES[2].title])
    expect(newIndex).toBe(3)
  })

  it('falls back to the template pool when the roadmap runs out', () => {
    const s = makeState({ featureRoadmap: [FEATURE_TEMPLATES[0]], featureRoadmapIndex: 0 })
    const { templates } = pickResearchTemplates(s, seq(0))
    expect(templates.map(t => t.title)).toEqual([FEATURE_TEMPLATES[0].title, FEATURE_TEMPLATES[1].title])
  })

  it('completes with a "nothing new" story when every template is used', () => {
    const everything = FEATURE_TEMPLATES.map((t, i) => makeFeature({ id: `f${i}`, title: t.title, status: 'completed' }))
    const s = started(makeState({ features: everything, featureRoadmap: [] }), 'research')
    const done = advanceHours(s, 36)
    expect(done.completed).toBe('research')
    expect(done.state.features).toHaveLength(everything.length)
    expect(done.state.storyLog[0].lines[0]).toMatch(/nothing new/i)
  })

  it('caps skills at 8', () => {
    const s = started(withFounder(makeState(), { skills: { research: 7.8, build: 4, outreach: 4, sales: 4 } }), 'research')
    expect(advanceHours(s, 36).state.v2.founder.skills.research).toBe(8)
  })
})

describe('develop outcome', () => {
  const base = withChapter(makeState({ features: [makeFeature()] }), { beat: 1 })

  function estFor(s: V2GameState) {
    const f = makeFeature()
    return estimateFeatureEffects(f.effects, f.value, 5, s.arpu, s.customers, s.difficultyModifier!.featureImpactMultiplier)
  }

  it('takes baseDays / 1.2 days (3 → 2.5 days = 60 hours) and mirrors progress onto the feature', () => {
    const s = started(base, 'develop', 'feat-test')
    const half = advanceHours(s, 30)
    expect(half.completed).toBeNull()
    expect(half.state.features[0].buildProgress).toBeCloseTo(0.5)
    expect(advanceHours(half.state, 30).completed).toBe('develop')
  })

  it('before the first sale, sends customer gains into leads', () => {
    const done = advanceHours(started(base, 'develop', 'feat-test'), 60).state
    const est = estFor(base)
    expect(est.customers).toBeGreaterThan(0)
    expect(done.v2.leads).toBe(est.customers)
    expect(done.customers).toBe(0)
    expect(done.features[0]).toMatchObject({ status: 'completed', buildProgress: 1 })
    expect(done.recentFeatureResults[0]).toMatchObject({ featureTitle: 'Test Feature', devName: 'You', customerGain: 0 })
    expect(done.v2.founder.skills.build).toBe(4.5)
    expect(done.storyLog[0].lines[0]).toMatch(/leads, not paying customers/)
  })

  it('after the first sale, adds real customers', () => {
    const s = withV2(base, { firstSaleDone: true })
    const done = advanceHours(started(s, 'develop', 'feat-test'), 60).state
    expect(done.customers).toBe(estFor(s).customers)
    expect(done.mrr).toBe(done.customers * done.arpu)
    expect(done.v2.leads).toBe(0)
  })

  it('never lets leads go negative on a feature that loses users', () => {
    const neg = withChapter(makeState({ features: [makeFeature({ effects: { customers: -15, arpu: 18 } })] }), { beat: 1 })
    const done = advanceHours(started(neg, 'develop', 'feat-test'), 120).state
    expect(done.v2.leads).toBe(0)
  })

  it('cancels with no outcome if the feature disappeared mid-build', () => {
    const s = started(base, 'develop', 'feat-test')
    const gone: V2GameState = { ...s, features: [] }
    const result = advanceHours(gone, 200)
    expect(result.completed).toBeNull()
    expect(result.state.v2.founder.task).toBeNull()
    expect(result.state.v2.founder.skills.build).toBe(4)
  })
})

describe('emails outcome', () => {
  const at2 = withChapter(makeState(), { beat: 2 }) // home brand = 10

  function emailsWith(state: V2GameState, r: number): V2GameState {
    let result: AdvanceResult = { state: started(state, 'emails'), completed: null }
    for (let i = 0; i < 48 && !result.completed; i++) result = advanceFounder(result.state, 1, seq(r))
    return result.state
  }

  it('adds round((4 + outreach + rng*4) * (1 + brand/100)) leads', () => {
    expect(emailsWith(at2, 0).v2.leads).toBe(9)     // (4+4+0)*1.1 = 8.8
    expect(emailsWith(at2, 0.5).v2.leads).toBe(11)  // (4+4+2)*1.1 = 11
    expect(emailsWith({ ...at2, brand: 0 }, 0).v2.leads).toBe(8)
  })

  it('grows outreach and completes in 2 days', () => {
    const done = emailsWith(at2, 0)
    expect(done.v2.founder.task).toBeNull()
    expect(done.v2.founder.skills.outreach).toBe(4.5)
  })
})

describe('sales outcome', () => {
  const ready = withV2(withChapter(makeState(), { beat: 3 }), { leads: 10 })

  function salesWith(state: V2GameState, r: number): V2GameState {
    let result: AdvanceResult = { state: started(state, 'sales'), completed: null }
    for (let i = 0; i < 48 && !result.completed; i++) result = advanceFounder(result.state, 1, seq(r))
    return result.state
  }

  it('converts each lead with p = 0.25 + 0.03*sales and consumes all contacted leads', () => {
    const done = salesWith(ready, 0.3) // 0.3 < 0.37 → every lead converts
    expect(done.customers).toBe(10)
    expect(done.v2.leads).toBe(0)
    expect(done.v2.firstSaleDone).toBe(true)
    expect(done.mrr).toBe(10 * done.arpu)
    expect(done.v2.founder.skills.sales).toBe(4.5)
  })

  it('guarantees at least one conversion on the first-ever sales run', () => {
    const done = salesWith(ready, 0.9)
    expect(done.customers).toBe(1)
    expect(done.v2.firstSaleDone).toBe(true)
  })

  it('has no guarantee after the first sale', () => {
    const done = salesWith(withV2(ready, { firstSaleDone: true }), 0.9)
    expect(done.customers).toBe(0)
    expect(done.v2.leads).toBe(0)
  })
})
