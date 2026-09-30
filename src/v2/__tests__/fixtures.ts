import { scoreToDifficulty } from '../../ai/gemini'
import { FEATURE_TEMPLATES } from '../../data/featureTemplates'
import type { Feature, OnboardingConfig } from '../../types'
import { createV2State, type Rng, type V2GameState, type V2Slice } from '../state'

export function makeConfig(overrides: Partial<OnboardingConfig> = {}): OnboardingConfig {
  return {
    idea: 'A scheduling tool for dog groomers',
    ideaScore: 6,
    ideaFeedback: 'Solid niche.',
    workspace: 'office', // deliberately not 'home' — createV2State must override it
    startupName: 'Groomly',
    aiRoadmap: FEATURE_TEMPLATES.slice(0, 4),
    difficulty: scoreToDifficulty(6),
    ...overrides,
  }
}

export function makeState(overrides: Partial<V2GameState> = {}): V2GameState {
  return { ...createV2State(makeConfig()), ...overrides }
}

export function withV2(state: V2GameState, patch: Partial<V2Slice>): V2GameState {
  return { ...state, v2: { ...state.v2, ...patch } }
}

export function withChapter(state: V2GameState, patch: Partial<V2Slice['chapter']>): V2GameState {
  return withV2(state, { chapter: { ...state.v2.chapter, ...patch } })
}

export function withFounder(state: V2GameState, patch: Partial<V2Slice['founder']>): V2GameState {
  return withV2(state, { founder: { ...state.v2.founder, ...patch } })
}

export function makeFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: 'feat-test',
    title: 'Test Feature',
    description: 'A feature used in tests.',
    baseDays: 3,
    value: 'medium',
    impacts: ['users'],
    effects: { customers: 10 },
    discoveredByPMId: 'founder',
    status: 'proposed',
    buildProgress: 0,
    discoveredAtDay: 0,
    ...overrides,
  }
}

/** Deterministic rng that cycles through the given values. */
export function seq(...values: number[]): Rng {
  let i = 0
  return () => values[i++ % values.length]
}
