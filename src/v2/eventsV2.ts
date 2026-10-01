import { getMonthlyBurn } from '../engine/gameEngine'
import type { GameEvent, GameState } from '../types'
import { locationIndex } from './locations'
import type { Rng, V2GameState } from './state'

/**
 * Legacy events are sized for a funded company. v2 keeps them but thins them
 * out early, gates the big-company ones, and scales their costs to the burn
 * (spec §8.5).
 */

/** Chance a picked event is kept, by stage (ladder index). */
export const EVENT_KEEP_CHANCE = [0.35, 0.5, 0.65, 0.8, 1, 1, 1]

/** Events that only make sense for a bigger company. */
export const EVENT_MIN_STAGE: Record<string, number> = {
  'enterprise-intro': 3,
  'custom-feature-request': 3,
  'conference-sponsorship': 2,
  'talent-poaching': 2,
  'market-downturn': 2,
  'key-employee-quit': 2,
}

/** Events that can pay out: kept whole and never thinned. */
export const EXEMPT_EVENTS = new Set([
  'investor-seed', 'investor-series-a', 'acquisition-lowball', 'acquisition-premium', 'angel-meeting',
  'enterprise-intro', 'custom-feature-request',
])

const SCALED = '__v2Scaled'

export function isScaled(event: GameEvent): boolean {
  return (event as GameEvent & { [SCALED]?: boolean })[SCALED] === true
}

function mark(event: GameEvent): GameEvent {
  return { ...event, [SCALED]: true } as GameEvent
}

export function costFactor(state: GameState): number {
  return Math.min(1, Math.max(0.2, getMonthlyBurn(state) / 10_000))
}

/** Scales a cost by f, rounded to $50 and never below $50. Keeps the sign. */
function scaleCost(amount: number, f: number): number {
  const scaled = Math.max(50, Math.round((Math.abs(amount) * f) / 50) * 50)
  return Math.sign(amount) * scaled
}

export function scaleText(text: string, f: number): string {
  return text.replace(/\$(\d[\d,]*)(?![\d,]*k)/g, (_m, num: string) => {
    const n = Number(num.replace(/,/g, ''))
    return `$${scaleCost(n, f).toLocaleString('en-US')}`
  })
}

function scaleEffect(effect: GameEvent['choices'][0]['effect'], f: number): GameEvent['choices'][0]['effect'] {
  return (s: GameState) => {
    const out = { ...effect(s) }
    if (typeof out.cash === 'number' && out.cash < s.cash) out.cash = s.cash + scaleCost(out.cash - s.cash, f)
    if (typeof out.infraCostMonthly === 'number' && out.infraCostMonthly > s.infraCostMonthly) {
      out.infraCostMonthly = s.infraCostMonthly + scaleCost(out.infraCostMonthly - s.infraCostMonthly, f)
    }
    if (out.employees) {
      const before = new Map(s.employees.map(e => [e.id, e.salary]))
      out.employees = out.employees.map(e => {
        const was = before.get(e.id)
        return was !== undefined && e.salary > was ? { ...e, salary: was + scaleCost(e.salary - was, f) } : e
      })
    }
    return out
  }
}

export function scaleEvent(event: GameEvent, f: number): GameEvent {
  const [a, b] = event.choices
  const choice = (c: typeof a) => ({ ...c, label: scaleText(c.label, f), consequence: scaleText(c.consequence, f), effect: scaleEffect(c.effect, f) })
  return mark({ ...event, description: scaleText(event.description, f), choices: [choice(a), choice(b)] })
}

/** Runs once per new pending event: drop it, keep it whole, or keep a scaled copy. */
export function filterPendingEvent(state: V2GameState, rng: Rng): V2GameState {
  const event = state.pendingEvent
  if (!event || isScaled(event)) return state
  const stage = locationIndex(state.v2.location)
  if ((EVENT_MIN_STAGE[event.id] ?? 0) > stage) return { ...state, pendingEvent: null }
  if (EXEMPT_EVENTS.has(event.id)) return { ...state, pendingEvent: mark(event) }
  if (rng() >= EVENT_KEEP_CHANCE[stage]) return { ...state, pendingEvent: null }
  return { ...state, pendingEvent: scaleEvent(event, costFactor(state)) }
}
