import { createInitialState, totalDays } from '../engine/gameEngine'
import type { EmployeeRole, GameState, MetricsSnapshot, OnboardingConfig } from '../types'

export type FounderTaskType = 'research' | 'develop' | 'emails' | 'sales'
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

export interface V2Slice {
  founder: {
    name: string
    task: FounderTask | null
    skills: Record<FounderSkill, number>
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
}

export type V2GameState = GameState & { v2: V2Slice }

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
  }
}

export function createV2State(config: OnboardingConfig): V2GameState {
  const base = createInitialState({ ...config, workspace: 'home' })
  const snapshot: MetricsSnapshot = {
    ...base.metricsHistory[0],
    cash: FOUNDER_START_CASH,
    burn: 0,
    runway: 999,
    valuation: FOUNDER_START_CASH,
  }
  const ideaLine = config.idea.length > 80 ? `${config.idea.slice(0, 80)}...` : config.idea

  return {
    ...base,
    cash: FOUNDER_START_CASH,
    infraCostMonthly: 0,
    employees: [],
    candidates: [],
    deskCount: 0,
    gameId: `v2-${base.gameId}`,
    metricsHistory: [snapshot],
    fullMetricsHistory: [snapshot],
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
  const unlocked = Array.isArray(s.unlockedLocations) ? s.unlockedLocations.filter(isLocation) : []
  return {
    ...s,
    team: s.team && typeof s.team === 'object' ? s.team : {},
    candidates: Array.isArray(s.candidates) ? s.candidates.map(c => ({ ...c, tier: c.tier ?? 'intern' })) : [],
    chapter2: s.chapter2 ?? { beat: 0, complete: false, firstMistake: false },
    location: isLocation(s.location) ? s.location : 'home',
    unlockedLocations: unlocked.includes('home') ? unlocked : ['home', ...unlocked],
    peakMrr: typeof s.peakMrr === 'number' ? s.peakMrr : 0,
    chapter3: s.chapter3 ?? { beat: 0, complete: false },
  }
}

/** True only for a genuine v2 game — a legacy restart leaves a stale v2 slice but a legacy id. */
export function isV2Game(state: GameState & { v2?: unknown }): boolean {
  return typeof state.gameId === 'string' && state.gameId.startsWith('v2-') && isValidV2Slice(state.v2)
}

export function addStory<T extends GameState>(state: T, lines: string[]): T {
  const day = totalDays(state.gameTime)
  return { ...state, storyLog: [{ day, lines }, ...state.storyLog].slice(0, 20) }
}
