export const WALK_SPEED = 1.2
export const MAX_TRIP_SECONDS = 2

/** Walk speed for a trip: normal pace, but never longer than MAX_TRIP_SECONDS. */
export function tripSpeed(distance: number): number {
  return Math.max(WALK_SPEED, distance / MAX_TRIP_SECONDS)
}

export function stepToward(
  from: [number, number],
  to: [number, number],
  speed: number,
  dt: number,
): { pos: [number, number]; arrived: boolean } {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const dist = Math.hypot(dx, dz)
  if (dist < 1e-6) return { pos: [to[0], to[1]], arrived: true }
  const step = speed * dt
  if (step >= dist) return { pos: [to[0], to[1]], arrived: true }
  return { pos: [from[0] + (dx / dist) * step, from[1] + (dz / dist) * step], arrived: false }
}

/** Yaw (rotation about Y) that faces from → to; 0 faces +z. */
export function yawTowards(from: [number, number], to: [number, number]): number {
  return Math.atan2(to[0] - from[0], to[1] - from[1])
}
