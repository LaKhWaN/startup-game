import { addStory, type PeopleAlert, type TeamMember } from '../state'
import { totalDays } from './clock'
import { isNight } from './clock'
import { departMember } from './events'
import type { GameV2 } from './types'
import { perkEffects } from '../shop'
import { applyReview, EXPECTED_RAISE, isReviewDay, raisePct } from '../payroll'

/** Spec §5. All values 0–100. */
export const BURNOUT_STRESS = 90
export const BURNOUT_DAYS = 3
export const NOTICE_DAYS = 5
/**
 * The office never closes: hires are in every hour, so hourly changes are a third of
 * what an 8-hour working day had (a day still adds up to the same).
 */
export const HOUR_SHARE = 8 / 24
/** Stress per busy hour (doubled in crunch mode), and per hour worked on an empty tank. */
export const BUSY_STRESS_PER_HOUR = 0.8 * HOUR_SHARE
export const EMPTY_STRESS_PER_HOUR = 1.5 * HOUR_SHARE
/** Daily recovery (there are no weekends off any more). */
export const DAILY_STRESS_RECOVERY = 5.5
export const DAILY_ENERGY_RECOVERY = 60
/** Morale drifts toward MORALE_BASE + perks + pay mood − stress/2. */
export const MORALE_BASE = 65
/** Unhappy people quit: morale under LOW_MORALE for LOW_MORALE_DAYS days in a row. */
export const LOW_MORALE = 35
export const LOW_MORALE_DAYS = 5
/** Everyone else's morale drop when a colleague leaves. */
export const LEAVE_MORALE_HIT = 3
export const MAX_LEAVE_HIT_PER_DAY = 6
/** Warn the founder (once) at this stress, or after this many low-morale days. */
export const RISK_STRESS = 80
export const RISK_MORALE_DAYS = 2
const MAX_ALERTS = 10

export const isOff = (m: Pick<TeamMember, 'offUntilDay'>, day: number) => (m.offUntilDay ?? -1) > day

/** Queue an alert unless the same one is already waiting. */
export function pushAlert(alerts: PeopleAlert[], a: PeopleAlert): PeopleAlert[] {
  if (alerts.some(x => x.kind === a.kind && x.memberId === a.memberId)) return alerts
  return [...alerts, a].slice(-MAX_ALERTS)
}

const clamp = (n: number) => Math.max(0, Math.min(100, n))

export interface Mood { energy: number; stress: number; morale: number; context: number }

export const FRESH_MOOD: Mood = { energy: 100, stress: 10, morale: 70, context: 0 }

/** Older saves / fixtures without mood fields. */
export const moodOf = (m: Partial<Mood>): Mood => ({ ...FRESH_MOOD, ...Object.fromEntries(Object.entries(m).filter(([, v]) => typeof v === 'number')) })

/** Work speed multiplier: rested, happy, experienced people are faster. */
export function workFactor(m: Partial<Mood>): number {
  const { energy, morale, context } = moodOf(m)
  // Morale matters: a team at 80 morale works ~25% faster than one at 50.
  return (0.55 + 0.45 * energy / 100) * (0.6 + 0.8 * morale / 100) * (0.7 + 0.5 * context / 100)
}

/** Mistake-chance multiplier: stressed people slip more. */
export function mistakeFactor(stress: number): number {
  return 1 + clamp(stress) / 100
}

export function founderSpeed(energy: number | undefined): number {
  return 0.5 + 0.5 * clamp(energy ?? 100) / 100
}

function withTeam(state: GameV2, team: Record<string, TeamMember>): GameV2 {
  return { ...state, v2: { ...state.v2, team } }
}

/** One hour for the hires. `crunch`: crunch mode is on (busy stress counts double). */
export function peopleHour<T extends GameV2>(state: T, crunch = false): T {
  if (Object.keys(state.v2.team).length === 0) return state
  const perks = perkEffects(state)
  const today = totalDays(state.gameTime)
  const team: Record<string, TeamMember> = {}
  for (const m of Object.values(state.v2.team)) {
    const mood = moodOf(m)
    const busy = !!m.task && !isOff(m, today)
    const empty = busy && mood.energy < 30 ? EMPTY_STRESS_PER_HOUR : 0
    team[m.id] = {
      ...m,
      energy: clamp(mood.energy - (busy ? 7 * perks.energyDrain : 1) * HOUR_SHARE),
      stress: clamp(mood.stress + (busy ? BUSY_STRESS_PER_HOUR * (crunch ? 2 : 1) : -1 * perks.idleStressRelief * HOUR_SHARE) + empty - perks.workStressRelief * HOUR_SHARE),
      context: clamp(mood.context + (busy ? 0.25 * HOUR_SHARE : 0)),
    }
  }
  return withTeam(state, team) as T
}

/** The founder sleeps 23:00–07:00. */
export const SLEEP_START = 23
export const SLEEP_END = 7

export function founderAwake(hourOfDay: number): boolean {
  return hourOfDay >= SLEEP_END && hourOfDay < SLEEP_START
}

/** One hour for the founder: working drains, sleeping restores, idle waking hours recover a little. */
export function founderHour<T extends GameV2>(state: T, hourOfDay: number): T {
  const f = state.v2.founder
  const energy = f.energy ?? 100
  const awake = founderAwake(hourOfDay)
  const next = !awake ? energy + 15 : f.task ? energy - 3 : isNight(hourOfDay) ? energy + 15 : energy + 3
  return { ...state, v2: { ...state.v2, founder: { ...f, energy: clamp(next) } } }
}

/** Once per day: daily recovery, morale drift, yearly reviews, burnout / unhappiness → notice → leaving. */
export function peopleDay<T extends GameV2>(state: T, day: number): T {
  let s: GameV2 = state
  const perks = perkEffects(state)
  const raise = raisePct(state)
  const lines: string[] = []
  let alerts = state.v2.alerts ?? []
  const team: Record<string, TeamMember> = {}
  const leaving = Object.values(state.v2.team).filter(m => m.leavingOn !== undefined && day >= m.leavingOn)
  // Capped so a bad week can't snowball into everyone leaving.
  const leaveHit = Math.min(MAX_LEAVE_HIT_PER_DAY, leaving.length * LEAVE_MORALE_HIT)
  for (const raw of Object.values(state.v2.team)) {
    if (raw.leavingOn !== undefined && day >= raw.leavingOn) continue // handled below
    let m = raw
    if (isReviewDay(m, day)) {
      m = applyReview(m, raise)
      if (raise < EXPECTED_RAISE) alerts = pushAlert(alerts, { kind: 'lowRaise', memberId: m.id, raise })
      lines.push(`💸 ${m.name}'s yearly review: ${raise}% raise to $${m.salary.toLocaleString()}/mo${(m.payMood ?? 0) < 0 ? ', less than they hoped' : (m.payMood ?? 0) > 0 ? '. They feel valued' : ''}.`)
    }
    const mood = moodOf(m)
    const burnoutDays = mood.stress >= BURNOUT_STRESS ? (m.burnoutDays ?? 0) + 1 : 0
    const lowMoraleDays = mood.morale < LOW_MORALE ? (m.lowMoraleDays ?? 0) + 1 : 0
    let leavingOn = m.leavingOn
    if (leavingOn === undefined && burnoutDays >= BURNOUT_DAYS) {
      leavingOn = day + NOTICE_DAYS
      lines.push(`😫 ${m.name} is burnt out and handed in their notice. They leave on day ${leavingOn + 1} unless you convince them to stay.`)
      alerts = pushAlert(alerts, { kind: 'notice', memberId: m.id, reason: 'stress' })
    } else if (leavingOn === undefined && lowMoraleDays >= LOW_MORALE_DAYS) {
      leavingOn = day + NOTICE_DAYS
      lines.push(`😞 ${m.name} is unhappy here and took another offer. They leave on day ${leavingOn + 1} unless you convince them to stay.`)
      alerts = pushAlert(alerts, { kind: 'notice', memberId: m.id, reason: 'morale' })
    }
    // A heads-up before it gets that far: once per rough patch.
    let riskWarned = m.riskWarned
    const risk = mood.stress >= RISK_STRESS ? 'stress' : lowMoraleDays >= RISK_MORALE_DAYS ? 'morale' : null
    if (leavingOn === undefined && !riskWarned && risk) {
      alerts = pushAlert(alerts, { kind: 'atRisk', memberId: m.id, reason: risk })
      riskWarned = true
    } else if (riskWarned && mood.stress < 60 && mood.morale >= 45) {
      riskWarned = false
    }
    const stress = clamp(mood.stress - DAILY_STRESS_RECOVERY)
    const target = MORALE_BASE + perks.moraleBonus + (m.payMood ?? 0) - stress / 2
    team[m.id] = {
      ...m,
      energy: clamp(mood.energy + DAILY_ENERGY_RECOVERY + perks.overnightEnergy),
      stress,
      morale: clamp(mood.morale + (target - mood.morale) * 0.1 - leaveHit),
      context: mood.context,
      burnoutDays,
      lowMoraleDays,
      leavingOn,
      riskWarned,
    }
  }
  s = withTeam(s, { ...team, ...Object.fromEntries(leaving.map(m => [m.id, m])) })
  s = { ...s, v2: { ...s.v2, alerts: alerts.filter(a => !leaving.some(m => m.id === a.memberId)) } }
  for (const m of leaving) {
    s = departMember(s, m.id)
    lines.push(`👋 ${m.name} left the company. Their experience left with them.`)
  }
  return (lines.length > 0 ? addStory(s, lines) : s) as T
}
