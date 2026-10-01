export const CONFIRM_MS = 3000

export interface Armed { id: string; at: number }

/** A destructive button is "armed" after a first click, for the same id, for CONFIRM_MS. */
export function armedNow(armed: Armed | null, id: string, now: number): boolean {
  return armed !== null && armed.id === id && now - armed.at < CONFIRM_MS
}
