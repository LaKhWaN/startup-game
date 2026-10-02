import type { EmployeeRole, OnboardingConfig } from '../types'
import { FEATURE_TEMPLATES } from '../data/featureTemplates'
import { scoreToDifficulty } from '../ai/gemini'
import { totalDays } from './engine/clock'
import { createCompany, type CompanyState } from './engine/company'
import type { PerkId } from './shop'
import { START_INFRA, type InfraState } from './engine/infra'
import { LOCATIONS } from './locations'

export type FounderTaskType = 'research' | 'develop' | 'emails' | 'sales' | 'support' | 'refactor'
export type FounderSkill = 'research' | 'build' | 'outreach' | 'sales'
export type Beat = 0 | 1 | 2 | 3 | 4 | 5
export type Rng = () => number

export interface FounderTask {
  type: FounderTaskType
  featureId?: string
  progress: number // 0..1
}

export interface FamilyMoney {
  giver: string
  amount: number
  claimed: boolean
}

export type TeamRole = EmployeeRole
export type Tier = 'intern' | 'fulltime'
export type LocationId = 'home' | 'biggerHome' | 'villa' | 'coworking' | 'smallOffice' | 'bigOffice' | 'building'
export const LOCATION_IDS: LocationId[] = ['home', 'biggerHome', 'villa', 'coworking', 'smallOffice', 'bigOffice', 'building']
export type Assignment = FounderTaskType | 'idle'

export interface TeamMember {
  id: string
  name: string
  gender: 'male' | 'female'
  role: TeamRole
  tier: Tier
  skills: Record<FounderSkill, number>
  assignment: Assignment
  task: FounderTask | null
  mistakes: number
  seat: number
  characterModel: string
  salary: number
  /** Mood (spec §5): 0–100 each. Missing on older saves → see engine/people moodOf. */
  energy?: number
  stress?: number
  morale?: number
  /** Company experience: makes them faster; lost when they leave. */
  context?: number
  /** Work days in a row ending at burnout-level stress. */
  burnoutDays?: number
  /** Game day they leave (handed in notice). */
  leavingOn?: number
  /** Already talked out of leaving once. */
  convinced?: boolean
  /** Game day they joined (missing on older saves). */
  hiredAtDay?: number
  /** Their one-liner from the hiring card (missing on saves from before it was kept). */
  bio?: string
  /** Manager this member reports to (managers arrive in a later phase). */
  reportsTo?: string
}

export interface InternCandidate {
  id: string
  name: string
  gender: 'male' | 'female'
  role: TeamRole
  tier: Tier
  skills: Record<FounderSkill, number>
  salary: number
  bio: string
  characterModel: string
}

export interface Chapter2State {
  beat: 0 | 1 | 2
  complete: boolean
  firstMistake: boolean
}

export interface Chapter3State {
  beat: 0 | 1
  complete: boolean
}

/** Lifetime counters for the stats rail. */
export interface V2Stats {
  researchRounds: number
  featuresShipped: number
  emailRounds: number
  leadsFound: number
  salesCalls: number
  customersWon: number
  mistakes: number
}

export const EMPTY_STATS: V2Stats = {
  researchRounds: 0, featuresShipped: 0, emailRounds: 0, leadsFound: 0, salesCalls: 0, customersWon: 0, mistakes: 0,
}

export interface V2Slice {
  founder: {
    name: string
    task: FounderTask | null
    skills: Record<FounderSkill, number>
    /** 0–100; the founder tires too (spec §5). */
    energy?: number
    /** Keep working through 23:00–07:00 (costs energy). */
    workLate?: boolean
  }
  chapter: {
    beat: Beat
    complete: boolean
    seenCards: string[]
    familyMoney?: FamilyMoney
  }
  leads: number
  firstSaleDone: boolean
  team: Record<string, TeamMember>
  candidates: InternCandidate[]
  chapter2: Chapter2State
  location: LocationId
  unlockedLocations: LocationId[]
  /** Highest MRR ever reached; drives location unlocks. */
  peakMrr: number
  chapter3: Chapter3State
  stats: V2Stats
  /** Open support tickets (spec §4). */
  tickets: number
  /** Perks bought, in purchase order (spec §6). */
  perks: PerkId[]
  /** Computer tier per desk: the founder's and each hire seat (spec §6). */
  setups: { founder: number; seats: number[] }
  /** Hosting, Wi-Fi and tools (spec §7). */
  infra: InfraState
  /** Customers won in roughly the last month; they churn twice as fast. */
  freshCustomers?: number
  /** Skip closed office hours automatically. */
  autoSkipNights?: boolean
}

/** The whole v2 game: company state + the v2 slice. */
export type V2GameState = CompanyState & { v2: V2Slice }

export const FOUNDER_START_CASH = 500
export const STARTING_SKILL = 4

const SKILL_KEYS: FounderSkill[] = ['research', 'build', 'outreach', 'sales']

export function createV2Slice(): V2Slice {
  return {
    founder: {
      name: 'You',
      task: null,
      skills: {
        research: STARTING_SKILL,
        build: STARTING_SKILL,
        outreach: STARTING_SKILL,
        sales: STARTING_SKILL,
      },
    },
    chapter: { beat: 0, complete: false, seenCards: [] },
    leads: 0,
    firstSaleDone: false,
    team: {},
    candidates: [],
    chapter2: { beat: 0, complete: false, firstMistake: false },
    location: 'home',
    unlockedLocations: ['home'],
    peakMrr: 0,
    chapter3: { beat: 0, complete: false },
    stats: { ...EMPTY_STATS },
    tickets: 0,
    perks: [],
    setups: { founder: 1, seats: [] },
    infra: { ...START_INFRA },
  }
}

export function createV2State(config: OnboardingConfig): V2GameState {
  const base = createCompany(config, FOUNDER_START_CASH)
  const ideaLine = config.idea.length > 80 ? `${config.idea.slice(0, 80)}...` : config.idea
  return {
    ...base,
    storyLog: [{
      day: 0,
      lines: [
        `${config.startupName} starts at a kitchen table: one founder, $${FOUNDER_START_CASH} in savings, and an idea.`,
        `Idea: "${ideaLine}"`,
      ],
    }],
    v2: createV2Slice(),
  }
}

/** Placeholder state before onboarding finishes. */
export function createSetupState(): V2GameState {
  const config: OnboardingConfig = {
    idea: '', ideaScore: 5, ideaFeedback: '', workspace: 'home', startupName: '',
    aiRoadmap: FEATURE_TEMPLATES, difficulty: scoreToDifficulty(5),
  }
  return { ...createV2State(config), phase: 'setup' }
}

export function isValidV2Slice(v: unknown): v is V2Slice {
  if (!v || typeof v !== 'object') return false
  const s = v as Record<string, unknown>
  const founder = s.founder as Record<string, unknown> | undefined
  const chapter = s.chapter as Record<string, unknown> | undefined
  const skills = founder?.skills as Record<string, unknown> | undefined
  if (!founder || !chapter || !skills) return false
  if (typeof s.leads !== 'number' || typeof s.firstSaleDone !== 'boolean') return false
  if (!SKILL_KEYS.every(k => typeof skills[k] === 'number')) return false
  if (founder.task !== null && typeof founder.task !== 'object') return false
  const beat = chapter.beat
  if (typeof beat !== 'number' || !Number.isInteger(beat) || beat < 0 || beat > 5) return false
  return typeof chapter.complete === 'boolean' && Array.isArray(chapter.seenCards)
}

/** Accepts a valid Phase 1+ slice and fills in fields added by later phases. */
export function migrateV2Slice(v: unknown): V2Slice | null {
  if (!isValidV2Slice(v)) return null
  const s = v as Partial<V2Slice> & V2Slice
  const isLocation = (x: unknown): x is LocationId => LOCATION_IDS.includes(x as LocationId)
  const chapter2 = s.chapter2 ?? { beat: 0, complete: false, firstMistake: false }
  // A save from before the ladder that finished Chapter 2 had reached $1,000 MRR (the first rung).
  const peakMrr = Math.max(typeof s.peakMrr === 'number' ? s.peakMrr : 0, chapter2.complete ? 1000 : 0)
  const saved = Array.isArray(s.unlockedLocations) ? s.unlockedLocations.filter(isLocation) : []
  const unlocked = LOCATIONS.filter(l => l.unlockMrr <= peakMrr || saved.includes(l.id)).map(l => l.id)
  return {
    ...s,
    team: s.team && typeof s.team === 'object' ? s.team : {},
    candidates: Array.isArray(s.candidates) ? s.candidates.map(c => ({ ...c, tier: c.tier ?? 'intern' })) : [],
    chapter2,
    location: isLocation(s.location) ? s.location : 'home',
    unlockedLocations: unlocked,
    peakMrr,
    chapter3: s.chapter3 ?? { beat: 0, complete: false },
    stats: { ...EMPTY_STATS, ...(s.stats ?? {}) },
    tickets: typeof s.tickets === 'number' ? s.tickets : 0,
    perks: Array.isArray(s.perks) ? s.perks : [],
    setups: s.setups && typeof s.setups.founder === 'number' && Array.isArray(s.setups.seats) ? s.setups : { founder: 1, seats: [] },
    infra: s.infra && typeof s.infra.hosting === 'number' ? { ...START_INFRA, ...s.infra } : { ...START_INFRA },
  }
}

/** True for a real v2 game (v2 id and a valid slice). */
export function isV2Game(state: { gameId?: string; v2?: unknown }): boolean {
  return typeof state.gameId === 'string' && state.gameId.startsWith('v2-') && isValidV2Slice(state.v2)
}

export function addStory<T extends Pick<CompanyState, 'gameTime' | 'storyLog'>>(state: T, lines: string[]): T {
  const day = totalDays(state.gameTime)
  return { ...state, storyLog: [{ day, lines }, ...state.storyLog].slice(0, 20) }
}
