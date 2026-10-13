import { describe, expect, it } from 'vitest'
import { advanceTeam } from '../team'
import { LOW_MORALE, peopleDay, peopleHour } from '../engine/people'
import { REVIEW_DAYS } from '../payroll'
import { currentAlert, resolveAlert } from '../peopleAlerts'
import { makeState, member, withTeam, withV2 } from './fixtures'

const one = (over: Parameters<typeof member>[0] = {}) => withTeam(makeState(), member(over))

describe('people alerts', () => {
  it('handing in notice raises a notice alert', () => {
    let s = one({ stress: 99 })
    for (let d = 1; d <= 3; d++) s = peopleDay({ ...s, v2: { ...s.v2, team: { m1: { ...s.v2.team.m1, stress: 99 } } } }, d)
    expect(s.v2.team.m1.leavingOn).toBeDefined()
    expect(s.v2.alerts?.some(a => a.kind === 'notice' && a.memberId === 'm1')).toBe(true)
  })

  it('warns once before someone quits: high stress or low morale', () => {
    let s = peopleDay(one({ stress: 85 }), 1)
    expect(currentAlert(s)).toMatchObject({ kind: 'atRisk', memberId: 'm1', reason: 'stress' })
    s = peopleDay(s, 2)
    expect(s.v2.alerts!.filter(a => a.kind === 'atRisk')).toHaveLength(1)
    let sad = one({ morale: LOW_MORALE - 10, stress: 20 })
    for (let d = 1; d <= 2; d++) sad = peopleDay(sad, d)
    expect(currentAlert(sad)).toMatchObject({ kind: 'atRisk', reason: 'morale' })
  })

  it('a raise below expectations asks whether to top it up', () => {
    const s = peopleDay(withV2(one({ salary: 1000, hiredAtDay: 0 }), { raisePct: 3 }), REVIEW_DAYS)
    expect(currentAlert(s)).toMatchObject({ kind: 'lowRaise', memberId: 'm1', raise: 3 })
    const topped = resolveAlert(s, 'topUp')
    expect(topped.v2.team.m1.salary).toBe(1080)
    expect(topped.v2.team.m1.payMood).toBe(0)
    expect(currentAlert(topped)).toBeNull()
  })

  it('notice: convince them to stay, or let them go', () => {
    const s = withV2(one({ salary: 1000, leavingOn: 9 }), { alerts: [{ kind: 'notice', memberId: 'm1', reason: 'stress' }] })
    expect(resolveAlert(s, 'convince').v2.team.m1.leavingOn).toBeUndefined()
    expect(resolveAlert(s, 'letGo').v2.team.m1.leavingOn).toBe(9)
    expect(currentAlert(resolveAlert(s, 'letGo'))).toBeNull()
  })

  it('at risk: time off calms them and pauses their work for 2 days; a raise lifts morale', () => {
    const s = withV2({ ...one({ stress: 85, energy: 30, morale: 40, salary: 1000, task: { type: 'emails', progress: 0.2 } }), gameTime: { totalHours: 24 * 10 } }, { alerts: [{ kind: 'atRisk', memberId: 'm1', reason: 'stress' }] })
    const off = resolveAlert(s, 'timeOff')
    expect(off.v2.team.m1).toMatchObject({ stress: 55, energy: 100, offUntilDay: 12 })
    expect(advanceTeam(off, 5, () => 0.99).state.v2.team.m1.task!.progress).toBeCloseTo(0.2)
    expect(peopleHour(off).v2.team.m1.stress!).toBeLessThan(55)
    const raised = resolveAlert(s, 'raise')
    expect(raised.v2.team.m1.salary).toBe(1100)
    expect(raised.v2.team.m1.morale).toBe(50)
  })

  it('drops alerts for people who already left', () => {
    const s = withV2(makeState(), { alerts: [{ kind: 'atRisk', memberId: 'gone', reason: 'stress' }] })
    expect(currentAlert(s)).toBeNull()
  })
})
