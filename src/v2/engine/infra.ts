import { addStory } from '../state'
import { hourOfDay, isWeekend, isWorkHour, WORK_END } from './clock'
import type { EventDef } from './eventData'
import type { GameV2 } from './types'

/** Spec §7. */
export interface HostingPlan { tier: number; name: string; price: number; cap: number; migrationDays: number }

export const HOSTING: HostingPlan[] = [
  { tier: 1, name: 'Free tier', price: 0, cap: 20, migrationDays: 0 },
  { tier: 2, name: 'Shared VPS', price: 50, cap: 150, migrationDays: 1 },
  { tier: 3, name: 'Dedicated server', price: 300, cap: 600, migrationDays: 2 },
  { tier: 4, name: 'Cloud cluster', price: 1200, cap: 2500, migrationDays: 3 },
  { tier: 5, name: 'Global CDN + autoscaling', price: 4000, cap: 10000, migrationDays: 4 },
]

export type WifiPlan = 'home' | 'fiber' | 'business'
export const WIFI: Record<WifiPlan, { name: string; price: number; speed: number }> = {
  home: { name: 'Home Wi-Fi', price: 0, speed: 1 },
  fiber: { name: 'Fiber', price: 80, speed: 1.05 },
  business: { name: 'Business fiber', price: 250, speed: 1.1 },
}

export type ToolId = 'helpdesk' | 'monitoring' | 'ci' | 'nightShift'
export const TOOLS: Record<ToolId, { name: string; icon: string; price: number; blurb: string }> = {
  helpdesk: { name: 'Helpdesk', icon: '🎫', price: 100, blurb: 'Support clears 50% more tickets' },
  monitoring: { name: 'Monitoring', icon: '📈', price: 150, blurb: 'Incidents and outages 40% less likely' },
  ci: { name: 'CI/CD', icon: '🚦', price: 200, blurb: 'Builds 10% faster, build mistakes ×0.7' },
  nightShift: { name: 'Night shift', icon: '🌃', price: 0, blurb: 'Team works 09:00–23:00 on weekdays. Costs +50% of payroll; evening hours are twice as stressful' },
}

/** Night shift costs this share of total salaries per month. */
export const NIGHT_SHIFT_PREMIUM = 0.5
export const NIGHT_SHIFT_END = 23

const payroll = (s: S) => Object.values(s.v2.team).reduce((sum, m) => sum + m.salary, 0)

/** Is the office open (hires at work) during the hour starting at `totalHours`? */
export function officeOpen(s: S, totalHours: number): boolean {
  if (isWorkHour(totalHours)) return true
  const h = hourOfDay(totalHours)
  return infraOf(s).tools.includes('nightShift') && !isWeekend(totalHours) && h >= WORK_END && h < NIGHT_SHIFT_END
}

/** An evening (night-shift) work hour. */
export const isEveningHour = (totalHours: number) => hourOfDay(totalHours) >= WORK_END

export interface InfraState {
  hosting: number
  migratingTo?: number
  migrationDoneDay?: number
  wifi: WifiPlan
  tools: ToolId[]
}

export const START_INFRA: InfraState = { hosting: 1, wifi: 'home', tools: [] }

type S = Pick<GameV2, 'v2'>
const infraOf = (s: S): InfraState => s.v2.infra ?? START_INFRA
const plan = (tier: number) => HOSTING[Math.min(HOSTING.length, Math.max(1, tier)) - 1]

export const hostingPlan = (s: S) => plan(infraOf(s).hosting)
export const hostingCap = (s: S) => hostingPlan(s).cap
export const hostingLoad = (s: S & Pick<GameV2, 'customers'>) => s.customers / hostingCap(s)

/** Monthly cost of hosting (the plan you're paying for, even mid-migration), Wi-Fi and tools. */
export function infraServicesCost(s: S): number {
  const i = infraOf(s)
  const shift = i.tools.includes('nightShift') ? Math.round(payroll(s) * NIGHT_SHIFT_PREMIUM) : 0
  return plan(i.migratingTo ?? i.hosting).price + WIFI[i.wifi].price + i.tools.reduce((sum, t) => sum + TOOLS[t].price, 0) + shift
}

export const slowAppChurn = (s: S & Pick<GameV2, 'customers'>) => (hostingLoad(s) > 0.9 ? 1 : 0)

export function toolEffects(s: S) {
  const t = new Set(infraOf(s).tools)
  return {
    supportBoost: t.has('helpdesk') ? 1.5 : 1,
    incidentFactor: t.has('monitoring') ? 0.6 : 1,
    buildSpeed: t.has('ci') ? 1.1 : 1,
    buildMistakes: t.has('ci') ? 0.7 : 1,
  }
}

export const wifiSpeed = (s: S) => WIFI[infraOf(s).wifi].speed

/** Daily outage chance once over capacity. */
export function outageChance(s: S & Pick<GameV2, 'customers'>): number {
  const load = hostingLoad(s)
  if (load <= 1) return 0
  return Math.min(0.5, (load - 1) * 0.8 + 0.05) * toolEffects(s).incidentFactor
}

export type MigrateCheck = 'ok' | 'busy' | 'current' | 'too-small'

export function canMigrate(s: S & { customers?: number }, tier: number): MigrateCheck {
  const i = infraOf(s)
  if (i.migratingTo !== undefined) return 'busy'
  if (tier === i.hosting) return 'current'
  // Scaling down is fine while your customers still fit the smaller plan.
  if (tier < i.hosting && (s.customers ?? 0) > plan(tier).cap) return 'too-small'
  return 'ok'
}

export function startMigration<T extends GameV2>(s: T, tier: number, day: number): T {
  if (canMigrate(s, tier) !== 'ok') return s
  const p = plan(tier)
  if (tier < infraOf(s).hosting) {
    // Downgrades are instant: just move to the smaller plan.
    return addStory({ ...s, v2: { ...s.v2, infra: { ...infraOf(s), hosting: p.tier } } }, [`🖥️ Scaled hosting down to ${p.name} ($${p.price.toLocaleString()}/mo).`])
  }
  const next = { ...s, v2: { ...s.v2, infra: { ...infraOf(s), migratingTo: p.tier, migrationDoneDay: day + p.migrationDays } } }
  return addStory(next, [`🖥️ Migrating to ${p.name} ($${p.price.toLocaleString()}/mo). Ready in ${p.migrationDays} day${p.migrationDays === 1 ? '' : 's'}.`])
}

/** On each new day: a finished migration switches capacity over. */
export function finishMigrations<T extends GameV2>(s: T, day: number): T {
  const i = infraOf(s)
  if (i.migratingTo === undefined || i.migrationDoneDay === undefined || day < i.migrationDoneDay) return s
  const p = plan(i.migratingTo)
  const next = { ...s, v2: { ...s.v2, infra: { ...i, hosting: p.tier, migratingTo: undefined, migrationDoneDay: undefined } } }
  return addStory(next, [`✅ Migration done: now on ${p.name} (${p.cap.toLocaleString()} customers).`])
}

export function setWifi<T extends GameV2>(s: T, wifi: WifiPlan): T {
  return { ...s, v2: { ...s.v2, infra: { ...infraOf(s), wifi } } }
}

export function toggleTool<T extends GameV2>(s: T, id: ToolId): T {
  const tools = infraOf(s).tools.includes(id) ? infraOf(s).tools.filter(t => t !== id) : [...infraOf(s).tools, id]
  return { ...s, v2: { ...s.v2, infra: { ...infraOf(s), tools } } }
}

export const OUTAGE_CUSTOMER_LOSS = 0.02
export const OUTAGE_TICKETS_PER_CUSTOMER = 0.08

export const OUTAGE: EventDef = {
  id: 'outage',
  category: 'crisis',
  title: 'Servers Are Down',
  description: 'You have more customers than your hosting can handle and it fell over. Some customers already left. Upgrade hosting in the Infra screen.',
  choices: [
    { label: 'Status page and apologies', consequence: 'You were honest about it. Some customers are still annoyed.', effect: s => ({ churnRate: s.churnRate + 2 }) },
    {
      label: 'Credit affected customers a month',
      consequence: 'You credited everyone hit by the outage. Expensive, but nobody is angry.',
      effect: s => ({ cash: s.cash - Math.round(s.customers * 0.2) * s.arpu }),
    },
  ],
}
