import { EVENTS } from '../data/events'
import { totalDays } from '../engine/gameEngine'
import { reconcileFounderFeatures } from './founder'
import { migrateV2Slice, type V2GameState } from './state'

export type SlotId = 1 | 2 | 3

export interface SaveMetaV2 {
  slot: SlotId
  startupName: string
  idea: string
  day: number
  mrr: number
  cash: number
  savedAt: string
  chapterComplete: boolean
}

interface SaveEnvelopeV2 {
  meta: SaveMetaV2
  state: Record<string, unknown>
}

const KEY_PREFIX = 'startup-game-v2-save-'

export function slotKeyV2(slot: SlotId): string {
  return `${KEY_PREFIX}${slot}`
}

export function saveGameV2(slot: SlotId, state: V2GameState): void {
  const serializable: Record<string, unknown> = { ...state }
  serializable._pendingEventId = state.pendingEvent?.id ?? null
  serializable.pendingEvent = null
  serializable.pendingMilestoneToasts = []
  serializable.recentFeatureResults = []
  serializable.fullMetricsHistory = []

  const meta: SaveMetaV2 = {
    slot,
    startupName: state.startupName,
    idea: state.idea ?? '',
    day: totalDays(state.gameTime),
    mrr: state.mrr,
    cash: state.cash,
    savedAt: new Date().toISOString(),
    chapterComplete: state.v2.chapter.complete,
  }

  try {
    localStorage.setItem(slotKeyV2(slot), JSON.stringify({ meta, state: serializable } satisfies SaveEnvelopeV2))
  } catch (err) {
    console.error('[save-v2] Failed to save:', err)
  }
}

export function loadGameV2(slot: SlotId): V2GameState | null {
  try {
    const raw = localStorage.getItem(slotKeyV2(slot))
    if (!raw) return null
    const envelope = JSON.parse(raw) as Partial<SaveEnvelopeV2>
    const state = envelope.state as unknown as (V2GameState & { _pendingEventId?: string | null }) | undefined
    if (!state || typeof state !== 'object') return null
    if (typeof state.gameId !== 'string' || !state.gameId.startsWith('v2-')) return null
    const v2 = migrateV2Slice(state.v2)
    if (!v2) return null
    state.v2 = v2

    const eventId = state._pendingEventId
    state.pendingEvent = eventId ? EVENTS.find(e => e.id === eventId) ?? null : null
    delete state._pendingEventId
    state.completedMilestoneIds = state.completedMilestoneIds ?? []
    state.pendingMilestoneToasts = state.pendingMilestoneToasts ?? []
    state.recentFeatureResults = state.recentFeatureResults ?? []
    state.fullMetricsHistory = state.fullMetricsHistory ?? []

    return reconcileFounderFeatures(state)
  } catch (err) {
    console.error('[save-v2] Failed to load:', err)
    return null
  }
}

export function listSavesV2(): (SaveMetaV2 | null)[] {
  const slots: SlotId[] = [1, 2, 3]
  return slots.map(slot => {
    try {
      const raw = localStorage.getItem(slotKeyV2(slot))
      if (!raw) return null
      return (JSON.parse(raw) as SaveEnvelopeV2).meta ?? null
    } catch {
      return null
    }
  })
}

export function deleteSaveV2(slot: SlotId): void {
  localStorage.removeItem(slotKeyV2(slot))
}
