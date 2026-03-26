import type { GameState } from '../types'
import { ingestGameDayRemote, isRemoteAnalyticsConfigured } from './mongoIngest'

/**
 * After each in-game day tick: local SQLite (admin) + optional Mongo (hosted).
 * Failures are logged; gameplay never throws.
 */
export async function persistDayAnalytics(state: GameState): Promise<void> {
  const tasks: Promise<unknown>[] = [
    import('../save/gameAnalytics').then((m) => m.syncDailyMetricsFromState(state)),
  ]
  if (isRemoteAnalyticsConfigured()) {
    tasks.push(ingestGameDayRemote(state))
  }

  const results = await Promise.allSettled(tasks)
  for (const r of results) {
    if (r.status === 'rejected') {
      console.error('[persistDayAnalytics]', r.reason)
    }
  }
}
