import { describe, expect, it } from 'vitest'
import { FEATURE_TEMPLATES } from '../../data/featureTemplates'
import { FOUNDER_ID, startTask } from '../founder'
import type { InternCandidate, V2GameState } from '../state'
import {
  advanceTeam, canHire, chooseNextTask, fireMember, generateInternCandidates, HOME_CAPACITY,
  hireIntern, INTERN_MODELS, setAssignment,
} from '../team'
import { makeFeature, makeState, seq, withChapter, withV2 } from './fixtures'

function candidate(over: Partial<InternCandidate> = {}): InternCandidate {
  return {
    id: 'cand-1', name: 'Priya Patel', gender: 'female', role: 'marketing', tier: 'intern',
    skills: { research: 1, build: 1, outreach: 3, sales: 1 }, salary: 800,
    bio: 'Writes great subject lines.', characterModel: 'character-female-b', ...over,
  }
}

function withCandidates(s: V2GameState, ...c: InternCandidate[]): V2GameState {
  return withV2(s, { candidates: c })
}

function hired(s: V2GameState, c: InternCandidate): V2GameState {
  return hireIntern(withCandidates(s, c), c.id)
}

const ready = () => withChapter(makeState({ cash: 2000 }), { beat: 5, complete: true })

describe('generateInternCandidates', () => {
  it('makes intern candidates with main skill 3, others 1, salary $600–$1,000', () => {
    const cands = generateInternCandidates(seq(0.1, 0.5, 0.9), 3)
    expect(cands).toHaveLength(3)
    for (const c of cands) {
      const values = Object.values(c.skills).sort()
      expect(values).toEqual([1, 1, 1, 3])
      expect(c.salary).toBeGreaterThanOrEqual(600)
      expect(c.salary).toBeLessThanOrEqual(1000)
      expect(INTERN_MODELS[c.gender]).toContain(c.characterModel)
    }
  })
})

describe('hiring', () => {
  it('blocks when the room is full or the first month is unaffordable', () => {
    let s = ready()
    expect(canHire(withCandidates(s, candidate()), 'cand-1')).toBe('ok')
    expect(canHire(withCandidates({ ...s, cash: 799 }, candidate()), 'cand-1')).toBe('cash')
    expect(canHire(s, 'nope')).toBe('missing')
    for (let i = 0; i < HOME_CAPACITY; i++) s = hired(s, candidate({ id: `c${i}` }))
    expect(canHire(withCandidates(s, candidate({ id: 'c9' })), 'c9')).toBe('full')
  })

  it('adds a team member and takes the lowest free seat', () => {
    const s = hired(ready(), candidate())
    const m = s.v2.team['cand-1']
    expect(m).toMatchObject({ tier: 'intern', role: 'marketing', assignment: 'emails', seat: 0, salary: 800, mistakes: 0 })
    expect(s.v2.candidates).toHaveLength(0)
    expect(s.v2.chapter2.beat).toBe(1)
    expect(hired(s, candidate({ id: 'cand-2' })).v2.team['cand-2'].seat).toBe(1)
  })

  it('reuses a freed seat', () => {
    let s = hired(ready(), candidate({ id: 'a' }))
    s = hired(s, candidate({ id: 'b' }))
    s = fireMember(s, 'a')
    expect(hired(s, candidate({ id: 'c' })).v2.team['c'].seat).toBe(0)
  })
})

describe('firing', () => {
  it('frees the feature being built and removes payroll', () => {
    let s = hired(withV2(ready(), { firstSaleDone: true }), candidate({ role: 'developer', skills: { research: 1, build: 3, outreach: 1, sales: 1 } }))
    s = { ...s, features: [makeFeature()] }
    s = advanceTeam(s, 1, seq(0.5)).state // starts building
    expect(s.features[0].status).toBe('in_development')
    s = fireMember(s, 'cand-1')
    expect(s.features[0]).toMatchObject({ status: 'proposed', buildProgress: 0 })
    expect(s.v2.team['cand-1']).toBeUndefined()
  })
})

describe('standing assignment', () => {
  it('develop picks the first proposed feature nobody is building', () => {
    let s = ready()
    s = { ...s, features: [makeFeature({ id: 'f1' }), makeFeature({ id: 'f2', title: 'Second' })] }
    s = withChapter(s, { beat: 5, complete: true })
    const founder = startTask(s, 'develop', 'f1')
    if (!founder.ok) throw new Error(founder.reason)
    s = hired(founder.state, candidate({ role: 'developer', skills: { research: 1, build: 3, outreach: 1, sales: 1 } }))
    expect(chooseNextTask(s.v2.team['cand-1'], s)).toEqual({ type: 'develop', featureId: 'f2', progress: 0 })
  })

  it('sales waits for leads; research goes idle when there is nothing left; idle does nothing', () => {
    const s = hired(ready(), candidate({ role: 'sales', skills: { research: 1, build: 1, outreach: 1, sales: 3 } }))
    const m = s.v2.team['cand-1']
    expect(chooseNextTask(m, s)).toBeNull()
    expect(chooseNextTask(m, withV2(s, { leads: 2 }))).toEqual({ type: 'sales', progress: 0 })
    const allUsed = FEATURE_TEMPLATES.map((t, i) => makeFeature({ id: `t${i}`, title: t.title, status: 'completed' }))
    const exhausted = { ...s, featureRoadmap: [], features: allUsed }
    expect(chooseNextTask({ ...m, assignment: 'research' }, exhausted)).toBeNull()
    expect(chooseNextTask({ ...m, assignment: 'idle' }, s)).toBeNull()
  })

  it('repeats emails without the founder, at 0.7× speed', () => {
    let s = hired(ready(), candidate())
    // 0.75 days / (0.8 speed × 0.756 fresh-hire mood) ≈ 29.8 hours per emails run
    let completions = 0
    for (let h = 0; h < 30 * 3; h++) {
      const r = advanceTeam(s, 1, seq(0.99)) // 0.99 → no mistakes
      s = r.state
      completions += r.completedBy.length
    }
    expect(completions).toBe(3)
    expect(s.v2.leads).toBeGreaterThan(0)
    expect(s.v2.team['cand-1'].skills.outreach).toBe(3.75)
  })

  it('caps intern skills at 6 and counts mistakes', () => {
    let s = hired(ready(), candidate({ skills: { research: 1, build: 1, outreach: 5.9, sales: 1 } }))
    for (let h = 0; h < 40; h++) s = advanceTeam(s, 1, seq(0.0)).state // 0.0 → mistake every time
    const m = s.v2.team['cand-1']
    expect(m.skills.outreach).toBe(6)
    expect(m.mistakes).toBe(1)
  })

  it('changing the assignment cancels the current task and frees its feature', () => {
    let s = hired(withV2(ready(), { firstSaleDone: true }), candidate({ role: 'developer', skills: { research: 1, build: 3, outreach: 1, sales: 1 } }))
    s = { ...s, features: [makeFeature()] }
    s = advanceTeam(s, 1, seq(0.5)).state
    s = setAssignment(s, 'cand-1', 'emails')
    expect(s.v2.team['cand-1'].task).toBeNull()
    expect(s.features[0].status).toBe('proposed')
  })
})

describe('feature ownership', () => {
  it('a departing hire frees their feature', async () => {
    const { departMember } = await import('../engine/events')
    let s = hired(withV2(ready(), { firstSaleDone: true }), candidate({ role: 'developer', skills: { research: 1, build: 3, outreach: 1, sales: 1 } }))
    s = { ...s, features: [makeFeature()] }
    s = advanceTeam(s, 1, seq(0.5)).state
    s = departMember(s, 'cand-1')
    expect(s.v2.team['cand-1']).toBeUndefined()
    expect(s.features[0].status).toBe('proposed')
  })

  it('founder and an intern building never share a feature', () => {
    const s = hired(withV2(ready(), { firstSaleDone: true }), candidate({ role: 'developer', skills: { research: 1, build: 3, outreach: 1, sales: 1 } }))
    const one = { ...s, features: [makeFeature({ status: 'in_development', assignedToDevId: FOUNDER_ID })] }
    expect(chooseNextTask(one.v2.team['cand-1'], one)).toBeNull()
  })
})
