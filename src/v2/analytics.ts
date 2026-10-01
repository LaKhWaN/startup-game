import type { V2GameState } from './state'

/** Fire-and-forget: send the latest daily snapshot + session header to Mongo. */
export function syncAnalytics(state: V2GameState): void {
  void import('../analytics/mongoIngest')
    .then(({ ingestGameDayRemote }) => ingestGameDayRemote({ ...state, workspace: state.v2.location }))
    .catch(err => { console.error('[analytics] v2 sync failed', err) })
}
