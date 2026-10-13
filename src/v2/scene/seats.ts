/**
 * Occupied seats as one number (bit n = seat n), so a Zustand selector can
 * return a primitive. Plain arithmetic, not bitwise ops: those are 32-bit and
 * the Building has 50 seats (exact up to 2^53).
 */
export function occupiedSeatMask(team: Record<string, { seat: number }>): number {
  const seats = new Set(Object.values(team).map(m => m.seat))
  let mask = 0
  for (const s of seats) mask += 2 ** s
  return mask
}

export function seatTaken(mask: number, seat: number): boolean {
  return Math.floor(mask / 2 ** seat) % 2 === 1
}
