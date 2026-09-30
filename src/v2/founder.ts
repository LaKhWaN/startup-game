import { FEATURE_TEMPLATES, type FeatureTemplate } from '../data/featureTemplates'
import { totalDays } from '../engine/gameEngine'
import type { Feature } from '../types'
import { isTaskUnlocked } from './chapter'
import { addStory, type FounderSkill, type FounderTask, type FounderTaskType, type Rng, type V2GameState } from './state'

export const FOUNDER_ID = 'founder'
export const RESEARCH_DAYS = 3
export const EMAILS_DAYS = 2
export const SALES_DAYS = 2
export const FOUNDER_BUILD_SPEED = 0.6
export const FEATURES_PER_RESEARCH = 2
export const SKILL_GAIN = 0.5
export const SKILL_CAP = 8
export const FOUNDER_ACCURACY = 5

const EPSILON = 1e-9

export const TASK_SKILL: Record<FounderTaskType, FounderSkill> = {
  research: 'research',
  develop: 'build',
  emails: 'outreach',
  sales: 'sales',
}

export type StartTaskError = 'busy' | 'locked' | 'no-feature' | 'no-leads'
export type StartTaskResult = { ok: true; state: V2GameState } | { ok: false; reason: StartTaskError }

export function taskDurationDays(
  state: Pick<V2GameState, 'features'>,
  type: FounderTaskType,
  featureId?: string,
): number {
  switch (type) {
    case 'research': return RESEARCH_DAYS
    case 'emails': return EMAILS_DAYS
    case 'sales': return SALES_DAYS
    case 'develop': {
      const feature = state.features.find(f => f.id === featureId)
      return (feature?.baseDays ?? 1) / FOUNDER_BUILD_SPEED
    }
  }
}

function withTask(state: V2GameState, task: FounderTask | null): V2GameState {
  return { ...state, v2: { ...state.v2, founder: { ...state.v2.founder, task } } }
}

export function startTask(state: V2GameState, type: FounderTaskType, featureId?: string): StartTaskResult {
  if (state.v2.founder.task) return { ok: false, reason: 'busy' }
  if (!isTaskUnlocked(state, type)) return { ok: false, reason: 'locked' }
  if (type === 'sales' && state.v2.leads < 1) return { ok: false, reason: 'no-leads' }

  let features = state.features
  if (type === 'develop') {
    const feature = state.features.find(f => f.id === featureId)
    if (!feature || feature.status !== 'proposed') return { ok: false, reason: 'no-feature' }
    features = state.features.map(f =>
      f.id === featureId ? { ...f, status: 'in_development' as const, assignedToDevId: FOUNDER_ID, buildProgress: 0 } : f,
    )
  }

  const task: FounderTask = { type, progress: 0, ...(type === 'develop' ? { featureId } : {}) }
  return { ok: true, state: withTask({ ...state, features }, task) }
}

function growSkill(state: V2GameState, skill: FounderSkill): V2GameState {
  const skills = state.v2.founder.skills
  return {
    ...state,
    v2: {
      ...state.v2,
      founder: { ...state.v2.founder, skills: { ...skills, [skill]: Math.min(SKILL_CAP, skills[skill] + SKILL_GAIN) } },
    },
  }
}

// ── Research ────────────────────────────────────────────────────────────────

export function pickResearchTemplates(state: V2GameState, rng: Rng): { templates: FeatureTemplate[]; newIndex: number } {
  const used = new Set(state.features.map(f => f.title))
  const templates: FeatureTemplate[] = []

  let idx = state.featureRoadmapIndex
  while (idx < state.featureRoadmap.length && templates.length < FEATURES_PER_RESEARCH) {
    const t = state.featureRoadmap[idx]
    idx++
    if (!used.has(t.title)) {
      templates.push(t)
      used.add(t.title)
    }
  }

  const pool = FEATURE_TEMPLATES.filter(t => !used.has(t.title))
  while (templates.length < FEATURES_PER_RESEARCH && pool.length > 0) {
    const i = Math.min(pool.length - 1, Math.floor(rng() * pool.length))
    const [t] = pool.splice(i, 1)
    templates.push(t)
    used.add(t.title)
  }

  return { templates, newIndex: idx }
}

function toFeature(t: FeatureTemplate, day: number, key: string): Feature {
  return {
    id: `feat-founder-${key}`,
    title: t.title,
    description: t.description,
    baseDays: t.baseDays,
    value: t.value,
    impacts: t.impacts,
    effects: t.effects,
    tradeoffHint: t.tradeoffHint,
    discoveredByPMId: FOUNDER_ID,
    status: 'proposed',
    buildProgress: 0,
    discoveredAtDay: day,
  }
}

function applyResearch(state: V2GameState, rng: Rng): V2GameState {
  const { templates, newIndex } = pickResearchTemplates(state, rng)
  const day = totalDays(state.gameTime)
  const found = templates.map((t, i) => toFeature(t, day, `${state.gameTime.totalHours}-${i}`))
  const next: V2GameState = { ...state, features: [...state.features, ...found], featureRoadmapIndex: newIndex }
  const line = found.length === 0
    ? 'You researched for days but found nothing new worth building.'
    : `Research done. Worth building: ${found.map(f => `"${f.title}"`).join(' and ')}.`
  return addStory(next, [line])
}

// ── Outcome dispatch ────────────────────────────────────────────────────────

/** Returns null when the task has no outcome (e.g. develop on a feature that disappeared). */
function applyOutcome(state: V2GameState, task: FounderTask, rng: Rng): V2GameState | null {
  switch (task.type) {
    case 'research': return applyResearch(state, rng)
    default: return null // develop / emails / sales land in Task 4
  }
}

// ── Advance ─────────────────────────────────────────────────────────────────

export interface AdvanceResult {
  state: V2GameState
  completed: FounderTaskType | null
}

export function advanceFounder(state: V2GameState, hours: number, rng: Rng): AdvanceResult {
  const task = state.v2.founder.task
  if (!task || hours <= 0) return { state, completed: null }

  const days = taskDurationDays(state, task.type, task.featureId)
  const progress = Math.min(1, task.progress + hours / (24 * days))

  if (progress < 1 - EPSILON) {
    const features = task.type === 'develop'
      ? state.features.map(f => (f.id === task.featureId ? { ...f, buildProgress: progress } : f))
      : state.features
    return { state: withTask({ ...state, features }, { ...task, progress }), completed: null }
  }

  const cleared = withTask(state, null)
  const outcome = applyOutcome(cleared, task, rng)
  if (!outcome) return { state: cleared, completed: null }
  return { state: growSkill(outcome, TASK_SKILL[task.type]), completed: task.type }
}
