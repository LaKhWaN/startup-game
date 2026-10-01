import { useEffect } from 'react'
import { assignTeamMember, ensureCandidates, fireTeamMember, hireCandidate, refreshCandidates, useV2 } from './actions'
import { MAIN_TASK } from './work'
import { teamCapacity } from './team'
import type { Assignment, FounderSkill, TeamRole, V2GameState } from './state'
import '../components/RightPanel.css'
import './v2.css'

const ROLE_INFO: Record<TeamRole, { icon: string; label: string }> = {
  developer: { icon: '🛠️', label: 'Dev intern' },
  product_manager: { icon: '🔍', label: 'Product intern' },
  marketing: { icon: '✉️', label: 'Marketing intern' },
  sales: { icon: '🤝', label: 'Sales intern' },
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

function fmtMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

export function TeamPanel() {
  // Stored refs / primitives only; everything else is derived below.
  const v2 = useV2(s => s.v2)
  const cash = useV2(s => s.cash)
  const employees = useV2(s => s.employees)
  const infra = useV2(s => s.infraCostMonthly)
  const features = useV2(s => s.features)

  useEffect(() => { ensureCandidates() }, [])

  const members = Object.values(v2.team).sort((a, b) => a.seat - b.seat)
  const capacity = teamCapacity({ v2 } as V2GameState)
  const full = members.length >= capacity
  const burn = infra + employees.reduce((sum, e) => sum + e.salary, 0)
  const runway = burn > 0 ? cash / burn : Infinity

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
                runway <strong>{Number.isFinite(runway) ? `~${Math.max(0, Math.floor(runway))} mo` : '∞'}</strong>
              </span>
            </div>

            <section className="rp-section">
              <div className="rp-section-label">Your team</div>
              {members.length === 0 && <div className="v2-muted">No one yet. Hire an intern below.</div>}
              {members.map(m => {
                const building = m.task?.type === 'develop' ? features.find(f => f.id === m.task?.featureId)?.title : undefined
                return (
                  <div key={m.id} className="v2-member">
                    <div className="v2-member-top">
                      <span className="v2-member-name">{ROLE_INFO[m.role].icon} {m.name}</span>
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
                      <button className="v2-btn v2-btn-ghost" onClick={() => fireTeamMember(m.id)}>Let go</button>
                    </div>
                    <div className="v2-progress">
                      <div className="v2-progress-fill" style={{ width: `${Math.round((m.task?.progress ?? 0) * 100)}%` }} />
                    </div>
                    <div className="v2-member-status">
                      {m.task ? (building ? `Building ${building}` : ASSIGNMENT_LABEL[m.task.type]) : m.assignment === 'idle' ? 'Idle' : 'Waiting for work…'}
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
              {v2.candidates.map(c => {
                const reason = full ? `Room is full (${members.length}/${capacity})` : cash < c.salary ? `Need ${fmtMoney(c.salary)} for the first month` : null
                return (
                  <div key={c.id} className="v2-member">
                    <div className="v2-member-top">
                      <span className="v2-member-name">{ROLE_INFO[c.role].icon} {c.name}</span>
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
              })}
            </section>
          </div>
        </div>
      </div>
    </aside>
  )
}
