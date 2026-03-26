export type GamePhase = 'setup' | 'playing' | 'sold' | 'lost'

export type EventCategory = 'crisis' | 'opportunity' | 'market'

export type EmployeeRole = 'developer' | 'product_manager' | 'sales' | 'marketing'

export interface Employee {
  id: string
  name: string
  role: EmployeeRole
  stats: Record<string, number>   // 4 keys, values 1–10
  salary: number                  // monthly $
  status: 'idle' | 'busy'
  gender: 'male' | 'female'
  currentFeatureId?: string       // developer only
  currentCampaignId?: string      // sales / marketing only
  isRefactoring?: boolean         // developer doing a refactor sprint
  ideaProgress: number            // 0–1, PM only — how close to next idea
  hiredAtDay: number
  morale: number                  // 0–100
  stress: number                  // 0–100
  xp: number                      // ever-increasing, determines level
  level: number                   // 1–6
}

export interface CampaignTemplate {
  id: string
  name: string
  type: 'marketing' | 'sales'
  description: string
  cost: number
  durationDays: number
  requires: EmployeeRole          // 'marketing' or 'sales'
  baseCustomerGain: [number, number]
  churnEffect?: number            // negative = reduces churn; positive = increases
  oneTimeOnly?: boolean
  statKeys: string[]              // which stats affect quality
}

export interface ActiveCampaign {
  id: string
  templateId: string
  name: string
  type: 'marketing' | 'sales'
  assignedEmployeeId: string
  employeeName: string
  startDay: number
  durationDays: number
  progress: number                // 0–1
  expectedMin: number
  expectedMax: number
  churnEffect?: number
}

export interface CampaignResult {
  name: string
  gained: number
  expectedMin: number
  expectedMax: number
  completedAtDay: number
}

export interface FeatureResult {
  featureTitle: string
  value: 'low' | 'medium' | 'high'
  devName: string
  customerGain: number
  arpuChange: number
  churnDrop: number
  brandChange: number
  techDebtChange: number
  cashBonus: number
  completedAtDay: number
}

export interface Candidate {
  id: string
  name: string
  role: EmployeeRole
  stats: Record<string, number>
  salary: number
  gender: 'male' | 'female'
  bio: string
}

export type FeatureImpact =
  | 'users'
  | 'churn'
  | 'mrr'
  | 'upsell'
  | 'activation'
  | 'reach'
  | 'enterprise'
  | 'integration'

export interface FeatureEffects {
  customers?: number
  arpu?: number
  churnRate?: number
  cashBonus?: number
  brand?: number
  techDebt?: number
}

export interface Feature {
  id: string
  title: string
  description: string
  baseDays: number
  value: 'low' | 'medium' | 'high'
  impacts: FeatureImpact[]
  effects?: FeatureEffects
  tradeoffHint?: string
  discoveredByPMId: string
  status: 'proposed' | 'in_development' | 'completed'
  assignedToDevId?: string
  buildProgress: number           // 0–1
  discoveredAtDay: number
  completedAtDay?: number
}

// Game time is tracked in total hours (ever-increasing)
// Derived: day = floor(h/24), month = floor(h/720), year = floor(h/8640)
export interface GameTime {
  totalHours: number
}

export interface EventChoice {
  label: string
  consequence: string
  effect: (state: GameState) => Partial<GameState>
}

export interface GameEvent {
  id: string
  category: EventCategory
  title: string
  description: string
  choices: [EventChoice, EventChoice]
}

export interface StoryEntry {
  day: number
  lines: string[]
  tags?: string[]
}

export interface DecisionRecord {
  day: number
  eventTitle: string
  choiceLabel: string
  consequence: string
}

export interface MetricsSnapshot {
  day:             number
  mrr:             number
  customers:       number
  churnRate:       number
  cash:            number
  burn:            number
  runway:          number
  arpu:            number
  brand:           number
  techDebt:        number
  productProgress: number
  teamSize:        number
  culture:         number
  valuation:       number
}

// ─── Onboarding & Difficulty ──────────────────────────────────────────────

export type WorkspaceType = 'home' | 'coworking' | 'office'

export interface DifficultyModifier {
  tier: 'promising' | 'competitive' | 'risky' | 'brutal'
  customerMultiplier: number
  churnFloor: number
  featureImpactMultiplier: number
  campaignEffectiveness: number
  investorInterestRate: number
  eventWeighting: { crisisWeight: number; opportunityWeight: number }
}

export interface OnboardingConfig {
  idea: string
  ideaScore: number
  ideaFeedback: string
  workspace: WorkspaceType
  startupName: string
  aiRoadmap: import('../data/featureTemplates').FeatureTemplate[]
  difficulty: DifficultyModifier
}

export interface GameState {
  phase: GamePhase
  startupName: string

  gameTime: GameTime

  // Finance
  cash: number
  mrr: number
  arpu: number                    // $ per user per month, mutable
  infraCostMonthly: number

  // Customers
  customers: number
  churnRate: number               // % per month
  customersLostLastMonth: number

  // Product
  productProgress: number         // 0–100

  // People
  employees: Employee[]
  candidates: Candidate[]
  deskCount: number               // purchased desks (max 6)

  // Company health
  culture: number                 // 0–100
  techDebt: number                // 0–100
  brand: number                   // 0–100

  // Equity & funding
  equity: number                  // 0–100 (founder ownership %)
  investorInterest: number        // 0–100 hidden meter; triggers events

  // Refactor sprint
  refactorDevId?: string
  refactorProgress: number        // 0–1

  // Feature pipeline
  features: Feature[]
  featureRoadmap: import('../data/featureTemplates').FeatureTemplate[]
  featureRoadmapIndex: number     // next index to discover from AI roadmap

  // Campaigns
  activeCampaigns: ActiveCampaign[]
  completedCampaignIds: string[]   // for one-time campaigns
  recentCampaignResults: CampaignResult[]
  recentFeatureResults: FeatureResult[]

  // Events
  pendingEvent: GameEvent | null
  usedEventIds: string[]
  lastEventDay: number

  // History
  storyLog: StoryEntry[]
  decisionHistory: DecisionRecord[]
  metricsHistory: MetricsSnapshot[]
  fullMetricsHistory: MetricsSnapshot[]

  // Session identifier
  gameId: string

  // Goals
  earlyGoalReached: boolean       // $1k MRR

  // Sale
  soldAt?: { day: number; valuation: number }

  // Tutorial & Milestones
  completedMilestoneIds: string[]
  pendingMilestoneToasts: MilestoneToastEntry[]

  // Onboarding / difficulty
  idea?: string
  ideaScore?: number
  workspace?: WorkspaceType
  difficultyModifier?: DifficultyModifier
  lastConfig?: OnboardingConfig
}

// ─── Tutorial & Milestones ────────────────────────────────────────────────

export type MilestoneCategory = 'team' | 'product' | 'users' | 'revenue'

export interface MilestoneDefinition {
  id: string
  title: string
  description: string
  category: MilestoneCategory
  icon: string
  condition: (state: GameState) => boolean
}

export interface MilestoneToastEntry {
  id: string
  title: string
  description: string
  icon: string
  triggeredAt: number
}

export interface LeaderboardEntry {
  startupName: string
  valuation: number
  daysSurvived: number
  mrr: number
  customers: number
  outcome: 'sold' | 'lost'
  playedAt: number
}
