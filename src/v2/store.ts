import { create } from 'zustand'
import { createSetupState, type V2GameState } from './state'

/** 0 = paused. 10× is dev-only. */
export type GameSpeed = 0 | 1 | 2 | 3 | 5 | 10

export type V2Store = V2GameState & { gameSpeed: GameSpeed }

/** The one game store for v2 (replaces the legacy shared store). */
export const gameStore = create<V2Store>(() => ({ ...createSetupState(), gameSpeed: 1 }))
