import { FEATURE_TEMPLATES, type FeatureTemplate } from '../data/featureTemplates'
import { totalDays } from './engine/clock'
import { estimateFeatureEffects } from './engine/features'
import { leadSaturation, marketRoom, reputationFactor, salesBaseOf } from './engine/market'
import type { Feature, FeatureResult } from '../types'
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
  support: 'outreach',
  refactor: 'build',
}

export const SUPPORT_DAYS = 1
export const REFACTOR_DAYS = 2

/** Anyone who can do a task: the founder or a hire. */
export interface Worker {
  id: string
  name: string
  skills: Record<FounderSkill, number>
}

export interface OutcomeOptions {
  mistake: boolean
  firstSaleGuarantee: boolean
}

function founderWorker(state: V2GameState): Worker {
  return { id: FOUNDER_ID, name: state.v2.founder.name, skills: state.v2.founder.skills }
}

const isFounder = (w: Worker) => w.id === FOUNDER_ID

export type StartTaskError = 'busy' | 'locked' | 'no-feature' | 'no-leads' | 'nothing-to-do'
export type StartTaskResult = { ok: true; state: V2GameState } | { ok: false; reason: StartTaskError }

export function taskDurationDays(
  state: Pick<V2GameState, 'features'> & { techDebt?: number },
  type: FounderTaskType,
  featureId?: string,
): number {
  switch (type) {
    case 'research': return RESEARCH_DAYS
    case 'emails': return EMAILS_DAYS
    case 'sales': return SALES_DAYS
    case 'support': return SUPPORT_DAYS
    case 'refactor': return REFACTOR_DAYS
    case 'develop': {
      const feature = state.features.find(f => f.id === featureId)
      // Tech debt slows every build, up to twice as long (spec §4).
      return ((feature?.baseDays ?? 1) / FOUNDER_BUILD_SPEED) * (1 + (state.techDebt ?? 0) / 100)
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
  if (type === 'support' && (state.v2.tickets ?? 0) < 1) return { ok: false, reason: 'nothing-to-do' }
  if (type === 'refactor' && state.techDebt < 1) return { ok: false, reason: 'nothing-to-do' }

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

export function pickResearchTemplates(
  state: V2GameState,
  rng: Rng,
  count: number = FEATURES_PER_RESEARCH,
): { templates: FeatureTemplate[]; newIndex: number } {
  const used = new Set(state.features.map(f => f.title))
  const templates: FeatureTemplate[] = []

  let idx = state.featureRoadmapIndex
  while (idx < state.featureRoadmap.length && templates.length < count) {
    const t = state.featureRoadmap[idx]
    idx++
    if (!used.has(t.title)) {
      templates.push(t)
      used.add(t.title)
    }
  }

  const pool = FEATURE_TEMPLATES.filter(t => !used.has(t.title))
  while (templates.length < count && pool.length > 0) {
    const i = Math.min(pool.length - 1, Math.floor(rng() * pool.length))
    const [t] = pool.splice(i, 1)
    templates.push(t)
    used.add(t.title)
  }

  return { templates, newIndex: idx }
}

function toFeature(t: FeatureTemplate, day: number, key: string, by: string): Feature {
  return {
    id: `feat-founder-${key}`,
    title: t.title,
    description: t.description,
    baseDays: t.baseDays,
    value: t.value,
    impacts: t.impacts,
    effects: t.effects,
    tradeoffHint: t.tradeoffHint,
    discoveredByPMId: by,
    status: 'proposed',
    buildProgress: 0,
    discoveredAtDay: day,
  }
}

function applyResearch(state: V2GameState, worker: Worker, rng: Rng, opts: OutcomeOptions): V2GameState {
  const count = opts.mistake ? 1 : FEATURES_PER_RESEARCH
  const { templates, newIndex } = pickResearchTemplates(state, rng, count)
  const day = totalDays(state.gameTime)
  const found = templates.map((t, i) => toFeature(t, day, `${state.gameTime.totalHours}-${worker.id}-${i}`, worker.id))
  const next: V2GameState = { ...state, features: [...state.features, ...found], featureRoadmapIndex: newIndex }
  const who = isFounder(worker) ? 'You' : worker.name
  const lines = [found.length === 0
    ? `${who} researched for days but found nothing new worth building.`
    : `${isFounder(worker) ? 'Research done' : `${worker.name} finished research`}. Worth building: ${found.map(f => `"${f.title}"`).join(' and ')}.`]
  if (opts.mistake) lines.push(`${worker.name} researched the wrong market for half the time, so only one idea came out of it.`)
  return addStory(next, lines)
}

// ── Develop ─────────────────────────────────────────────────────────────────

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n))
}

function applyDevelop(state: V2GameState, worker: Worker, featureId: string | undefined, opts: OutcomeOptions): V2GameState | null {
  const feature = state.features.find(f => f.id === featureId)
  if (!feature) return null

  const day = totalDays(state.gameTime)
  const diffMult = state.difficultyModifier?.featureImpactMultiplier ?? 1
  const churnFloor = state.difficultyModifier?.churnFloor ?? 3
  const raw = estimateFeatureEffects(feature.effects, feature.value, FOUNDER_ACCURACY, state.arpu, state.customers, diffMult)
  // A rushed intern build ships at half strength and leaves a mess behind.
  const half = (n: number) => (opts.mistake ? Math.round(n * 0.5) : n)
  const est = {
    ...raw,
    customers: half(raw.customers),
    arpu: half(raw.arpu),
    cashBonus: half(raw.cashBonus),
    brand: half(raw.brand),
    productGain: half(raw.productGain),
    churnDrop: opts.mistake ? raw.churnDrop * 0.5 : raw.churnDrop,
    techDebt: raw.techDebt + (opts.mistake ? 5 : 0),
  }

  const preSale = !state.v2.firstSaleDone
  const gain = Math.min(est.customers, marketRoom(state))
  const customers = preSale ? state.customers : Math.max(0, state.customers + gain)
  const leads = preSale ? Math.max(0, state.v2.leads + est.customers) : state.v2.leads
  const arpu = Math.max(10, state.arpu + est.arpu)

  const result: FeatureResult = {
    featureTitle: feature.title,
    value: feature.value,
    devName: worker.name,
    customerGain: preSale ? 0 : est.customers,
    arpuChange: est.arpu,
    churnDrop: est.churnDrop,
    brandChange: est.brand,
    techDebtChange: est.techDebt,
    cashBonus: est.cashBonus,
    completedAtDay: day,
  }

  const next: V2GameState = {
    ...state,
    features: state.features.map(f =>
      f.id === feature.id ? { ...f, status: 'completed' as const, buildProgress: 1, completedAtDay: day } : f,
    ),
    customers,
    arpu,
    mrr: customers * arpu,
    churnRate: Math.max(churnFloor, state.churnRate - est.churnDrop),
    cash: state.cash + est.cashBonus,
    brand: clamp100(state.brand + est.brand),
    techDebt: clamp100(state.techDebt + est.techDebt),
    productProgress: Math.min(100, state.productProgress + est.productGain),
    recentFeatureResults: [result, ...state.recentFeatureResults].slice(0, 3),
    v2: { ...state.v2, leads },
  }

  const who = isFounder(worker) ? 'You' : worker.name
  let line: string
  if (preSale && est.customers > 0) {
    line = `${who} shipped "${feature.title}"! ${est.customers} people joined the beta — leads, not paying customers yet.`
  } else if (preSale) {
    line = `${who} shipped "${feature.title}".`
  } else {
    line = `${who} shipped "${feature.title}"! ${est.customers >= 0 ? '+' : ''}${est.customers} users.`
  }
  const lines = [line]
  if (opts.mistake) lines.push(`${worker.name} rushed it: it shipped buggy, at half strength, and left tech debt behind.`)
  return addStory(next, lines)
}

// ── Emails ──────────────────────────────────────────────────────────────────

function applyEmails(state: V2GameState, worker: Worker, rng: Rng, opts: OutcomeOptions): V2GameState {
  const outreach = worker.skills.outreach
  // Fewer fresh prospects as the market fills up (spec §4).
  const full = Math.round((4 + outreach + rng() * 4) * (1 + state.brand / 100) * leadSaturation(state))
  const gained = opts.mistake ? Math.floor(full * 0.5) : full
  const next: V2GameState = { ...state, v2: { ...state.v2, leads: state.v2.leads + gained } }
  const lines = [`${isFounder(worker) ? 'You' : worker.name} sent a round of cold emails. ${gained} new leads.`]
  if (opts.mistake) lines.push(`${worker.name} had a typo in the subject line, so half the emails went to spam.`)
  return addStory(next, lines)
}

// ── Sales ───────────────────────────────────────────────────────────────────

function applySales(state: V2GameState, worker: Worker, rng: Rng, opts: OutcomeOptions): V2GameState {
  const contacted = state.v2.leads
  const p = (salesBaseOf(state) + 0.03 * worker.skills.sales) * reputationFactor(state)
  let converted = 0
  for (let i = 0; i < contacted; i++) if (rng() < p) converted++
  if (opts.firstSaleGuarantee && !state.v2.firstSaleDone && contacted > 0) converted = Math.max(1, converted)
  if (opts.mistake) converted = Math.max(0, converted - 1)
  converted = Math.min(converted, marketRoom(state))

  const customers = state.customers + converted
  const next: V2GameState = {
    ...state,
    customers,
    mrr: customers * state.arpu,
    v2: { ...state.v2, leads: 0, firstSaleDone: state.v2.firstSaleDone || customers > 0 },
  }
  const prefix = isFounder(worker) ? 'Sales calls done' : `${worker.name} finished sales calls`
  const lines = [converted > 0
    ? `${prefix}: ${converted} of ${contacted} leads became paying customers.`
    : `${prefix}: none of ${contacted} leads bought this time.`]
  if (opts.mistake) lines.push(`${worker.name} fumbled a call that was about to close.`)
  return addStory(next, lines)
}

// ── Support & refactor ──────────────────────────────────────────────────────

function applySupport(state: V2GameState, worker: Worker, opts: OutcomeOptions): V2GameState {
  const capacity = 8 + 2 * worker.skills.outreach
  const cleared = Math.min(state.v2.tickets ?? 0, Math.floor(opts.mistake ? capacity / 2 : capacity))
  const next: V2GameState = { ...state, v2: { ...state.v2, tickets: (state.v2.tickets ?? 0) - cleared } }
  const lines = [`${isFounder(worker) ? 'You' : worker.name} answered ${cleared} support ticket${cleared === 1 ? '' : 's'}.`]
  if (opts.mistake) lines.push(`${worker.name} pasted the wrong macro into half the replies.`)
  return addStory(next, lines)
}

function applyRefactor(state: V2GameState, worker: Worker, opts: OutcomeOptions): V2GameState {
  const paid = 12 + 2 * worker.skills.build
  const drop = Math.round(opts.mistake ? paid / 2 : paid)
  const techDebt = Math.max(0, state.techDebt - drop)
  const lines = [`${isFounder(worker) ? 'You' : worker.name} cleaned up the codebase: tech debt ${Math.round(state.techDebt)} → ${Math.round(techDebt)}.`]
  if (opts.mistake) lines.push(`${worker.name} broke a test while refactoring and had to roll half of it back.`)
  return addStory({ ...state, techDebt }, lines)
}

// ── Outcome dispatch ────────────────────────────────────────────────────────

/** Returns null when the task has no outcome (e.g. develop on a feature that disappeared). */
export function applyOutcome(
  state: V2GameState,
  worker: Worker,
  task: FounderTask,
  rng: Rng,
  opts: OutcomeOptions,
): V2GameState | null {
  let after: V2GameState | null
  switch (task.type) {
    case 'research': after = applyResearch(state, worker, rng, opts); break
    case 'develop': after = applyDevelop(state, worker, task.featureId, opts); break
    case 'emails': after = applyEmails(state, worker, rng, opts); break
    case 'sales': after = applySales(state, worker, rng, opts); break
    case 'support': after = applySupport(state, worker, opts); break
    case 'refactor': after = applyRefactor(state, worker, opts); break
  }
  return after && countStats(state, after, task.type, opts.mistake)
}

/** Lifetime counters for the stats rail, from the before/after of one finished task. */
function countStats(before: V2GameState, after: V2GameState, type: FounderTaskType, mistake: boolean): V2GameState {
  const s = { ...after.v2.stats }
  const newLeads = Math.max(0, after.v2.leads - before.v2.leads)
  if (type === 'research') s.researchRounds++
  if (type === 'develop') { s.featuresShipped++; s.leadsFound += newLeads }
  if (type === 'emails') { s.emailRounds++; s.leadsFound += newLeads }
  if (type === 'sales') { s.salesCalls++; s.customersWon += Math.max(0, after.customers - before.customers) }
  if (mistake) s.mistakes++
  return { ...after, v2: { ...after.v2, stats: s } }
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
  const outcome = applyOutcome(cleared, founderWorker(cleared), task, rng, { mistake: false, firstSaleGuarantee: true })
  if (!outcome) return { state: cleared, completed: null }
  return { state: growSkill(outcome, TASK_SKILL[task.type]), completed: task.type }
}

/**
 * Repairs a state where the founder's task and features disagree (hand-edited
 * or corrupted saves). An orphaned founder build goes back to "proposed" and a
 * develop task pointing at a missing feature is dropped.
 */
export function reconcileFounderFeatures(state: V2GameState): V2GameState {
  const task = state.v2.founder.task
  const buildingId = task?.type === 'develop' ? task.featureId : undefined
  const taskValid = !task || task.type !== 'develop' ||
    state.features.some(f => f.id === buildingId && f.status === 'in_development')

  let changed = false
  const features = state.features.map(f => {
    const orphaned = f.status === 'in_development' && f.assignedToDevId === FOUNDER_ID && (!taskValid || f.id !== buildingId)
    if (!orphaned) return f
    changed = true
    return { ...f, status: 'proposed' as const, assignedToDevId: undefined, buildProgress: 0 }
  })

  if (!changed && taskValid) return state
  return withTask({ ...state, features }, taskValid ? task : null)
}
