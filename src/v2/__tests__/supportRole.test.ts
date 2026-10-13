import { describe, expect, it } from 'vitest'
import { generateCandidates, hireIntern } from '../team'
import { hireSpeed, MAIN_TASK, mainSkillOf } from '../work'
import { seq, makeState, withChapter, withV2 } from './fixtures'

describe('support role', () => {
  it('support hires answer tickets as their main job (outreach skill)', () => {
    expect(MAIN_TASK.support).toBe('support')
    expect(mainSkillOf('support')).toBe('outreach')
    expect(hireSpeed('support', 'support', 'intern')).toBe(0.8)
    expect(hireSpeed('support', 'emails', 'intern')).toBe(0.4)
  })

  it('shows up among intern and full-time candidates', () => {
    // The role pick is the first rng draw per candidate: 0.9 → last role in the list.
    const pool = generateCandidates(seq(0.95, 0.5), { fullTime: true })
    expect(pool.some(c => c.role === 'support' && c.tier === 'intern')).toBe(true)
    expect(pool.some(c => c.role === 'support' && c.tier === 'fulltime')).toBe(true)
  })

  it('a hired support person starts on Support', () => {
    const s0 = withChapter(makeState({ cash: 5000 }), { complete: true, beat: 5 })
    const c = { ...generateCandidates(seq(0.95, 0.5), { fullTime: false })[0], id: 'sp' }
    const s = hireIntern(withV2(s0, { candidates: [c] }), 'sp')
    expect(s.v2.team.sp).toMatchObject({ role: 'support', assignment: 'support' })
    expect(s.v2.team.sp.bio).toBeTruthy()
  })
})
