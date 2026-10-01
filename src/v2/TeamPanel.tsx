import { useEffect } from 'react'
import { assignTeamMember, ensureCandidates, fireTeamMember, hireCandidate, promoteTeamMember, refreshCandidates, useV2 } from './actions'
import { MAIN_TASK } from './work'
import { canHire, canPromote, isFullTimeUnlocked, PROMOTE_SKILL, teamCapacity, teamFinances } from './team'
import type { Assignment, FounderSkill, InternCandidate, TeamRole, Tier, V2GameState } from './state'
import '../components/RightPanel.css'
import './v2.css'

const ROLE_INFO: Record<TeamRole, { icon: string; label: string }> = {
  developer: { icon: '🛠️', label: 'Developer' },
  product_manager: { icon: '🔍', label: 'Product' },
  marketing: { icon: '✉️', label: 'Marketing' },
  sales: { icon: '🤝', label: 'Sales' },
}

const TIER_LABEL: Record<Tier, string> = { intern: 'Intern', fulltime: 'Full-time' }

function TierBadge({ tier }: { tier: Tier }) {
  return <span className={`v2-tier v2-tier--${tier}`}>{TIER_LABEL[tier]}</span>
}

const ASSIGNMENT_LABEL: Record<Assignment, string> = {
  research: '🔍 Research',
  develop: '🛠️ Develop',
  emails: '✉️ Emails',
  sales: '🤝 Sales',
  idle: '💤 Idle',
}

const SKILL_SHORT: Record<FounderSkill, string> = { research: 'Res', build: 'Build', outreach: 'Out', sales: 'Sales' }
const ASSIGNMENTS: Assignment[] = ['research', 'develop', 'emails', 'sales', 'idle']

const WAITING: Record<Assignment, string> = {
  research: 'Nothing left to research',
  develop: 'Waiting for a feature to build',
  emails: 'Waiting for work…',
  sales: 'Waiting for leads to call',
  idle: 'Idle',
}

function fmtMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

export function TeamPanel({ focusId = null }: { focusId?: string | null }) {
  // Stored refs / primitives only; everything else is derived below.
  const v2 = useV2(s => s.v2)
  const cash = useV2(s => s.cash)
  const employees = useV2(s => s.employees)
  const infra = useV2(s => s.infraCostMonthly)
  const mrr = useV2(s => s.mrr)
  const features = useV2(s => s.features)

  useEffect(() => { ensureCandidates() }, [])
  // Clicked in the room: bring that person into view.
  useEffect(() => {
    if (focusId) document.getElementById(`v2-member-${focusId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [focusId])

  const members = Object.values(v2.team).sort((a, b) => a.seat - b.seat)
  const capacity = teamCapacity({ v2 } as V2GameState)
  const state = { v2, cash, employees, infraCostMonthly: infra, mrr } as V2GameState
  const { burn, runwayMonths: runway } = teamFinances(state)
  const fullTime = isFullTimeUnlocked(state)

  function hireReason(c: InternCandidate): string | null {
    switch (canHire(state, c.id)) {
      case 'full': return `Room is full (${members.length}/${capacity}). Move somewhere bigger on the Map`
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
              <span className={runway < 3 ? 'v2-warn' : undefined}>
                runway <strong>{Number.isFinite(runway) ? `~${Math.max(0, runway)} mo` : '∞'}</strong>
              </span>
            </div>

            <section className="rp-section">
              <div className="rp-section-label">Your team</div>
              {members.length === 0 && <div className="v2-muted">No one yet. Hire an intern below.</div>}
              {members.map(m => {
                const building = m.task?.type === 'develop' ? features.find(f => f.id === m.task?.featureId)?.title : undefined
                return (
                  <div key={m.id} id={`v2-member-${m.id}`} className={`v2-member${m.id === focusId ? ' v2-member--focus' : ''}`}>
                    <div className="v2-member-top">
                      <span className="v2-member-name">{ROLE_INFO[m.role].icon} {m.name}<TierBadge tier={m.tier} /></span>
                      <span className="v2-member-salary">{fmtMoney(m.salary)}/mo</span>
                    </div>
                    <div className="v2-member-role">
                      {ROLE_INFO[m.role].label} · best at {ASSIGNMENT_LABEL[MAIN_TASK[m.role]].slice(3)}
                      {m.mistakes > 0 && ` · ${m.mistakes} mistake${m.mistakes > 1 ? 's' : ''}`}
                    </div>
                    <div className="v2-member-row">
                      <select
                        className="v2-select"
                        value={m.assignment}
                        onChange={e => assignTeamMember(m.id, e.target.value as Assignment)}
                        aria-label={`Assignment for ${m.name}`}
                      >
                        {ASSIGNMENTS.map(a => <option key={a} value={a}>{ASSIGNMENT_LABEL[a]}</option>)}
                      </select>
                      {canPromote(state, m.id) === 'ok' && (
                        <button className="v2-btn v2-btn-primary" onClick={() => promoteTeamMember(m.id)} title={`Main skill ${PROMOTE_SKILL}+: make them full-time`}>
                          Promote
                        </button>
                      )}
                      <button className="v2-btn v2-btn-ghost" onClick={() => fireTeamMember(m.id)}>Let go</button>
                    </div>
                    <div className="v2-progress">
                      <div className="v2-progress-fill" style={{ width: `${Math.round((m.task?.progress ?? 0) * 100)}%` }} />
                    </div>
                    <div className="v2-member-status">
                      {m.task ? (building ? `Building ${building}` : ASSIGNMENT_LABEL[m.task.type]) : WAITING[m.assignment]}
                    </div>
                    <div className="v2-member-skills">
                      {(Object.keys(SKILL_SHORT) as FounderSkill[]).map(k => (
                        <span key={k}>{SKILL_SHORT[k]} {m.skills[k].toFixed(1)}</span>
                      ))}
                    </div>
                  </div>
                )
              })}
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
