import { createInitialState, totalDays } from '../engine/gameEngine'
import type { GameState, MetricsSnapshot, OnboardingConfig } from '../types'

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

/** True only for a genuine v2 game — a legacy restart leaves a stale v2 slice but a legacy id. */
export function isV2Game(state: GameState & { v2?: unknown }): boolean {
  return typeof state.gameId === 'string' && state.gameId.startsWith('v2-') && isValidV2Slice(state.v2)
}

export function addStory<T extends GameState>(state: T, lines: string[]): T {
  const day = totalDays(state.gameTime)
  return { ...state, storyLog: [{ day, lines }, ...state.storyLog].slice(0, 20) }
}
