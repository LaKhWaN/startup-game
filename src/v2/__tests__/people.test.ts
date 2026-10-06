import { describe, expect, it } from 'vitest'
import { BUSY_STRESS_PER_HOUR, DAILY_ENERGY_RECOVERY, DAILY_STRESS_RECOVERY, EMPTY_STRESS_PER_HOUR, HOUR_SHARE, MORALE_BASE,
  BURNOUT_DAYS, founderHour, founderSpeed, mistakeFactor, NOTICE_DAYS, peopleDay, peopleHour, workFactor,
} from '../engine/people'
import { convinceToStay } from '../team'
import { makeState, member, withChapter, withTeam, withV2 } from './fixtures'

const busy = member({ id: 'b', task: { type: 'emails', progress: 0.1 } })
const idle = member({ id: 'i', task: null })
const team = (...ms: ReturnType<typeof member>[]) => withTeam(makeState(), ...ms)

describe('peopleHour (every hour: the office never closes)', () => {
  it('busy hours drain energy, add stress and context; idle hours recover stress', () => {
    const s = peopleHour(team({ ...busy, energy: 100, stress: 10, context: 0 }, { ...idle, energy: 100, stress: 10 }))
    expect(s.v2.team.b.energy).toBeCloseTo(100 - 7 * HOUR_SHARE)
    expect(s.v2.team.b.context).toBeCloseTo(0.25 * HOUR_SHARE)
    expect(s.v2.team.b.stress).toBeCloseTo(10 + BUSY_STRESS_PER_HOUR)
    expect(s.v2.team.i.energy).toBeCloseTo(100 - HOUR_SHARE)
    expect(s.v2.team.i.stress).toBeCloseTo(10 - HOUR_SHARE)
  })

  it('running on empty adds stress', () => {
    const s = peopleHour(team({ ...busy, energy: 20, stress: 10 }))
    expect(s.v2.team.b.stress).toBeCloseTo(10 + BUSY_STRESS_PER_HOUR + EMPTY_STRESS_PER_HOUR)
  })
})

describe('peopleDay', () => {
  it('daily: energy and stress recover; morale drifts toward the base − stress/2', () => {
    const s = peopleDay(team({ ...busy, energy: 40, stress: 40, morale: 70 }), 1)
    expect(s.v2.team.b.energy).toBe(40 + DAILY_ENERGY_RECOVERY)
    expect(s.v2.team.b.stress).toBe(40 - DAILY_STRESS_RECOVERY)
    expect(s.v2.team.b.morale).toBeCloseTo(70 + (MORALE_BASE - (40 - DAILY_STRESS_RECOVERY) / 2 - 70) * 0.1)
  })

  it(`stress ≥ 90 for ${BURNOUT_DAYS} days → notice, then they leave after ${NOTICE_DAYS} days`, () => {
    let s = team({ ...busy, stress: 99 })
    for (let d = 1; d <= BURNOUT_DAYS; d++) s = peopleDay({ ...s, v2: { ...s.v2, team: { b: { ...s.v2.team.b, stress: 99 } } } }, d)
    expect(s.v2.team.b.leavingOn).toBe(BURNOUT_DAYS + NOTICE_DAYS)
    expect(s.storyLog[0].lines.join(' ')).toMatch(/notice/i)
    s = peopleDay(s, BURNOUT_DAYS + NOTICE_DAYS)
    expect(s.v2.team.b).toBeUndefined()
  })

  it('"Convince them to stay": +20% salary, stress 40, notice withdrawn, once', () => {
    const s = team({ ...busy, salary: 1000, stress: 95, leavingOn: 9 })
    const kept = convinceToStay(s, 'b')
    expect(kept.v2.team.b).toMatchObject({ salary: 1200, stress: 40, leavingOn: undefined, convinced: true })
    expect(convinceToStay({ ...kept, v2: { ...kept.v2, team: { b: { ...kept.v2.team.b, leavingOn: 12 } } } }, 'b').v2.team.b.leavingOn).toBe(12)
  })
})

describe('effects', () => {
  it('tired, unhappy newcomers work slower than rested veterans', () => {
    expect(workFactor({ energy: 100, morale: 100, context: 100 })).toBeCloseTo(1 * 1.2 * 1.2)
    expect(workFactor({ energy: 0, morale: 0, context: 0 })).toBeCloseTo(0.55 * 0.8 * 0.7)
  })
  it('stress raises mistakes', () => {
    expect(mistakeFactor(0)).toBe(1)
    expect(mistakeFactor(100)).toBe(2)
  })
})

describe('founder energy', () => {
  const f = (task: boolean, energy: number) => withV2(withChapter(makeState(), { complete: true, beat: 5 }), {
    founder: { ...makeState().v2.founder, energy, task: task ? { type: 'research', progress: 0 } : null },
  })
  it('working drains, sleeping at night restores, idle days recover a little', () => {
    expect(founderHour(f(true, 50), 14).v2.founder.energy).toBe(47)
    expect(founderHour(f(false, 50), 23).v2.founder.energy).toBe(65)
    expect(founderHour(f(false, 50), 14).v2.founder.energy).toBe(53)
  })
  it('tired founders work at half speed at worst', () => {
    expect(founderSpeed(100)).toBe(1)
    expect(founderSpeed(0)).toBe(0.5)
  })
})

describe('founder sleep', () => {
  const withTask = (energy = 50) => withV2(withChapter(makeState(), { complete: true, beat: 5 }), {
    founder: { ...makeState().v2.founder, energy, task: { type: 'research', progress: 0 } },
  })
  it('sleeps 23:00–07:00, even mid-task', async () => {
    const { founderAwake } = await import('../engine/people')
    expect(founderAwake(23)).toBe(false)
    expect(founderAwake(6)).toBe(false)
    expect(founderAwake(7)).toBe(true)
    expect(founderHour(withTask(), 2).v2.founder.energy).toBe(65) // asleep: +15
  })
  it('a sleeping founder makes no progress', async () => {
    const { v2Tick } = await import('../v2Tick')
    const s = { ...withTask(), gameTime: { totalHours: 24 + 2 } }
    expect(v2Tick(s, 1, () => 0.99).v2.founder.task!.progress).toBe(0)
  })
})
