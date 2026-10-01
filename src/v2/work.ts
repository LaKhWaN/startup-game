import { taskDurationDays } from './founder'
import type { FounderSkill, FounderTaskType, TeamRole, V2GameState } from './state'

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
}

export const INTERN_MAIN_SPEED = 0.7
export const INTERN_OFF_SPEED = 0.35

export function hireSpeed(role: TeamRole, type: FounderTaskType): number {
  return MAIN_TASK[role] === type ? INTERN_MAIN_SPEED : INTERN_OFF_SPEED
}

export function mainSkillOf(role: TeamRole): FounderSkill {
  return TASK_SKILL_OF[MAIN_TASK[role]]
}

/** 15% at main skill 3, −2% per point above, never below 5%. */
export function mistakeChance(m: { role: TeamRole; skills: Record<FounderSkill, number> }): number {
  return Math.max(0.05, 0.15 - 0.02 * (m.skills[mainSkillOf(m.role)] - 3))
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
