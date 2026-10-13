/** World units a 4×4 room needs horizontally / vertically on screen, with margin; scales with w + d. */
export const VIEW_SPAN_X = 6.6
export const VIEW_SPAN_Y = 5.0

/** Orthographic zoom that fits a width × depth room in the canvas. */
export function fitZoom(size: { width: number; height: number }, width: number, depth: number): number {
  const k = (width + depth) / 8
  return Math.min(size.width / (VIEW_SPAN_X * k), size.height / (VIEW_SPAN_Y * k))
}

/** Head emoji/cards are sized for the bedroom on a desktop (zoom ≈ 156); shrink them with the room. */
export function iconScale(zoom: number): number {
  return Math.min(1, Math.max(0.45, zoom / 156))
}
