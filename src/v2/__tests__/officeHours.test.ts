import { describe, expect, it } from 'vitest'
import { stepV2 } from '../v2Tick'
import { HOURS_PER_DAY } from '../engine/clock'
import { WORK_DAY_HOURS } from '../work'
import type { V2GameState } from '../state'
import { makeState, member, withChapter, withTeam, withV2 } from './fixtures'

const at = (s: V2GameState, day: number, hour: number): V2GameState => ({ ...s, gameTime: { totalHours: day * HOURS_PER_DAY + hour } })

function emailsHire(): V2GameState {
  const s = withChapter(makeState({ cash: 100_000 }), { beat: 5, complete: true })
  return withTeam(s, member({ id: 'h', role: 'marketing', assignment: 'emails', skills: { research: 1, build: 1, outreach: 3, sales: 1 }, task: { type: 'emails', progress: 0 } }))
}

function run(s: V2GameState, hours: number): V2GameState {
  for (let i = 0; i < hours; i++) s = stepV2(s, () => 0.99)
  return s
}

describe('the office never closes', () => {
  it('hires work at night and on weekends too', () => {
    expect(run(at(emailsHire(), 0, 20), 4).v2.team.h.task!.progress).toBeGreaterThan(0)
    expect(run(at(emailsHire(), 5, 2), 4).v2.team.h.task!.progress).toBeGreaterThan(0)
  })

  it('counts hire durations in whole game days', () => {
    expect(WORK_DAY_HOURS).toBe(24)
    // Emails: 0.75/0.8 days = 22.5 hours at full mood; a fresh hire is slower (mood, no context).
    const s = run(at(emailsHire(), 0, 9), 12)
    const full = 12 / (24 * (0.75 / 0.8))
    expect(s.v2.team.h.task!.progress).toBeLessThan(full)
    expect(s.v2.team.h.task!.progress).toBeGreaterThan(full * 0.5)
  })

  it('the founder works while awake', () => {
    const s = withV2(at(makeState(), 0, 20), { founder: { ...makeState().v2.founder, task: { type: 'research', progress: 0 } } })
    expect(run(s, 2).v2.founder.task!.progress).toBeGreaterThan(0)
  })
})
