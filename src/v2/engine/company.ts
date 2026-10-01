import type {
  DecisionRecord, DifficultyModifier, Feature, FeatureResult, GamePhase, GameTime, MetricsSnapshot, OnboardingConfig, StoryEntry,
} from '../../types'
import type { FeatureTemplate } from '../../data/featureTemplates'
import { WORK_START } from './clock'
import type { EventDef } from './eventData'

/**
 * The company half of v2 state (the other half is the `v2` slice). Field names
 * match the old legacy GameState so v2 code reads the same.
 */
export interface CompanyState {
  phase: GamePhase
  startupName: string
  idea: string
  ideaScore: number
  difficultyModifier: DifficultyModifier
  lastConfig?: OnboardingConfig
  gameId: string
  gameTime: GameTime

  cash: number
  mrr: number
  arpu: number
  customers: number
  /** Monthly churn %, applied a little every day (recomputed daily from churnBreakdown). */
  churnRate: number
  /** Temporary churn from events, fading daily. */
  churnShock: number
  customersLostThisMonth: number
  brand: number
  techDebt: number
  productProgress: number
  culture: number
  equity: number
  investorInterest: number
  /** Rent / infrastructure per month. */
  infraCostMonthly: number

  features: Feature[]
  featureRoadmap: FeatureTemplate[]
  featureRoadmapIndex: number
  recentFeatureResults: FeatureResult[]

  pendingEvent: EventDef | null
  usedEventIds: string[]
  lastEventDay: number
  decisionHistory: DecisionRecord[]

  storyLog: StoryEntry[]
  metricsHistory: MetricsSnapshot[]
  fullMetricsHistory: MetricsSnapshot[]
  soldAt?: { day: number; valuation: number }
}

export const START_ARPU = 50

export function createCompany(config: OnboardingConfig, cash: number): CompanyState {
  const churn = Math.max(config.difficulty.churnFloor, 12)
  const snapshot: MetricsSnapshot = {
    day: 0, mrr: 0, customers: 0, churnRate: churn, cash, burn: 0, runway: 999, arpu: START_ARPU,
    brand: 10, techDebt: 0, productProgress: 5, teamSize: 0, culture: 60, valuation: cash,
  }
  return {
    phase: 'playing',
    startupName: config.startupName,
    idea: config.idea,
    ideaScore: config.ideaScore,
    difficultyModifier: config.difficulty,
    lastConfig: config,
    gameId: `v2-game-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    gameTime: { totalHours: WORK_START }, // Monday 09:00
    cash,
    mrr: 0,
    arpu: START_ARPU,
    customers: 0,
    churnRate: churn,
    churnShock: 0,
    customersLostThisMonth: 0,
    brand: 10,
    techDebt: 0,
    productProgress: 5,
    culture: 60,
    equity: 100,
    investorInterest: 0,
    infraCostMonthly: 0,
    features: [],
    featureRoadmap: config.aiRoadmap,
    featureRoadmapIndex: 0,
    recentFeatureResults: [],
    pendingEvent: null,
    usedEventIds: [],
    lastEventDay: 0,
    decisionHistory: [],
    storyLog: [],
    metricsHistory: [snapshot],
    fullMetricsHistory: [snapshot],
  }
}
