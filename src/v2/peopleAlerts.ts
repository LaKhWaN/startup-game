import { totalDays } from './engine/clock'
import { EXPECTED_RAISE } from './payroll'
import { addStory, type PeopleAlert, type TeamMember, type V2GameState } from './state'
import { convinceToStay } from './team'

export type AlertChoice = 'convince' | 'letGo' | 'timeOff' | 'raise' | 'ignore' | 'topUp' | 'keep'

/** Days of rest "Give them time off" buys, and the stress it takes away. */
export const TIME_OFF_DAYS = 2
export const TIME_OFF_STRESS = 30

/** The next alert for someone still on the team, or null. */
export function currentAlert(s: Pick<V2GameState, 'v2'>): PeopleAlert | null {
  return (s.v2.alerts ?? []).find(a => !!s.v2.team[a.memberId]) ?? null
}

function withMember(s: V2GameState, m: TeamMember): V2GameState {
  return { ...s, v2: { ...s.v2, team: { ...s.v2.team, [m.id]: m } } }
}

/** Apply the founder's answer to the current alert and take it off the queue. */
export function resolveAlert(state: V2GameState, choice: AlertChoice): V2GameState {
  const alert = currentAlert(state)
  if (!alert) return state
  const rest = (state.v2.alerts ?? []).filter(a => a !== alert && !!state.v2.team[a.memberId])
  let s: V2GameState = { ...state, v2: { ...state.v2, alerts: rest } }
  const m = s.v2.team[alert.memberId]
  switch (choice) {
    case 'convince':
      return convinceToStay(s, m.id)
    case 'timeOff': {
      s = withMember(s, { ...m, stress: Math.max(0, (m.stress ?? 10) - TIME_OFF_STRESS), energy: 100, offUntilDay: totalDays(s.gameTime) + TIME_OFF_DAYS })
      return addStory(s, [`🏖️ ${m.name} is taking ${TIME_OFF_DAYS} days off to recharge.`])
    }
    case 'raise': {
      const salary = Math.round(m.salary * 1.1)
      s = withMember(s, { ...m, salary, morale: Math.min(100, (m.morale ?? 70) + 10), payMood: Math.min(16, (m.payMood ?? 0) + 8) })
      return addStory(s, [`💸 ${m.name} got a 10% raise to $${salary.toLocaleString()}/mo.`])
    }
    case 'topUp': {
      const raise = alert.raise ?? EXPECTED_RAISE
      const salary = Math.round((m.salary / (1 + raise / 100)) * (1 + EXPECTED_RAISE / 100))
      s = withMember(s, { ...m, salary, payMood: 0 })
      return addStory(s, [`💸 You topped ${m.name}'s raise up to ${EXPECTED_RAISE}% ($${salary.toLocaleString()}/mo).`])
    }
    default:
      return s
  }
}
