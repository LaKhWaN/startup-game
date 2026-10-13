export const CONFIRM_MS = 3000
/** A second click sooner than this is a double-click, not a confirmation. */
export const CONFIRM_MIN_MS = 400

export interface Armed { id: string; at: number }

/** A destructive button is "armed" after a first click, for the same id, for CONFIRM_MS. */
export function armedNow(armed: Armed | null, id: string, now: number): boolean {
  return armed !== null && armed.id === id && now - armed.at >= CONFIRM_MIN_MS && now - armed.at < CONFIRM_MS
}
