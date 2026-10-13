import type { Rng, TeamMember } from '../state'
import { mainSkillOf } from '../work'
import { totalDays } from './clock'
import { EVENTS, type EventDef, type EventEmployee, type EventPatch, type EventView } from './eventData'
import type { GameV2 } from './types'
import { churnBreakdown } from './churn'
import { releaseBuilder } from './builders'

const ACQUISITION_IDS = new Set(['acquisition-lowball', 'acquisition-premium'])
const ACQUISITION_MIN_MRR = 5000
const ACQUISITION_MIN_CUSTOMERS = 500
const ACQUISITION_SHOW_CHANCE = 0.2

function asEmployee(m: TeamMember): EventEmployee {
  return { id: m.id, name: m.name, role: m.role, salary: m.salary, level: Math.round(m.skills[mainSkillOf(m.role)]), morale: 70, stress: 20 }
}

/** What an event effect sees: the company plus the team as legacy-style employees. */
export function eventView(state: GameV2): EventView {
  return { ...state, employees: Object.values(state.v2.team).map(asEmployee) }
}

/**
 * Which choices the company can pay for: a choice that would take cash below zero is off
 * (unless both would, so the player is never stuck).
 */
export function affordableChoices(state: GameV2): [boolean, boolean] {
  const event = state.pendingEvent
  if (!event) return [true, true]
  const view = eventView(state)
  const ok = event.choices.map(c => { const cash = c.effect(view).cash; return cash === undefined || cash >= 0 }) as [boolean, boolean]
  return ok[0] || ok[1] ? ok : [true, true]
}

/** Ported legacy event picker: unused first, acquisitions only with real traction, crisis/opportunity weighting. */
export function pickEvent(state: GameV2, rng: Rng): EventDef | null {
  const eligible = state.mrr >= ACQUISITION_MIN_MRR && state.customers >= ACQUISITION_MIN_CUSTOMERS && rng() < ACQUISITION_SHOW_CHANCE
  const allowed = (e: EventDef) => !ACQUISITION_IDS.has(e.id) || eligible
  let pool = EVENTS.filter(e => !state.usedEventIds.includes(e.id) && allowed(e))
  if (pool.length === 0) pool = EVENTS.filter(e => !state.usedEventIds.slice(-5).includes(e.id) && allowed(e))
  if (pool.length === 0) pool = EVENTS.filter(allowed)
  if (pool.length === 0) return null
  const w = state.difficultyModifier?.eventWeighting
  if (w) {
    const r = rng()
    const cat = r < w.crisisWeight ? 'crisis' : r < w.crisisWeight + w.opportunityWeight ? 'opportunity' : 'market'
    const inCat = pool.filter(e => e.category === cat)
    if (inCat.length > 0) pool = inCat
  }
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]
}

function freeFeatureOf(state: GameV2, id: string): GameV2 {
  return { ...state, features: releaseBuilder(state.features, id) }
}

/** Removes a hire (their build goes back to the queue). */
export function departMember(state: GameV2, id: string): GameV2 {
  if (!state.v2.team[id]) return state
  const { [id]: _gone, ...team } = state.v2.team
  return { ...freeFeatureOf(state, id), v2: { ...state.v2, team } }
}

/** Applies the employees part of a patch to the team: departures and salary changes. */
function applyEmployees(state: GameV2, employees: EventEmployee[] | undefined, lines: string[]): GameV2 {
  if (!employees) return state
  let s = state
  const after = new Map(employees.map(e => [e.id, e]))
  for (const m of Object.values(state.v2.team)) {
    const e = after.get(m.id)
    if (!e) { s = departMember(s, m.id); lines.push(`${m.name} left the company.`); continue }
    if (e.salary !== m.salary) s = { ...s, v2: { ...s.v2, team: { ...s.v2.team, [m.id]: { ...s.v2.team[m.id], salary: e.salary } } } }
  }
  return s
}

/** Applies a choice. Pass `patch` when the UI already ran the effect, so the shown outcome is the applied one. */
export function applyEventChoice(state: GameV2, choiceIndex: 0 | 1, precomputed?: EventPatch): GameV2 {
  const event = state.pendingEvent
  if (!event) return state
  // A choice you can't pay for isn't on offer (the card disables it too).
  if (!precomputed && !affordableChoices(state)[choiceIndex]) choiceIndex = choiceIndex === 0 ? 1 : 0
  const choice = event.choices[choiceIndex]
  const { employees, ...patch } = precomputed ?? choice.effect(eventView(state))
  const day = totalDays(state.gameTime)
  const lines = [choice.consequence]
  // Churn from events is a shock on top of product-health churn, fading daily.
  const { churnRate: eventChurn, ...rest } = patch
  const shockDelta = eventChurn !== undefined ? eventChurn - state.churnRate : 0
  let s: GameV2 = { ...state, ...rest, churnShock: (state.churnShock ?? 0) + shockDelta }
  s = { ...s, churnRate: churnBreakdown(s).total }
  s = applyEmployees(s, employees, lines)
  s = {
    ...s,
    pendingEvent: null,
    lastEventDay: day,
    usedEventIds: [...state.usedEventIds, event.id].slice(-10),
    decisionHistory: [{ day, eventTitle: event.title, choiceLabel: choice.label, consequence: choice.consequence }, ...state.decisionHistory],
    storyLog: [{ day, lines: [`${event.title}: ${choice.label}.`, ...lines] }, ...s.storyLog].slice(0, 20),
  }
  if (s.cash < 0 && s.phase === 'playing') s = { ...s, phase: 'lost' }
  if (s.soldAt && s.soldAt.day < 0) s = { ...s, soldAt: { ...s.soldAt, day } }
  return s
}
