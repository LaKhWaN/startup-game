import type { MetricsSnapshot } from '../../types'
import type { Rng } from '../state'
import { DAYS_PER_MONTH, totalDays } from './clock'
import { EVENTS } from './eventData'
import { pickEvent } from './events'
import { monthlyBurn, valuation } from './money'
import type { GameV2 } from './types'

const EVENT_COOLDOWN_DAYS = 5
const EVENT_DAILY_CHANCE = 0.55

/** Whole customers lost today. Rounds probabilistically so small companies churn too. */
function dailyChurn(customers: number, monthlyRatePct: number, rng: Rng): number {
  const expected = customers * (monthlyRatePct / 100 / DAYS_PER_MONTH)
  const whole = Math.floor(expected)
  return Math.min(customers, whole + (rng() < expected - whole ? 1 : 0))
}

/** Once per game day: churn, revenue − burn, investor interest, a possible event, a snapshot. */
export function processDay<T extends GameV2>(state: T, day: number, rng: Rng): T {
  const floor = state.difficultyModifier?.churnFloor ?? 3
  const churnRate = Math.max(floor, state.churnRate - 0.08)
  const lost = dailyChurn(state.customers, churnRate, rng)
  const customers = state.customers - lost
  const mrr = customers * state.arpu
  const burn = monthlyBurn(state)
  const cash = state.cash + (mrr - burn) / DAYS_PER_MONTH

  // Investor interest (seed / Series A triggers, as in the legacy game)
  const rate = state.difficultyModifier?.investorInterestRate ?? 1
  let investorInterest = state.investorInterest
  if (mrr > 5000) investorInterest += 0.4 * rate
  else if (mrr > 1000) investorInterest += 0.2 * rate
  if (state.brand > 60) investorInterest += 0.15 * rate
  investorInterest = Math.max(0, Math.min(100, investorInterest - 0.05))

  let pendingEvent = state.pendingEvent
  if (!pendingEvent && investorInterest >= 70 && !state.usedEventIds.includes('investor-seed')) {
    pendingEvent = EVENTS.find(e => e.id === 'investor-seed') ?? null
  } else if (!pendingEvent && investorInterest >= 85 && state.usedEventIds.includes('investor-seed') && !state.usedEventIds.includes('investor-series-a')) {
    pendingEvent = EVENTS.find(e => e.id === 'investor-series-a') ?? null
  }
  if (!pendingEvent && day - state.lastEventDay >= EVENT_COOLDOWN_DAYS && rng() < EVENT_DAILY_CHANCE) {
    pendingEvent = pickEvent({ ...state, mrr, customers }, rng)
  }

  const next: T = {
    ...state,
    churnRate,
    customers,
    customersLostThisMonth: (state.customersLostThisMonth ?? 0) + lost,
    mrr,
    cash,
    brand: Math.max(0, Math.min(100, state.brand - 0.01)),
    investorInterest,
    pendingEvent,
    lastEventDay: pendingEvent && !state.pendingEvent ? day : state.lastEventDay,
    phase: cash < 0 && state.phase === 'playing' ? 'lost' : state.phase,
  }
  const snapshot: MetricsSnapshot = {
    day, mrr, customers, churnRate, cash, burn,
    runway: burn - mrr <= 0 ? 999 : Math.min(999, Math.floor(cash / (burn - mrr))),
    arpu: next.arpu, brand: next.brand, techDebt: next.techDebt, productProgress: next.productProgress,
    teamSize: Object.keys(next.v2.team).length, culture: next.culture ?? 60, valuation: valuation(next),
  }
  return {
    ...next,
    metricsHistory: [...next.metricsHistory, snapshot].slice(-90),
    fullMetricsHistory: [...next.fullMetricsHistory, snapshot],
  }
}

/** Every 30 days: a one-line month summary. (Cash already moved daily.) */
export function processMonth<T extends GameV2>(state: T, month: number): T {
  const burn = monthlyBurn(state)
  const net = state.mrr - burn
  const lines = [`Month ${month}: MRR $${state.mrr.toLocaleString()} · Burn $${burn.toLocaleString()} · Net ${net >= 0 ? '+' : ''}$${Math.round(net).toLocaleString()}/mo`]
  const lost = state.customersLostThisMonth ?? 0
  if (lost > 0) lines.push(`📉 Lost ${lost} customer${lost === 1 ? '' : 's'} to churn this month.`)
  return { ...state, customersLostThisMonth: 0, storyLog: [{ day: totalDays(state.gameTime), lines }, ...state.storyLog].slice(0, 20) }
}
