import { useEffect } from 'react'
import { ensureCandidates, hireCandidate, refreshCandidates, useV2 } from './actions'
import { isMapUnlocked } from './chapter'
import { formatProfit } from './finance'
import { fmtMoney, MemberCard, ROLE_INFO, TierBadge } from './MemberCard'
import { canHire, isFullTimeUnlocked, teamCapacity, teamFinances } from './team'
import type { InternCandidate, V2GameState } from './state'
import './ui/RightPanel.css'
import './v2.css'

export function TeamPanel() {
  // Stored refs / primitives only; everything else is derived below.
  const v2 = useV2(s => s.v2)
  const cash = useV2(s => s.cash)
  const infra = useV2(s => s.infraCostMonthly)
  const mrr = useV2(s => s.mrr)

  useEffect(() => { ensureCandidates() }, [])
  const members = Object.values(v2.team).sort((a, b) => a.seat - b.seat)
  const capacity = teamCapacity({ v2 } as V2GameState)
  const state = { v2, cash, infraCostMonthly: infra, mrr } as V2GameState
  const { burn, runwayMonths: runway } = teamFinances(state)
  const fullTime = isFullTimeUnlocked(state)

  function hireReason(c: InternCandidate): string | null {
    switch (canHire(state, c.id)) {
      case 'full': return `Room is full (${members.length}/${capacity})${isMapUnlocked(state) ? '. Move somewhere bigger on the Map' : ''}`
      case 'cash': return `Need ${fmtMoney(c.salary)} for the first month`
      case 'locked': return 'Full-time hires start at the Villa'
      default: return null
    }
  }

  function candidateCard(c: InternCandidate) {
    const reason = hireReason(c)
    return (
      <div key={c.id} className="v2-member">
        <div className="v2-member-top">
          <span className="v2-member-name">{ROLE_INFO[c.role].icon} {c.name}<TierBadge tier={c.tier} /></span>
          <span className="v2-member-salary">{fmtMoney(c.salary)}/mo</span>
        </div>
        <div className="v2-member-role">{ROLE_INFO[c.role].label}</div>
        <div className="v2-member-bio">{c.bio}</div>
        <div className="v2-member-row">
          <button className="v2-btn v2-btn-primary" disabled={reason !== null} onClick={() => hireCandidate(c.id)}>
            Hire
          </button>
          {reason && <span className="v2-muted">{reason}</span>}
        </div>
      </div>
    )
  }

  return (
    <aside className="right-panel right-panel--open">
      <div className="rp-header">
        <span className="rp-title">Team</span>
      </div>
      <div className="rp-body">
        <div className="rp-scroll">
          <div className="rp-content v2-founder">
            <div className="v2-team-summary">
              <span><strong>{members.length}/{capacity}</strong> seats</span>
              <span>burn <strong>{fmtMoney(burn)}/mo</strong></span>
              <span className={mrr - burn < 0 ? 'v2-warn' : 'v2-good'}>profit <strong>{formatProfit(mrr - burn)}</strong></span>
              <span className={runway < 3 ? 'v2-warn' : undefined}>
                runway <strong>{Number.isFinite(runway) ? `~${Math.max(0, runway)} mo` : '∞'}</strong>
              </span>
            </div>

            <section className="rp-section">
              <div className="rp-section-label">Your team</div>
              {members.length === 0 && <div className="v2-muted">No one yet. Hire an intern below.</div>}
              {members.map(m => <MemberCard key={m.id} m={m} />)}
            </section>

            <section className="rp-section">
              <div className="v2-section-head">
                <div className="rp-section-label">Interns available</div>
                <button className="v2-btn v2-btn-ghost" onClick={() => refreshCandidates()}>Refresh</button>
              </div>
              {v2.candidates.filter(c => c.tier === 'intern').map(candidateCard)}
            </section>

            {fullTime && (
              <section className="rp-section">
                <div className="rp-section-label">Full-time candidates</div>
                {v2.candidates.filter(c => c.tier === 'fulltime').map(candidateCard)}
              </section>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
