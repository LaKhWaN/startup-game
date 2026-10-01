import { scoreToDifficulty } from '../ai/gemini'
import { FEATURE_TEMPLATES } from '../data/featureTemplates'
import { assignTeamMember, ensureCandidates, getV2State, hireCandidate, newGameV2, startFounderTask, stepGame } from './actions'
import { useGameStore } from '../store/gameStore'

/** Dev-only helpers so scripts/v2-screenshot.mjs can drive /new without the Groq onboarding. */
export function installDevHooks(): void {
  const w = window as unknown as { __v2?: unknown }
  w.__v2 = {
    quickStart: () => newGameV2({
      idea: 'A scheduling tool for dog groomers',
      ideaScore: 6,
      ideaFeedback: 'Dev quick start',
      workspace: 'home',
      startupName: 'Groomly',
      aiRoadmap: FEATURE_TEMPLATES.slice(0, 6),
      difficulty: scoreToDifficulty(6),
    }),
    startFounderTask,
    fastForward: (hours: number) => { for (let i = 0; i < hours; i++) stepGame() },
    getV2State,
    /** Skip Chapter 1 (complete, with cash) so the Team tab and hiring are open. */
    skipChapter1: (cash = 5000) => {
      const s = getV2State()
      useGameStore.setState({ cash, v2: { ...s.v2, chapter: { ...s.v2.chapter, beat: 5, complete: true } } } as never)
    },
    /** Hire the first available candidate; returns the hire check result. */
    hireFirst: () => {
      ensureCandidates()
      const c = getV2State().v2.candidates[0]
      return c ? hireCandidate(c.id) : 'missing'
    },
    assignTeamMember,
  }
}
