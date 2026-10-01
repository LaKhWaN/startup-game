import { describe, expect, it } from 'vitest'
import { skipToMorning, stepV2 } from '../v2Tick'
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

describe('office hours', () => {
  it('hires only work 09:00–17:00 on weekdays', () => {
    const night = run(at(emailsHire(), 0, 18), 10) // Mon 18:00 → Tue 04:00
    expect(night.v2.team.h.task?.progress).toBe(0)
    const day = run(at(emailsHire(), 0, 9), 4)
    expect(day.v2.team.h.task!.progress).toBeGreaterThan(0)
  })

  it('a task paused at 17:00 resumes at 09:00 with nothing lost', () => {
    const s = run(at(emailsHire(), 0, 13), 4) // 13–17: 4 work hours
    const at17 = s.v2.team.h.task!.progress
    const overnight = run(s, 16) // 17:00 → 09:00
    expect(overnight.v2.team.h.task!.progress).toBeCloseTo(at17)
    const next = run(overnight, 1)
    expect(next.v2.team.h.task!.progress).toBeGreaterThan(at17)
  })

  it('counts hire durations in work days of 8 hours', () => {
    expect(WORK_DAY_HOURS).toBe(8)
    // Emails: 2/0.7 work days ≈ 22.9 work hours at full mood; a fresh hire is slower (mood, no context)
    const s = run(at(emailsHire(), 0, 9), 8)
    const full = 8 / (8 * (2 / 0.7))
    expect(s.v2.team.h.task!.progress).toBeLessThan(full)
    expect(s.v2.team.h.task!.progress).toBeGreaterThan(full * 0.5)
  })

  it('weekends are off', () => {
    const sat = run(at(emailsHire(), 5, 9), 8)
    expect(sat.v2.team.h.task?.progress).toBe(0)
  })

  it('the founder works any hour', () => {
    const s = withV2(at(makeState(), 0, 22), { founder: { ...makeState().v2.founder, task: { type: 'research', progress: 0 } } })
    expect(run(s, 3).v2.founder.task!.progress).toBeGreaterThan(0)
  })
})

describe('skipToMorning', () => {
  it('jumps to 09:00 on the next work day, running the days in between', () => {
    const s = skipToMorning(at(emailsHire(), 4, 18), () => 0.99) // Friday 18:00
    expect(s.gameTime.totalHours).toBe(7 * 24 + 9) // Monday 09:00
    expect(s.metricsHistory[s.metricsHistory.length - 1].day).toBe(7)
  })

  it('stops early when an event pops up', () => {
    const s = skipToMorning(at(emailsHire(), 0, 18), () => 0.99, () => true)
    expect(s.gameTime.totalHours).toBeLessThan(24 + 9)
  })

  it('does nothing during work hours', () => {
    const s = at(emailsHire(), 1, 10)
    expect(skipToMorning(s, () => 0.99)).toBe(s)
  })
})

describe('skipToMorning (review fixes)', () => {
  it('stops on a real event and on the family-money popup', async () => {
    const { EVENTS } = await import('../engine/eventData')
    const withEvent = skipToMorning(at(emailsHire(), 0, 18), () => 0.99, s => s.gameTime.totalHours === 20 ? true : false)
    expect(withEvent.gameTime.totalHours).toBe(20)
    const pending = at({ ...emailsHire(), pendingEvent: EVENTS[0] }, 0, 18)
    expect(skipToMorning(pending, () => 0.99).gameTime.totalHours).toBe(18)
  })

  it('reports every day boundary it crosses (analytics), and runs month ends', () => {
    const days: number[] = []
    const s = skipToMorning(at(emailsHire(), 29, 18), () => 0.99, undefined, d => days.push(d.metricsHistory[d.metricsHistory.length - 1].day))
    expect(days).toEqual([30])
    expect(s.storyLog.some(e => e.lines[0].startsWith('Month 1:'))).toBe(true)
  })
})
