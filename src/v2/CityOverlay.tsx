import { useEffect, useState } from 'react'
import { moveToLocation, useV2 } from './actions'
import { canMove, LOCATIONS, moveCushion, type MoveCheck } from './locations'
import type { V2GameState } from './state'
import { selectLot, showOffice, useUi } from './ui'
import './v2.css'

const fmt = (n: number) => `$${n.toLocaleString()}`

/** DOM controls over the city view: back button + the selected location's card. */
export function CityOverlay() {
  const view = useUi(s => s.view)
  const selected = useUi(s => s.citySelection)
  const v2 = useV2(s => s.v2)
  const cash = useV2(s => s.cash)
  const state = useV2(s => s)
  // A risky move needs a second click ("Move anyway").
  const [confirming, setConfirming] = useState(false)
  useEffect(() => setConfirming(false), [selected])
  if (view !== 'city') return null

  const def = selected ? LOCATIONS.find(l => l.id === selected) : undefined
  // Step through the street (phones frame ~3 buildings at a time).
  const step = (dir: 1 | -1) => {
    const i = LOCATIONS.findIndex(l => l.id === (selected ?? v2.location))
    selectLot(LOCATIONS[(i + dir + LOCATIONS.length) % LOCATIONS.length].id)
  }
  const check: MoveCheck | null = def ? canMove({ v2, cash } as V2GameState, def.id) : null
  const reason: Record<Exclude<MoveCheck, 'ok'>, string> = {
    current: '📍 You are here',
    locked: def ? `🔒 Reach ${fmt(def.unlockMrr)} MRR to unlock` : '',
    cash: def ? `Need ${fmt(def.moveIn)} to move in` : '',
    capacity: def ? `Your team doesn't fit (${def.capacity} seats)` : '',
  }

  return (
    <>
      <button className="v2-city-back" onClick={showOffice}>◀ Back to office</button>
      <div className="v2-city-step">
        <button className="v2-fb-btn" aria-label="Previous building" onClick={() => step(-1)}>◀</button>
        <button className="v2-fb-btn" aria-label="Next building" onClick={() => step(1)}>▶</button>
      </div>
      {!def && <div className="v2-city-hint">Click a building to see it. Peak MRR {fmt(v2.peakMrr)}.</div>}
      {def && check && (
        <div className="v2-city-card">
          <div className="v2-city-card-head">
            <span className="v2-city-card-icon" aria-hidden="true">{def.icon}</span>
            <div>
              <div className="v2-city-card-name">{def.name}</div>
              <div className="v2-muted">{def.capacity} seats · rent {def.rent > 0 ? `${fmt(def.rent)}/mo` : 'free'}{def.moveIn > 0 && ` · move-in ${fmt(def.moveIn)}`}</div>
            </div>
            <button className="v2-sheet-close" onClick={() => selectLot(null)} aria-label="Close">✕</button>
          </div>
          {check === 'ok' ? (() => {
            const cushion = moveCushion(state, def.id)
            const move = () => { if (moveToLocation(def.id) === 'ok') showOffice() }
            return (
              <>
                {cushion.risky && (
                  <div className="v2-city-warn">
                    ⚠️ Moving leaves {fmt(Math.round(cushion.cashAfter))}, less than one month of costs here ({fmt(Math.round(cushion.monthCost))}/mo). One bad month and you're broke.
                  </div>
                )}
                {cushion.risky && !confirming
                  ? <button className="v2-btn" onClick={() => setConfirming(true)}>Move here ({fmt(def.moveIn)})…</button>
                  : <button className="v2-btn v2-btn-primary" onClick={move}>{cushion.risky ? 'Move anyway' : 'Move here'}{def.moveIn > 0 ? ` (${fmt(def.moveIn)})` : ''}</button>}
              </>
            )
          })() : <div className="v2-city-reason">{reason[check]}</div>}
        </div>
      )}
    </>
  )
}
