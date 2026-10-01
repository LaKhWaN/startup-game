import { addStory, type TeamMember } from '../state'
import { isNight } from './clock'
import { departMember } from './events'
import type { GameV2 } from './types'
import { perkEffects } from '../shop'

/** Spec §5. All values 0–100. */
export const BURNOUT_STRESS = 90
export const BURNOUT_DAYS = 3
export const NOTICE_DAYS = 5

const clamp = (n: number) => Math.max(0, Math.min(100, n))

export interface Mood { energy: number; stress: number; morale: number; context: number }

export const FRESH_MOOD: Mood = { energy: 100, stress: 10, morale: 70, context: 0 }

/** Older saves / fixtures without mood fields. */
export const moodOf = (m: Partial<Mood>): Mood => ({ ...FRESH_MOOD, ...Object.fromEntries(Object.entries(m).filter(([, v]) => typeof v === 'number')) })

/** Work speed multiplier: rested, happy, experienced people are faster. */
export function workFactor(m: Partial<Mood>): number {
  const { energy, morale, context } = moodOf(m)
  return (0.55 + 0.45 * energy / 100) * (0.8 + 0.4 * morale / 100) * (0.7 + 0.5 * context / 100)
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

/** One hour for the hires. Only work hours matter (they're home otherwise). */
export function peopleHour<T extends GameV2>(state: T, workHour: boolean): T {
  if (!workHour || Object.keys(state.v2.team).length === 0) return state
  const perks = perkEffects(state)
  const team: Record<string, TeamMember> = {}
  for (const m of Object.values(state.v2.team)) {
    const mood = moodOf(m)
    const busy = !!m.task
    const empty = mood.energy < 30 ? 1 : 0
    team[m.id] = {
      ...m,
      energy: clamp(mood.energy - (busy ? 7 * perks.energyDrain : 1)),
      stress: clamp(mood.stress + (busy ? 0.45 : -1 * perks.idleStressRelief) + empty - perks.workStressRelief),
      context: clamp(mood.context + (busy ? 0.25 : 0)),
    }
  }
  return withTeam(state, team) as T
}

/** The founder sleeps 23:00–07:00 unless they chose to work late. */
export const SLEEP_START = 23
export const SLEEP_END = 7

export function founderAwake(founder: { workLate?: boolean }, hourOfDay: number): boolean {
  return !!founder.workLate || (hourOfDay >= SLEEP_END && hourOfDay < SLEEP_START)
}

/** One hour for the founder: working drains, sleeping restores, idle waking hours recover a little. */
export function founderHour<T extends GameV2>(state: T, hourOfDay: number): T {
  const f = state.v2.founder
  const energy = f.energy ?? 100
  const awake = founderAwake(f, hourOfDay)
  const next = !awake ? energy + 15 : f.task ? energy - 3 : isNight(hourOfDay) ? energy + 15 : energy + 3
  return { ...state, v2: { ...state.v2, founder: { ...f, energy: clamp(next) } } }
}

/** Once per day: overnight/weekend recovery, morale drift, burnout → notice → leaving. */
/**
 * `restDay`: the day starting now is a weekend (full rest). `endedOnWeekend`: the day that just ended
 * was a weekend (it doesn't count toward burnout).
 */
export function peopleDay<T extends GameV2>(state: T, day: number, restDay: boolean, endedOnWeekend: boolean = restDay): T {
  let s: GameV2 = state
  const perks = perkEffects(state)
  const lines: string[] = []
  const team: Record<string, TeamMember> = {}
  for (const m of Object.values(state.v2.team)) {
    if (m.leavingOn !== undefined && day >= m.leavingOn) continue // handled below
    const mood = moodOf(m)
    const burnoutDays = endedOnWeekend ? (m.burnoutDays ?? 0) : mood.stress >= BURNOUT_STRESS ? (m.burnoutDays ?? 0) + 1 : 0
    let leavingOn = m.leavingOn
    if (leavingOn === undefined && burnoutDays >= BURNOUT_DAYS) {
      leavingOn = day + NOTICE_DAYS
      lines.push(`😫 ${m.name} is burnt out and handed in their notice. They leave on day ${leavingOn + 1} unless you convince them to stay.`)
    }
    const stress = clamp(mood.stress - 1 - (restDay ? 4 : 0))
    team[m.id] = {
      ...m,
      energy: restDay ? 100 : clamp(mood.energy + 45 + perks.overnightEnergy),
      stress,
      morale: clamp(mood.morale + (75 + perks.moraleBonus - stress / 2 - mood.morale) * 0.1),
      context: mood.context,
      burnoutDays,
      leavingOn,
    }
  }
  const leaving = Object.values(state.v2.team).filter(m => m.leavingOn !== undefined && day >= m.leavingOn)
  s = withTeam(s, { ...team, ...Object.fromEntries(leaving.map(m => [m.id, m])) })
  for (const m of leaving) {
    s = departMember(s, m.id)
    lines.push(`👋 ${m.name} left the company. Their experience left with them.`)
  }
  return (lines.length > 0 ? addStory(s, lines) : s) as T
}
