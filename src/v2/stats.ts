import type { V2GameState } from './state'

export interface RailStats {
  /** People (founder included) with a task right now. */
  working: number
  /** Hires with an assignment but nothing to do yet (e.g. sales with no leads). */
  waiting: number
  /** Hires set to Idle, plus the founder when free. */
  idle: number
  /** Features researched but not started. */
  ideas: number
  /** Features being built right now. */
  building: number
}

export function railStats(state: Pick<V2GameState, 'v2' | 'features'>): RailStats {
  const team = Object.values(state.v2.team)
  const founderBusy = state.v2.founder.task !== null
  return {
    working: (founderBusy ? 1 : 0) + team.filter(m => m.task).length,
    waiting: team.filter(m => !m.task && m.assignment !== 'idle').length,
    idle: (founderBusy ? 0 : 1) + team.filter(m => !m.task && m.assignment === 'idle').length,
    ideas: state.features.filter(f => f.status === 'proposed').length,
    building: state.features.filter(f => f.status === 'in_development').length,
  }
}
