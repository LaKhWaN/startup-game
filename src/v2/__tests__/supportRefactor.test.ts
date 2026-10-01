import { describe, expect, it } from 'vitest'
import { isTaskUnlocked } from '../chapter'
import { applyOutcome, startTask, taskDurationDays } from '../founder'
import { taskReason } from '../founderTasks'
import { chooseNextTask } from '../team'
import { makeFeature, makeState, member, withChapter, withV2 } from './fixtures'

const w = { id: 'h', name: 'Sam', skills: { research: 3, build: 4, outreach: 4, sales: 3 } }
const ok = { mistake: false, firstSaleGuarantee: false }
const bad = { mistake: true, firstSaleGuarantee: false }
const ready = () => withChapter(makeState(), { beat: 5, complete: true })

describe('support', () => {
  it('clears 8 + 2 × outreach tickets (half on a mistake)', () => {
    const s = withV2(makeState(), { tickets: 40 })
    expect(applyOutcome(s, w, { type: 'support', progress: 1 }, () => 0.5, ok)!.v2.tickets).toBe(40 - 16)
    expect(applyOutcome(s, w, { type: 'support', progress: 1 }, () => 0.5, bad)!.v2.tickets).toBe(40 - 8)
    expect(applyOutcome(withV2(makeState(), { tickets: 3 }), w, { type: 'support', progress: 1 }, () => 0.5, ok)!.v2.tickets).toBe(0)
  })
  it('takes half a founder day', () => {
    expect(taskDurationDays(makeState(), 'support')).toBe(0.5)
  })
})

describe('refactor', () => {
  it('pays down 12 + 2 × build debt (half on a mistake), never below 0', () => {
    const s = makeState({ techDebt: 50 })
    expect(applyOutcome(s, w, { type: 'refactor', progress: 1 }, () => 0.5, ok)!.techDebt).toBe(30)
    expect(applyOutcome(s, w, { type: 'refactor', progress: 1 }, () => 0.5, bad)!.techDebt).toBe(40)
    expect(applyOutcome(makeState({ techDebt: 5 }), w, { type: 'refactor', progress: 1 }, () => 0.5, ok)!.techDebt).toBe(0)
  })
  it('takes one founder day', () => {
    expect(taskDurationDays(makeState(), 'refactor')).toBe(1)
  })
})

describe('tech debt slows builds', () => {
  it('build time × (1 + debt/100)', () => {
    const f = makeFeature({ baseDays: 3 })
    const clean = taskDurationDays({ features: [f], techDebt: 0 }, 'develop', f.id)
    expect(taskDurationDays({ features: [f], techDebt: 50 }, 'develop', f.id)).toBeCloseTo(clean * 1.5)
  })
})

describe('unlocks and starting', () => {
  it('support and refactor unlock with Chapter 1', () => {
    expect(isTaskUnlocked(makeState(), 'support')).toBe(false)
    expect(isTaskUnlocked(ready(), 'support')).toBe(true)
    expect(isTaskUnlocked(ready(), 'refactor')).toBe(true)
  })
  it('need something to do', () => {
    expect(startTask(ready(), 'support').ok).toBe(false)
    expect(taskReason(ready().v2, 'support', ready())).toMatch(/No support tickets/)
    expect(startTask(withV2(ready(), { tickets: 2 }), 'support').ok).toBe(true)
    expect(startTask({ ...ready(), techDebt: 0 }, 'refactor').ok).toBe(false)
    expect(startTask({ ...ready(), techDebt: 10 }, 'refactor').ok).toBe(true)
  })
})

describe('standing assignments', () => {
  it('support runs while tickets wait; refactor while debt ≥ 5', () => {
    const m = member({ assignment: 'support' })
    expect(chooseNextTask(m, ready())).toBeNull()
    expect(chooseNextTask(m, withV2(ready(), { tickets: 1 }))).toEqual({ type: 'support', progress: 0 })
    const r = member({ assignment: 'refactor' })
    expect(chooseNextTask(r, { ...ready(), techDebt: 4 })).toBeNull()
    expect(chooseNextTask(r, { ...ready(), techDebt: 5 })).toEqual({ type: 'refactor', progress: 0 })
  })
})
