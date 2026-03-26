import type { GameState } from '../types'
import { EVENTS } from '../data/events'
import { totalDays } from '../engine/gameEngine'

export type SlotId = 1 | 2 | 3

export interface SaveMeta {
  slot: SlotId
  startupName: string
  idea: string
  day: number
  mrr: number
  cash: number
  savedAt: string
}

interface SaveEnvelope {
  meta: SaveMeta
  state: Record<string, unknown>
}

const KEY_PREFIX = 'startup-game-save-'

function slotKey(slot: SlotId): string {
  return `${KEY_PREFIX}${slot}`
}

export function saveGame(slot: SlotId, state: GameState): void {
  const serializable: Record<string, unknown> = { ...state }

  if (state.pendingEvent) {
    serializable.pendingEvent = null
    serializable._pendingEventId = state.pendingEvent.id
  } else {
    serializable._pendingEventId = null
  }

  // Strip ephemeral UI state — always re-init on load
  serializable.pendingMilestoneToasts = []
  serializable.recentFeatureResults = []
  // Full history is saved separately via gameAnalytics — keep saves lightweight
  serializable.fullMetricsHistory = []

  const meta: SaveMeta = {
    slot,
    startupName: state.startupName,
    idea: state.idea ?? '',
    day: totalDays(state.gameTime),
    mrr: state.mrr,
    cash: state.cash,
    savedAt: new Date().toISOString(),
  }

  const envelope: SaveEnvelope = { meta, state: serializable }

  try {
    localStorage.setItem(slotKey(slot), JSON.stringify(envelope))
  } catch (err) {
    console.error('[save] Failed to save:', err)
  }
}

export function loadGame(slot: SlotId): GameState | null {
  try {
    const raw = localStorage.getItem(slotKey(slot))
    if (!raw) return null

    const envelope: SaveEnvelope = JSON.parse(raw)
    const state = envelope.state as unknown as GameState & { _pendingEventId?: string | null }

    const eventId = state._pendingEventId
    if (eventId) {
      state.pendingEvent = EVENTS.find(e => e.id === eventId) ?? null
    }
    delete state._pendingEventId

    // Forward-compat: hydrate fields missing from old saves
    state.completedMilestoneIds  = state.completedMilestoneIds  ?? []
    state.pendingMilestoneToasts = state.pendingMilestoneToasts ?? []
    state.recentFeatureResults   = state.recentFeatureResults   ?? []
    state.fullMetricsHistory     = state.fullMetricsHistory     ?? []
    state.gameId                 = state.gameId ?? `game-legacy-${Date.now()}`

    return state as GameState
  } catch (err) {
    console.error('[save] Failed to load:', err)
    return null
  }
}

export function listSaves(): (SaveMeta | null)[] {
  const slots: SlotId[] = [1, 2, 3]
  return slots.map(slot => {
    try {
      const raw = localStorage.getItem(slotKey(slot))
      if (!raw) return null
      const envelope: SaveEnvelope = JSON.parse(raw)
      return envelope.meta
    } catch {
      return null
    }
  })
}

export function deleteSave(slot: SlotId): void {
  localStorage.removeItem(slotKey(slot))
}
