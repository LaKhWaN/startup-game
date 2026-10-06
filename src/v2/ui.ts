import { create } from 'zustand'
import type { LocationId } from './state'

/** UI-only state for /new: what's on screen. Not game state, never saved. */
export type Modal =
  | { kind: 'founder' }
  | { kind: 'team' }
  | { kind: 'metrics' }
  | { kind: 'shop' }
  | { kind: 'infra' }
  | { kind: 'person'; id: string }

interface UiState {
  view: 'office' | 'city'
  modal: Modal | null
  citySelection: LocationId | null
  /** Game-raised popups currently pausing the game (see pause.ts). */
  pauseHolds: string[]
  /** Waiting on the AI for the next roadmap. */
  planningRoadmap?: boolean
}

export const uiStore = create<UiState>(() => ({ view: 'office', modal: null, citySelection: null, pauseHolds: [] }))

/** Selector hook; like useV2, return stored refs or primitives only. */
export const useUi = <T,>(selector: (s: UiState) => T): T => uiStore(selector)

/** Back to the office with nothing open (new game, load). */
export const resetUi = () => uiStore.setState({ ...uiStore.getInitialState(), pauseHolds: uiStore.getState().pauseHolds })

export const openModal = (modal: Modal) => uiStore.setState({ modal })
export const closeModal = () => uiStore.setState({ modal: null })
export const showCity = () => uiStore.setState({ view: 'city', modal: null, citySelection: null })
export const showOffice = () => uiStore.setState({ view: 'office', citySelection: null })
export const selectLot = (id: LocationId | null) => uiStore.setState({ citySelection: id })
