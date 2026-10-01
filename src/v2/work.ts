import { taskDurationDays } from './founder'
import type { FounderSkill, FounderTaskType, TeamRole, Tier, V2GameState } from './state'

export const MAIN_TASK: Record<TeamRole, FounderTaskType> = {
  developer: 'develop',
  product_manager: 'research',
  marketing: 'emails',
  sales: 'sales',
}

const TASK_SKILL_OF: Record<FounderTaskType, FounderSkill> = {
  research: 'research',
  develop: 'build',
  emails: 'outreach',
  sales: 'sales',
  support: 'outreach',
  refactor: 'build',
}

export interface TierRule {
  mainSpeed: number
  offSpeed: number
  skillMain: number
  skillOther: number
  gain: number
  cap: number
}

/** Spec §7.2 (interns) and §8.3 (full-time). */
export const TIER_RULES: Record<Tier, TierRule> = {
  intern: { mainSpeed: 0.8, offSpeed: 0.4, skillMain: 3, skillOther: 1, gain: 0.25, cap: 6 },
  fulltime: { mainSpeed: 1, offSpeed: 0.5, skillMain: 5, skillOther: 2, gain: 0.2, cap: 9 },
}

/** A hire's working day (09:00–17:00). Their task durations are counted in these. */
export const WORK_DAY_HOURS = 8

export const INTERN_MAIN_SPEED = TIER_RULES.intern.mainSpeed
export const INTERN_OFF_SPEED = TIER_RULES.intern.offSpeed

export function hireSpeed(role: TeamRole, type: FounderTaskType, tier: Tier = 'intern'): number {
  const rule = TIER_RULES[tier]
  // Anyone can answer support well; it's not a specialist task.
  return MAIN_TASK[role] === type || type === 'support' ? rule.mainSpeed : rule.offSpeed
}

export function mainSkillOf(role: TeamRole): FounderSkill {
  return TASK_SKILL_OF[MAIN_TASK[role]]
}

/**
 * Interns: 15% at main skill 3, −2% per point above, never below 5%.
 * Full-time: 5% at main skill 5, −1% per point above, never below 1%.
 */
export function mistakeChance(m: { role: TeamRole; skills: Record<FounderSkill, number>; tier?: Tier }): number {
  const main = m.skills[mainSkillOf(m.role)]
  return m.tier === 'fulltime'
    ? Math.max(0.01, 0.05 - 0.01 * (main - 5))
    : Math.max(0.05, 0.15 - 0.02 * (main - 3))
}

/** A worker's duration: the founder's duration stretched by 1/speed. */
export function workerDurationDays(
  state: Pick<V2GameState, 'features'>,
  type: FounderTaskType,
  featureId: string | undefined,
  speed: number,
): number {
  return taskDurationDays(state, type, featureId) / speed
}
