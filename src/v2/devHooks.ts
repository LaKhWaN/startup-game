import { scoreToDifficulty } from '../ai/gemini'
import { FEATURE_TEMPLATES } from '../data/featureTemplates'
import { getV2State, newGameV2, startFounderTask, stepGame } from './actions'

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
  }
}
