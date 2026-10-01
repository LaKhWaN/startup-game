import { generateCandidate, ROLE_LABELS } from '../data/candidates'
import { getMonthlyBurn, getRunwayMonths, totalDays } from '../engine/gameEngine'
import type { Employee } from '../types'
import { applyOutcome, pickResearchTemplates } from './founder'
import { currentLocation, locationIndex } from './locations'
import { addStory, type Assignment, type FounderSkill, type FounderTask, type FounderTaskType, type InternCandidate, type Rng, type TeamMember, type TeamRole, type Tier, type V2GameState } from './state'
import { hireSpeed, MAIN_TASK, mainSkillOf, mistakeChance, TIER_RULES, workerDurationDays } from './work'

export const HOME_CAPACITY = 2
export const INTERN_SKILL_MAIN = TIER_RULES.intern.skillMain
export const INTERN_SKILL_OTHER = TIER_RULES.intern.skillOther
export const INTERN_SKILL_GAIN = TIER_RULES.intern.gain
export const INTERN_SKILL_CAP = TIER_RULES.intern.cap
/** Full-time hires unlock at this ladder index (the Villa). */
export const FULLTIME_STAGE = 2
export const PROMOTE_SKILL = 5
export const FULLTIME_MIN_SALARY = 2000

const EPSILON = 1e-9

/** Kenney minis used for interns (the founder is character-male-a). */
export const INTERN_MODELS: Record<'male' | 'female', string[]> = {
  male: ['character-male-b', 'character-male-c', 'character-male-d', 'character-male-e', 'character-male-f'],
  female: ['character-female-a', 'character-female-b', 'character-female-c', 'character-female-d', 'character-female-e', 'character-female-f'],
}

const ROLES: TeamRole[] = ['developer', 'product_manager', 'marketing', 'sales']

const SKILL_OF_TASK: Record<FounderTaskType, FounderSkill> = {
  research: 'research',
  develop: 'build',
  emails: 'outreach',
  sales: 'sales',
}

/** How many hires fit in the current space. */
export function teamCapacity(state: V2GameState): number {
  return currentLocation(state).capacity
}

const pick = <T,>(arr: T[], rng: Rng): T => arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))]

export function isFullTimeUnlocked(state: Pick<V2GameState, 'v2'>): boolean {
  return locationIndex(state.v2.location) >= FULLTIME_STAGE
}

function makeCandidates(rng: Rng, count: number, tier: Tier): InternCandidate[] {
  const rule = TIER_RULES[tier]
  return Array.from({ length: count }, () => {
    const role = pick(ROLES, rng)
    const base = generateCandidate(role) // names, gender, bio from the legacy pools
    const skills: Record<FounderSkill, number> = {
      research: rule.skillOther, build: rule.skillOther, outreach: rule.skillOther, sales: rule.skillOther,
      [mainSkillOf(role)]: rule.skillMain,
    }
    const step = Math.min(4, Math.floor(rng() * 5))
    const salary = tier === 'fulltime' ? FULLTIME_MIN_SALARY + step * 250 : 600 + step * 100
    return {
      id: `${tier === 'fulltime' ? 'ft' : 'intern'}-${base.id}`,
      name: base.name,
      gender: base.gender,
      role,
      tier,
      skills,
      salary,
      bio: base.bio,
      characterModel: pick(INTERN_MODELS[base.gender], rng),
    }
  })
}

export function generateInternCandidates(rng: Rng, count = 3): InternCandidate[] {
  return makeCandidates(rng, count, 'intern')
}

/** The hiring pool: 3 interns, plus 2 full-time candidates once full-time is unlocked. */
export function generateCandidates(rng: Rng, opts: { fullTime: boolean }): InternCandidate[] {
  return [...makeCandidates(rng, 3, 'intern'), ...(opts.fullTime ? makeCandidates(rng, 2, 'fulltime') : [])]
}

export type HireCheck = 'ok' | 'full' | 'cash' | 'missing' | 'locked'

export function canHire(state: V2GameState, candidateId: string): HireCheck {
  const c = state.v2.candidates.find(x => x.id === candidateId)
  if (!c) return 'missing'
  if (c.tier === 'fulltime' && !isFullTimeUnlocked(state)) return 'locked'
  if (Object.keys(state.v2.team).length >= teamCapacity(state)) return 'full'
  if (state.cash < c.salary) return 'cash'
  return 'ok'
}

function freeSeat(state: V2GameState): number {
  const taken = new Set(Object.values(state.v2.team).map(m => m.seat))
  let seat = 0
  while (taken.has(seat)) seat++
  return seat
}

export function hireIntern(state: V2GameState, candidateId: string): V2GameState {
  if (canHire(state, candidateId) !== 'ok') return state
  const c = state.v2.candidates.find(x => x.id === candidateId)!
  const member: TeamMember = {
    id: c.id,
    name: c.name,
    gender: c.gender,
    role: c.role,
    tier: c.tier,
    skills: { ...c.skills },
    assignment: MAIN_TASK[c.role],
    task: null,
    mistakes: 0,
    seat: freeSeat(state),
    characterModel: c.characterModel,
    salary: c.salary,
  }
  // Legacy payroll mirror: an idle "developer" with no feature is inert in the
  // legacy daily loop, so legacy only deducts salary and runs morale drift.
  const mirror: Employee = {
    id: c.id,
    name: c.name,
    role: 'developer',
    stats: { [mainSkillOf(c.role)]: TIER_RULES[c.tier].skillMain },
    salary: c.salary,
    status: 'idle',
    gender: c.gender,
    ideaProgress: 0,
    hiredAtDay: totalDays(state.gameTime),
    morale: 72,
    stress: 15,
    xp: 0,
    level: 1,
  }
  const chapter2 = state.v2.chapter2.beat === 0 ? { ...state.v2.chapter2, beat: 1 as const } : state.v2.chapter2
  const next: V2GameState = {
    ...state,
    employees: [...state.employees, mirror],
    v2: {
      ...state.v2,
      team: { ...state.v2.team, [c.id]: member },
      candidates: state.v2.candidates.filter(x => x.id !== c.id),
      chapter2,
    },
  }
  const title = c.tier === 'fulltime' ? `full-time ${ROLE_LABELS[c.role].toLowerCase()}` : `${ROLE_LABELS[c.role].toLowerCase()} intern`
  return addStory(next, [`${c.name} joined as a ${title} ($${c.salary.toLocaleString()}/mo).`])
}

function freeFeatureOf(state: V2GameState, memberId: string): V2GameState {
  if (!state.features.some(f => f.status === 'in_development' && f.assignedToDevId === memberId)) return state
  return {
    ...state,
    features: state.features.map(f =>
      f.status === 'in_development' && f.assignedToDevId === memberId
        ? { ...f, status: 'proposed' as const, assignedToDevId: undefined, buildProgress: 0 }
        : f,
    ),
  }
}

function removeMember(state: V2GameState, id: string): V2GameState {
  const { [id]: _gone, ...team } = state.v2.team
  return {
    ...freeFeatureOf(state, id),
    employees: state.employees.filter(e => e.id !== id),
    v2: { ...state.v2, team },
  }
}

export function fireMember(state: V2GameState, id: string): V2GameState {
  const m = state.v2.team[id]
  if (!m) return state
  return addStory(removeMember(state, id), [`You let ${m.name} go.`])
}

export function setAssignment(state: V2GameState, id: string, assignment: Assignment): V2GameState {
  const m = state.v2.team[id]
  if (!m || m.assignment === assignment) return state
  const keepTask = m.task && m.task.type === assignment
  const base = keepTask ? state : freeFeatureOf(state, id)
  return withMember(base, { ...m, assignment, task: keepTask ? m.task : null })
}

function withMember(state: V2GameState, m: TeamMember): V2GameState {
  return { ...state, v2: { ...state.v2, team: { ...state.v2.team, [m.id]: m } } }
}

export type PromoteCheck = 'ok' | 'missing' | 'tier' | 'skill' | 'locked'

export function canPromote(state: V2GameState, id: string): PromoteCheck {
  const m = state.v2.team[id]
  if (!m) return 'missing'
  if (m.tier !== 'intern') return 'tier'
  if (!isFullTimeUnlocked(state)) return 'locked'
  if (m.skills[mainSkillOf(m.role)] < PROMOTE_SKILL) return 'skill'
  return 'ok'
}

/** Intern → full-time: same person, skills and task; better rules; salary at least $2,000. */
export function promoteMember(state: V2GameState, id: string): V2GameState {
  if (canPromote(state, id) !== 'ok') return state
  const m = state.v2.team[id]
  const salary = Math.max(m.salary, FULLTIME_MIN_SALARY)
  const next: V2GameState = {
    ...withMember(state, { ...m, tier: 'fulltime', salary }),
    employees: state.employees.map(e => (e.id === id ? { ...e, salary } : e)),
  }
  return addStory(next, [`${m.name} was promoted to full-time ($${salary.toLocaleString()}/mo).`])
}

/**
 * What a worker does next. Today it follows the standing assignment; a later
 * phase lets a manager supply this decision for the people reporting to them.
 */
export function chooseNextTask(member: TeamMember, state: V2GameState): FounderTask | null {
  switch (member.assignment) {
    case 'idle': return null
    case 'research':
      return pickResearchTemplates(state, () => 0, 1).templates.length > 0 ? { type: 'research', progress: 0 } : null
    case 'develop': {
      const free = state.features.find(f => f.status === 'proposed')
      return free ? { type: 'develop', featureId: free.id, progress: 0 } : null
    }
    case 'emails': return { type: 'emails', progress: 0 }
    case 'sales': return state.v2.leads >= 1 ? { type: 'sales', progress: 0 } : null
  }
}

function claimFeature(state: V2GameState, featureId: string, by: string): V2GameState {
  return {
    ...state,
    features: state.features.map(f =>
      f.id === featureId ? { ...f, status: 'in_development' as const, assignedToDevId: by, buildProgress: 0 } : f,
    ),
  }
}

export interface TeamTickResult {
  state: V2GameState
  completedBy: string[]
  mistakes: string[]
}

/** Advances every hire by `hours`: start the next task, progress it, apply its outcome. */
export function advanceTeam(state: V2GameState, hours: number, rng: Rng): TeamTickResult {
  let s = state
  const completedBy: string[] = []
  const mistakes: string[] = []
  const ids = Object.values(s.v2.team).sort((a, b) => a.seat - b.seat).map(m => m.id)

  for (const id of ids) {
    let m = s.v2.team[id]
    if (!m) continue
    if (!m.task) {
      const next = chooseNextTask(m, s)
      if (!next) continue
      if (next.type === 'develop' && next.featureId) s = claimFeature(s, next.featureId, id)
      m = { ...m, task: next }
      s = withMember(s, m)
    }
    if (hours <= 0 || !m.task) continue

    const task = m.task
    const days = workerDurationDays(s, task.type, task.featureId, hireSpeed(m.role, task.type, m.tier))
    const progress = Math.min(1, task.progress + hours / (24 * days))
    if (progress < 1 - EPSILON) {
      if (task.type === 'develop') {
        s = { ...s, features: s.features.map(f => (f.id === task.featureId ? { ...f, buildProgress: progress } : f)) }
      }
      s = withMember(s, { ...m, task: { ...task, progress } })
      continue
    }

    const cleared = withMember(s, { ...m, task: null })
    // Someone else (e.g. the founder) already called every lead: nothing to do or learn.
    if (task.type === 'sales' && s.v2.leads < 1) {
      s = addStory(cleared, [`${m.name} picked up the phone, but those leads were already called.`])
      continue
    }
    const mistake = rng() < mistakeChance(m)
    const outcome = applyOutcome(cleared, { id, name: m.name, skills: m.skills }, task, rng, { mistake, firstSaleGuarantee: false })
    if (!outcome) { s = cleared; continue }

    const skill = SKILL_OF_TASK[task.type]
    const rule = TIER_RULES[m.tier]
    const grown: TeamMember = {
      ...outcome.v2.team[id],
      skills: { ...m.skills, [skill]: Math.min(rule.cap, m.skills[skill] + rule.gain) },
      mistakes: m.mistakes + (mistake ? 1 : 0),
    }
    s = withMember(outcome, grown)
    completedBy.push(id)
    if (mistake) mistakes.push(id)
  }

  return { state: s, completedBy, mistakes }
}

/**
 * Keeps the legacy payroll mirror in step with the team: drops members a
 * legacy event removed (e.g. someone quit), and holds the mirror inert with
 * fixed morale/stress so the legacy cash<$10k stress spiral never applies.
 */
export function syncPayroll(state: V2GameState): V2GameState {
  let s = state
  const onPayroll = new Set(s.employees.map(e => e.id))
  for (const m of Object.values(s.v2.team)) {
    if (!onPayroll.has(m.id)) s = addStory(removeMember(s, m.id), [`${m.name} left the company.`])
  }
  if (Object.keys(s.v2.team).length === 0) return s
  // The mirror's salary is the one legacy actually pays (events can change it).
  let team = s.v2.team
  for (const e of s.employees) {
    const m = team[e.id]
    if (m && m.salary !== e.salary) team = { ...team, [e.id]: { ...m, salary: e.salary } }
  }
  if (team !== s.v2.team) s = { ...s, v2: { ...s.v2, team } }
  return {
    ...s,
    employees: s.employees.map(e => {
      const m = team[e.id]
      if (!m) return e
      return { ...e, role: 'developer' as const, status: m.task ? 'busy' as const : 'idle' as const, currentFeatureId: undefined, isRefactoring: false, morale: 72, stress: 15, xp: 0, level: 1 }
    }),
  }
}

/** Monthly burn and runway the way the legacy banner counts it (net of MRR). */
export function teamFinances(state: V2GameState): { burn: number; runwayMonths: number } {
  const runway = getRunwayMonths(state)
  return { burn: getMonthlyBurn(state), runwayMonths: runway >= 999 ? Infinity : runway }
}
