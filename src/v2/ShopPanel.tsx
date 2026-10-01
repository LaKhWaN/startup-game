import { buyShopPerk, upgradeDesk, useV2 } from './actions'
import { PERKS, PERK_SLOTS, activePerks, canBuyPerk, canUpgradeSetup, nextSetup, setupOf, type Desk } from './shop'
import type { V2GameState } from './state'
import './v2.css'

const fmt = (n: number) => `$${n.toLocaleString()}`

const PERK_REASON = { owned: 'Owned', full: 'No free slot here. Move somewhere bigger', cash: 'Not enough cash' } as const

/** 🛒 Perks for the office and computer upgrades per desk (spec §6). */
export function ShopPanel() {
  // Stored refs / primitives only; derive below.
  const v2 = useV2(s => s.v2)
  const cash = useV2(s => s.cash)
  const state = { v2, cash } as V2GameState
  const active = activePerks(state)
  const slots = PERK_SLOTS[v2.location]
  const desks: { desk: Desk; label: string }[] = [
    { desk: 'founder', label: 'Your desk' },
    ...Object.values(v2.team).sort((a, b) => a.seat - b.seat).map(m => ({ desk: m.seat as Desk, label: `${m.name}'s desk` })),
  ]

  return (
    <div className="v2-shop">
      <section className="v2-person-section">
        <div className="v2-person-label">Perks · {active.length}/{slots} slots here</div>
        <div className="v2-shop-grid">
          {PERKS.map(p => {
            const check = canBuyPerk(state, p.id)
            const owned = (v2.perks ?? []).includes(p.id)
            const stored = owned && !active.includes(p.id)
            return (
              <div key={p.id} className={`v2-shop-item${owned ? ' v2-shop-item--owned' : ''}`}>
                <div className="v2-shop-icon" aria-hidden="true">{p.icon}</div>
                <div className="v2-shop-name">{p.name}</div>
                <div className="v2-muted">{p.blurb}</div>
                {owned
                  ? <div className="v2-shop-tag">{stored ? '📦 In storage (no slot)' : '✓ In the office'}</div>
                  : (
                    <button className="v2-btn v2-btn-primary" disabled={check !== 'ok'} onClick={() => buyShopPerk(p.id)} title={check === 'ok' ? undefined : PERK_REASON[check]}>
                      Buy {fmt(p.price)}
                    </button>
                  )}
                {!owned && check !== 'ok' && <div className="v2-muted">{PERK_REASON[check]}</div>}
              </div>
            )
          })}
        </div>
      </section>

      <section className="v2-person-section">
        <div className="v2-person-label">Setups · faster work, fewer mistakes</div>
        {desks.map(({ desk, label }) => {
          const now = setupOf(state, desk)
          const next = nextSetup(state, desk)
          const check = canUpgradeSetup(state, desk)
          return (
            <div key={String(desk)} className="v2-shop-desk">
              <div>
                <div className="v2-shop-name">{label}: {now.name}</div>
                <div className="v2-muted">{now.specs} · speed ×{now.speed} · mistakes ×{now.mistakes}</div>
              </div>
              {next
                ? (
                  <button className="v2-btn" disabled={check !== 'ok'} onClick={() => upgradeDesk(desk)} title={`${next.name}: ${next.specs}`}>
                    → {next.name} {fmt(next.price)}
                  </button>
                )
                : <span className="v2-shop-tag">✓ Best there is</span>}
            </div>
          )
        })}
      </section>
    </div>
  )
}
