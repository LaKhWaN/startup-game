import type { LocationId } from '../state'

export const MISTAKE_FLASH_MS = 2500

/** What floats over a hire's head: a mistake grimace beats idle beats the task icon; no task = waiting. */
export function reactionIcon(s: { idle: boolean; taskIcon: string | null; mistakeAt: number | null; now: number; stress?: number; energy?: number }): string | null {
  if (s.mistakeAt !== null && s.now - s.mistakeAt < MISTAKE_FLASH_MS) return '😬'
  if ((s.stress ?? 0) > 75) return '😫'
  if ((s.energy ?? 100) < 25) return '🥱'
  if (s.idle) return '💤'
  return s.taskIcon ?? '⏳'
}

/** The move transition plays when the location changes — never on first mount (e.g. loading a save). */
export function shouldShowMove(prev: LocationId | null, next: LocationId): boolean {
  return prev !== null && prev !== next
}
