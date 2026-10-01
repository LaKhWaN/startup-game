import { moveToLocation, useV2 } from './actions'
import { canMove, LOCATIONS, type LocationDef, type MoveCheck } from './locations'
import type { V2GameState } from './state'
import '../components/RightPanel.css'
import './v2.css'

function fmt(n: number): string {
  return `$${n.toLocaleString()}`
}

const BLOCKED: Record<Exclude<MoveCheck, 'ok' | 'current' | 'locked'>, (l: LocationDef) => string> = {
  cash: l => `Need ${fmt(l.moveIn)} to move in`,
  capacity: l => `Your team doesn't fit (${l.capacity} seats)`,
}

export function MapPanel() {
  // Stored refs / primitives only; derive below.
  const v2 = useV2(s => s.v2)
  const cash = useV2(s => s.cash)
  const state = { v2, cash } as V2GameState
  const teamSize = Object.keys(v2.team).length

  return (
    <aside className="right-panel right-panel--open">
      <div className="rp-header">
        <span className="rp-title">Map</span>
      </div>
      <div className="rp-body">
        <div className="rp-scroll">
          <div className="rp-content v2-founder">
            <div className="v2-muted">Peak MRR {fmt(v2.peakMrr)} · team {teamSize}</div>
            <ol className="v2-map">
              {[...LOCATIONS].reverse().map(l => {
                const check = canMove(state, l.id)
                const here = check === 'current'
                const locked = check === 'locked'
                return (
                  <li key={l.id} className={`v2-map-node${here ? ' v2-map-node--here' : ''}${locked ? ' v2-map-node--locked' : ''}`}>
                    <span className="v2-map-icon" aria-hidden="true">{locked ? '🔒' : l.icon}</span>
                    <div className="v2-map-info">
                      <div className="v2-map-name">{l.name}</div>
                      <div className="v2-map-meta">
                        {l.capacity} seats · rent {l.rent > 0 ? `${fmt(l.rent)}/mo` : 'free'}
                      </div>
                      {here && <div className="v2-map-status">📍 You are here</div>}
                      {locked && <div className="v2-map-status">Reach {fmt(l.unlockMrr)} MRR</div>}
                      {!here && !locked && (
                        <div className="v2-member-row">
                          <button className="v2-btn v2-btn-primary" disabled={check !== 'ok'} onClick={() => moveToLocation(l.id)}>
                            Move{l.moveIn > 0 ? ` (${fmt(l.moveIn)})` : ''}
                          </button>
                          {check !== 'ok' && <span className="v2-muted">{BLOCKED[check](l)}</span>}
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      </div>
    </aside>
  )
}
