import type { EpicKind, Feature, FeatureEffects } from '../types'
import { totalDays } from './engine/clock'
import { locationIndex } from './locations'
import { addStory, type V2GameState } from './state'

/** Up to this many developers can build one epic: the lead plus helpers. */
export const EPIC_MAX_BUILDERS = 3
export const EPIC_MIN_DAYS = 15
export const EPIC_MAX_DAYS = 40
/** Planning a roadmap opens at Co-working (ladder index 3). */
export const ROADMAP_STAGE = 3
/** Enterprise epics lift the ARPU cap by this much each (first roadmap; later rounds less). */
export const EPIC_ARPU_CAP_STEP = 10
/** Each roadmap round's projects are worth this share of the round before: big bets run out too. */
export const EPIC_ROUND_DECAY = 0.7
export const roundScale = (round: number) => EPIC_ROUND_DECAY ** Math.max(0, round - 1)

export interface EpicSpec {
  title: string
  description: string
  baseDays: number
  kind: EpicKind
}

/** What each kind of big project does. Numbers grow a little with every roadmap round. */
export const EPIC_KINDS: Record<EpicKind, { icon: string; label: string; blurb: string; marketBoost: number; effects: (round: number) => FeatureEffects }> = {
  segment: { icon: '🎯', label: 'New segment', blurb: 'Opens a new customer segment: bigger market', marketBoost: 0.12, effects: r => ({ customers: 30 + 10 * r, brand: 4 }) },
  enterprise: { icon: '🏢', label: 'Enterprise', blurb: 'Enterprise plan: higher ARPU and a higher price ceiling', marketBoost: 0.03, effects: r => ({ arpu: 8 + 2 * r, churnRate: -0.5 }) },
  platform: { icon: '🧱', label: 'Platform', blurb: 'Rebuild the foundations: less tech debt, steadier customers', marketBoost: 0, effects: () => ({ techDebt: -25, churnRate: -1.5 }) },
  integration: { icon: '🔌', label: 'Integration', blurb: 'Plugs into tools customers use: market + retention', marketBoost: 0.06, effects: () => ({ churnRate: -1, customers: 15 }) },
  international: { icon: '🌍', label: 'International', blurb: 'A new country: the biggest market jump', marketBoost: 0.2, effects: r => ({ customers: 40 + 10 * r, brand: 6 }) },
  ai: { icon: '🤖', label: 'AI', blurb: 'An AI capability: ARPU and brand', marketBoost: 0.04, effects: r => ({ arpu: 5 + r, brand: 8 }) },
}

export const EPIC_KIND_IDS = Object.keys(EPIC_KINDS) as EpicKind[]

export const isEpic = (f: Pick<Feature, 'epic'>) => !!f.epic

/** Turn an AI (or fallback) spec into a proposed feature. */
export function epicFeature(spec: EpicSpec, round: number, day: number, key: string): Feature {
  const kind = EPIC_KINDS[spec.kind] ? spec.kind : 'segment'
  return {
    id: `epic-${round}-${key}`,
    title: spec.title.slice(0, 60),
    description: spec.description.slice(0, 200),
    baseDays: Math.round(Math.max(EPIC_MIN_DAYS, Math.min(EPIC_MAX_DAYS, Number(spec.baseDays) || 25))),
    value: 'high',
    impacts: [],
    effects: scaleEffects(EPIC_KINDS[kind].effects(round), roundScale(round)),
    discoveredByPMId: 'founder',
    status: 'proposed',
    buildProgress: 0,
    discoveredAtDay: day,
    epic: { kind, round, marketBoost: EPIC_KINDS[kind].marketBoost * roundScale(round), helpers: [] },
  }
}

/** Market/ARPU/customer gains shrink with later rounds; debt and churn relief don't. */
function scaleEffects(e: FeatureEffects, k: number): FeatureEffects {
  return { ...e, ...(e.arpu ? { arpu: Math.round(e.arpu * k) } : {}), ...(e.customers ? { customers: Math.round(e.customers * k) } : {}) }
}

/** Used when the AI isn't available: a solid generic roadmap. */
export function fallbackEpics(round: number): EpicSpec[] {
  const v = round > 1 ? ` ${round}.0` : ''
  return [
    { title: `Mid-market edition${v}`, description: 'A version built for 50–500 person companies.', baseDays: 25, kind: 'segment' },
    { title: `Enterprise plan${v}`, description: 'SSO, audit logs, admin controls and an SLA.', baseDays: 30, kind: 'enterprise' },
    { title: `Platform rewrite${v}`, description: 'Pay down years of shortcuts in the core.', baseDays: 35, kind: 'platform' },
    { title: `Integrations hub${v}`, description: 'Connect to the tools your customers already use.', baseDays: 20, kind: 'integration' },
    { title: `Europe launch${v}`, description: 'Localisation, EU hosting and local payments.', baseDays: 30, kind: 'international' },
    { title: `AI assistant${v}`, description: 'An assistant that does the busywork for users.', baseDays: 25, kind: 'ai' },
    { title: `Public API${v}`, description: 'Let developers build on top of the product.', baseDays: 20, kind: 'integration' },
    { title: `APAC launch${v}`, description: 'Asia-Pacific data centres, languages and partners.', baseDays: 35, kind: 'international' },
  ]
}

export const roadmapRound = (s: Pick<V2GameState, 'v2'>) => s.v2.roadmapRound ?? 0

/** Planning costs most of a month's revenue, and each round costs as much again as the first. */
export function roadmapCost(s: Pick<V2GameState, 'v2' | 'mrr'>): number {
  return Math.round(Math.max(10_000, 0.75 * s.mrr) * (1 + roadmapRound(s)) / 100) * 100
}

export type PlanCheck = 'ok' | 'locked' | 'busy' | 'cash'

export function canPlanRoadmap(s: V2GameState): PlanCheck {
  if (locationIndex(s.v2.location) < ROADMAP_STAGE) return 'locked'
  if (s.features.some(f => f.epic && f.status !== 'completed')) return 'busy'
  if (s.cash < roadmapCost(s)) return 'cash'
  return 'ok'
}

/** Pay for the plan and add its epics as proposed features. */
export function applyRoadmap(s: V2GameState, specs: EpicSpec[]): V2GameState {
  if (canPlanRoadmap(s) !== 'ok' || specs.length === 0) return s
  const cost = roadmapCost(s)
  const round = roadmapRound(s) + 1
  const day = totalDays(s.gameTime)
  const taken = new Set(s.features.map(f => f.title))
  const epics = specs.filter(sp => !taken.has(sp.title)).slice(0, 10).map((sp, i) => epicFeature(sp, round, day, `${s.gameTime.totalHours}-${i}`))
  const next: V2GameState = { ...s, cash: s.cash - cost, features: [...s.features, ...epics], v2: { ...s.v2, roadmapRound: round } }
  return addStory(next, [`🗺️ Roadmap ${round} planned for $${cost.toLocaleString()}: ${epics.length} big projects. Put developers on Develop to build them together.`])
}
