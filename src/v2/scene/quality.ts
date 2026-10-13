/**
 * PerformanceMonitor handlers. No onFallback: drei 9 counts every incline as a
 * "flip", so a machine steadily at full frame rate hits the flip limit in ~11 s
 * and fallback would pin it to 1× DPR for good.
 */
export function qualityHandlers(setLow: (low: boolean) => void): { onDecline: () => void; onIncline: () => void } {
  return { onDecline: () => setLow(true), onIncline: () => setLow(false) }
}
