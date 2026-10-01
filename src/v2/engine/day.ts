import type { MetricsSnapshot } from '../../types'
import type { Rng } from '../state'
import { DAYS_PER_MONTH, totalDays } from './clock'
import { EVENTS } from './eventData'
import { pickEvent } from './events'
import { churnBreakdown, fadeShock } from './churn'
import { INCIDENT, INCIDENT_CUSTOMER_LOSS, INCIDENT_TICKETS_PER_CUSTOMER, incidentChance } from './incidents'
import { finishMigrations, OUTAGE, OUTAGE_CUSTOMER_LOSS, OUTAGE_TICKETS_PER_CUSTOMER, outageChance, toolEffects } from './infra'
import { monthlyBurn, valuation } from './money'
import type { GameV2 } from './types'

const EVENT_COOLDOWN_DAYS = 5
const EVENT_DAILY_CHANCE = 0.55

/** Rounds an expected count probabilistically, so small numbers still happen. */
function roundChance(expected: number, rng: Rng): number {
  const whole = Math.floor(expected)
  return whole + (rng() < expected - whole ? 1 : 0)
}

/** Whole customers lost today. */
function dailyChurn(customers: number, monthlyRatePct: number, rng: Rng): number {
  return Math.min(customers, roundChance(customers * (monthlyRatePct / 100 / DAYS_PER_MONTH), rng))
}

export const LEAD_DECAY_PER_DAY = 0.08
export const TICKETS_PER_CUSTOMER_DAY = 0.03

/** Once per game day: churn, revenue − burn, investor interest, a possible event, a snapshot. */
export function processDay<T extends GameV2>(raw: T, day: number, rng: Rng): T {
  const state = finishMigrations(raw, day)
  // Product-health churn: shocks fade, the rest follows the product (spec §4).
  const churnShock = fadeShock(state.churnShock ?? 0)
  const churnRate = churnBreakdown({ ...state, churnShock }).total
  const lost = dailyChurn(state.customers, churnRate, rng)
  // Leads go cold; customers raise support tickets (more with tech debt).
  const coldLeads = Math.min(state.v2.leads, roundChance(state.v2.leads * LEAD_DECAY_PER_DAY, rng))
  const newTickets = roundChance(state.customers * TICKETS_PER_CUSTOMER_DAY * (1 + state.techDebt / 100), rng)
  const tickets = Math.min(Math.max(10, state.customers * 2), (state.v2.tickets ?? 0) + newTickets)
  const customers = state.customers - lost
  const mrr = customers * state.arpu
  const burn = monthlyBurn({ ...state, mrr, customers })
  const cash = state.cash + (mrr - burn) / DAYS_PER_MONTH

  // Investor interest (seed / Series A triggers, as in the legacy game)
  const rate = state.difficultyModifier?.investorInterestRate ?? 1
  let investorInterest = state.investorInterest
  if (mrr > 5000) investorInterest += 0.4 * rate
  else if (mrr > 1000) investorInterest += 0.2 * rate
  if (state.brand > 60) investorInterest += 0.15 * rate
  investorInterest = Math.max(0, Math.min(100, investorInterest - 0.05))

  let pendingEvent = state.pendingEvent
  // Tech debt sends the bill: an incident costs customers and floods support, then asks what to do.
  let afterIncident = { customers, tickets }
  if (!pendingEvent && rng() < incidentChance(state.techDebt) * toolEffects(state).incidentFactor) {
    const hit = Math.ceil(customers * INCIDENT_CUSTOMER_LOSS)
    afterIncident = { customers: customers - hit, tickets: tickets + Math.ceil(customers * INCIDENT_TICKETS_PER_CUSTOMER) }
    pendingEvent = INCIDENT
  }
  // Over hosting capacity: servers fall over (spec §7).
  if (!pendingEvent && rng() < outageChance({ ...state, customers: afterIncident.customers })) {
    const hit = Math.ceil(afterIncident.customers * OUTAGE_CUSTOMER_LOSS)
    afterIncident = { customers: afterIncident.customers - hit, tickets: afterIncident.tickets + Math.ceil(afterIncident.customers * OUTAGE_TICKETS_PER_CUSTOMER) }
    pendingEvent = OUTAGE
  }
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
    v2: { ...state.v2, leads: state.v2.leads - coldLeads, tickets: afterIncident.tickets },
    churnShock,
    churnRate,
    customers: afterIncident.customers,
    mrr: afterIncident.customers * state.arpu,
    customersLostThisMonth: (state.customersLostThisMonth ?? 0) + lost + (customers - afterIncident.customers),
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
