import { scoreToDifficulty } from '../ai/gemini'
import { FEATURE_TEMPLATES } from '../data/featureTemplates'
import { assignTeamMember, ensureCandidates, fireTeamMember, getV2State, hireCandidate, moveToLocation, newGameV2, refreshCandidates, startFounderTask, stepGame } from './actions'
import { useGameStore } from '../store/gameStore'
import { locationDef, LOCATIONS } from './locations'
import type { LocationId } from './state'

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
    /** Jump to Chapter 3: Chapters 1–2 done, peak MRR $2,600 (unlocks up to the Villa). */
    skipToChapter3: (cash = 50_000) => {
      const s = getV2State()
      useGameStore.setState({
        cash,
        mrr: 2600,
        v2: {
          ...s.v2,
          chapter: { ...s.v2.chapter, beat: 5, complete: true },
          chapter2: { beat: 2, complete: true, firstMistake: false },
          peakMrr: 2600,
          unlockedLocations: ['home', 'biggerHome', 'villa'],
        },
      } as never)
    },
    moveToLocation,
    /** Unlock everything, move to `loc` and fill a few seats (screenshots). */
    jumpTo: (loc: LocationId) => {
      const s = getV2State()
      useGameStore.setState({
        cash: 500_000,
        v2: {
          ...s.v2,
          chapter: { ...s.v2.chapter, beat: 5, complete: true },
          chapter2: { beat: 2, complete: true, firstMistake: false },
          peakMrr: 100_000,
          unlockedLocations: LOCATIONS.map(l => l.id),
        },
      } as never)
      for (const id of Object.keys(getV2State().v2.team).slice(locationDef(loc).capacity)) fireTeamMember(id)
      const moved = moveToLocation(loc)
      const target = Math.min(locationDef(loc).capacity, 8)
      for (let i = 0; i < target * 4 && Object.keys(getV2State().v2.team).length < target; i++) {
        ensureCandidates()
        const c = getV2State().v2.candidates[0]
        if (!c || hireCandidate(c.id) !== 'ok') refreshCandidates()
      }
      stepGame()
      return moved
    },
    /** Hire up to n candidates, rerolling the pool as needed; returns how many were hired. */
    hireMany: (n: number) => {
      let hired = 0
      for (let tries = 0; hired < n && tries < n * 4; tries++) {
        ensureCandidates()
        const c = getV2State().v2.candidates[0]
        if (!c) { refreshCandidates(); continue }
        if (hireCandidate(c.id) === 'ok') hired++
        else refreshCandidates()
      }
      return hired
    },
  }
}
