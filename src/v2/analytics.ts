import type { V2GameState } from './state'

/** Game ids of generated screenshot scenes. */
export const SCENE_ID_PREFIX = 'v2-scene-'

/** Fire-and-forget: send the latest daily snapshot + session header to Mongo. */
export function syncAnalytics(state: V2GameState): void {
  // Dev screenshot scenes (see scenes.ts) never reach the real analytics.
  if (state.gameId.startsWith(SCENE_ID_PREFIX)) return
  void import('../analytics/mongoIngest')
    .then(({ ingestGameDayRemote }) => ingestGameDayRemote({ ...state, workspace: state.v2.location }))
    .catch(err => { console.error('[analytics] v2 sync failed', err) })
}
