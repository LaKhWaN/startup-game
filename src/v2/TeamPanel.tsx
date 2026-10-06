import { useEffect, useState } from 'react'
import { assignTeamMember, ensureCandidates, fireTeamMember, hireCandidate, promoteTeamMember, refreshCandidateTier, useV2 } from './actions'
import { isMapUnlocked } from './chapter'
import { armedNow, CONFIRM_MS, type Armed } from './confirm'
import { formatProfit } from './finance'
import { fmtMoney, ROLE_INFO, TierBadge } from './MemberCard'
import { portraitUrl } from './PersonCard'
import { statusText } from './scene/hoverText'
import { canHire, canPromote, isFullTimeUnlocked, PROMOTE_SKILL, teamCapacity, teamFinances } from './team'
import type { Assignment, FounderSkill, InternCandidate, TeamMember, TeamRole, Tier, V2GameState } from './state'
import { openModal } from './ui'
import { MAIN_TASK, mainSkillOf } from './work'
import './v2.css'

const ASSIGNMENTS: { id: Assignment; label: string }[] = [
  { id: 'research', label: '🔍 Research' },
  { id: 'develop', label: '🛠️ Develop' },
  { id: 'emails', label: '✉️ Emails' },
  { id: 'sales', label: '🤝 Sales' },
  { id: 'support', label: '🎧 Support' },
  { id: 'refactor', label: '🧹 Refactor' },
  { id: 'idle', label: '💤 Idle' },
]
const SKILLS: { id: FounderSkill; label: string }[] = [
  { id: 'research', label: 'Res' },
  { id: 'build', label: 'Build' },
  { id: 'outreach', label: 'Out' },
  { id: 'sales', label: 'Sales' },
]
const ROLES: TeamRole[] = ['developer', 'product_manager', 'marketing', 'sales', 'support']

function MiniBar({ icon, value, bad, title }: { icon: string; value: number; bad: boolean; title: string }) {
  return (
    <div className="v2-tm-mini" title={`${title}: ${Math.round(value)}`}>
      <span aria-hidden="true">{icon}</span>
      <div className="v2-progress"><div className="v2-progress-fill" style={{ width: `${Math.round(value)}%`, background: bad ? 'var(--error)' : undefined }} /></div>
    </div>
  )
}

function Skills({ skills, main }: { skills: Record<FounderSkill, number>; main: FounderSkill }) {
  return (
    <div className="v2-tm-skills">
      {SKILLS.map(k => (
        <span key={k.id} className={k.id === main ? 'v2-tm-skill v2-tm-skill--main' : 'v2-tm-skill'}>{k.label} {skills[k.id].toFixed(1)}</span>
      ))}
    </div>
  )
}

/** One hire in the team grid: everything at a glance, no scrolling inside. */
function MemberTile({ m, featureTitle, state }: { m: TeamMember; featureTitle?: string; state: V2GameState }) {
  const [armed, setArmed] = useState<Armed | null>(null)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(null), CONFIRM_MS)
    return () => clearTimeout(t)
  }, [armed])
  function letGo() {
    if (armedNow(armed, m.id, Date.now())) { setArmed(null); fireTeamMember(m.id) }
    else setArmed({ id: m.id, at: Date.now() })
  }
  const stress = m.stress ?? 10
  const morale = m.morale ?? 70
  const energy = m.energy ?? 100
  const progress = Math.round((m.task?.progress ?? 0) * 100)
  const warn = m.leavingOn !== undefined ? '📝 Leaving' : stress >= 70 ? '😫 Stressed' : morale < 35 ? '😞 Unhappy' : null

  return (
    <div className={`v2-tm-card${warn ? ' v2-tm-card--warn' : ''}`}>
      <div className="v2-tm-head">
        <img className="v2-tm-portrait" src={portraitUrl(m.characterModel)} alt="" onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
        <div className="v2-tm-who">
          <div className="v2-tm-name">{m.name}<TierBadge tier={m.tier} /></div>
          <div className="v2-muted">{ROLE_INFO[m.role].icon} {ROLE_INFO[m.role].label} · {fmtMoney(m.salary)}/mo</div>
        </div>
        {warn && <span className="v2-tm-warn">{warn}</span>}
      </div>
      <select className="v2-select v2-tm-select" value={m.assignment} onChange={e => assignTeamMember(m.id, e.target.value as Assignment)} aria-label={`Assignment for ${m.name}`}>
        {ASSIGNMENTS.map(a => <option key={a.id} value={a.id}>{a.label}{a.id === MAIN_TASK[m.role] ? ' ★' : ''}</option>)}
      </select>
      <div className="v2-tm-task">
        <span className="v2-tm-status">{statusText(m, featureTitle)}</span>
        <div className="v2-progress"><div className="v2-progress-fill" style={{ width: `${progress}%` }} /></div>
      </div>
      <div className="v2-tm-moods">
        <MiniBar icon="⚡" value={energy} bad={energy < 30} title="Energy" />
        <MiniBar icon="😰" value={stress} bad={stress >= 70} title="Stress" />
        <MiniBar icon="😊" value={morale} bad={morale < 35} title="Morale" />
      </div>
      <Skills skills={m.skills} main={mainSkillOf(m.role)} />
      <div className="v2-tm-actions">
        {canPromote(state, m.id) === 'ok' && (
          <button className="v2-btn v2-btn-primary" onClick={() => promoteTeamMember(m.id)} title={`Main skill ${PROMOTE_SKILL}+: make them full-time`}>Promote</button>
        )}
        <button className="v2-btn v2-btn-ghost" onClick={() => openModal({ kind: 'person', id: m.id })}>Details</button>
        <button className="v2-btn v2-btn-ghost" onClick={letGo}>{armed ? 'Sure?' : 'Let go'}</button>
      </div>
    </div>
  )
}

function CandidateTile({ c, reason }: { c: InternCandidate; reason: string | null }) {
  return (
    <div className="v2-tm-card v2-tm-cand">
      <div className="v2-tm-head">
        <img className="v2-tm-portrait" src={portraitUrl(c.characterModel)} alt="" onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
        <div className="v2-tm-who">
          <div className="v2-tm-name">{c.name}<TierBadge tier={c.tier} /></div>
          <div className="v2-muted">{ROLE_INFO[c.role].icon} {ROLE_INFO[c.role].label} · {fmtMoney(c.salary)}/mo</div>
        </div>
      </div>
      <div className="v2-tm-bio">{c.bio}</div>
      <Skills skills={c.skills} main={mainSkillOf(c.role)} />
      <div className="v2-tm-actions">
        <button className="v2-btn v2-btn-primary" disabled={reason !== null} onClick={() => hireCandidate(c.id)}>Hire</button>
        {reason && <span className="v2-muted">{reason}</span>}
      </div>
    </div>
  )
}

/** The Team window: your people on the left, hiring on the right. Each side scrolls on its own. */
export function TeamPanel() {
  // Stored refs / primitives only; everything else is derived below.
  const v2 = useV2(s => s.v2)
  const cash = useV2(s => s.cash)
  const infra = useV2(s => s.infraCostMonthly)
  const mrr = useV2(s => s.mrr)
  const customers = useV2(s => s.customers)
  const features = useV2(s => s.features)
  const [role, setRole] = useState<TeamRole | 'all'>('all')
  const [tab, setTab] = useState<Tier>('intern')

  useEffect(() => { ensureCandidates() }, [])
  const members = Object.values(v2.team).sort((a, b) => a.seat - b.seat)
  const capacity = teamCapacity({ v2 } as V2GameState)
  const state = { v2, cash, infraCostMonthly: infra, mrr, customers, features } as V2GameState
  const { burn, runwayMonths: runway } = teamFinances(state)
  const fullTime = isFullTimeUnlocked(state)
  const payroll = members.reduce((sum, m) => sum + m.salary, 0)
  const shown = role === 'all' ? members : members.filter(m => m.role === role)
  const atRisk = members.filter(m => m.leavingOn !== undefined || (m.stress ?? 0) >= 70 || (m.morale ?? 70) < 35).length
  const activeTab: Tier = fullTime ? tab : 'intern'
  const candidates = v2.candidates.filter(c => c.tier === activeTab)

  function hireReason(c: InternCandidate): string | null {
    switch (canHire(state, c.id)) {
      case 'full': return `Room is full (${members.length}/${capacity})${isMapUnlocked(state) ? '. Move somewhere bigger on the Map' : ''}`
      case 'cash': return `Need ${fmtMoney(c.salary)} for the first month`
      case 'locked': return 'Full-time hires start at the Villa'
      default: return null
    }
  }

  return (
    <div className="v2-team">
      <div className="v2-team-stats">
        <div className="v2-team-stat"><span>Seats</span><strong>{members.length}/{capacity}</strong></div>
        <div className="v2-team-stat"><span>Payroll</span><strong>{fmtMoney(payroll)}/mo</strong></div>
        <div className="v2-team-stat"><span>Burn</span><strong>{fmtMoney(burn)}/mo</strong></div>
        <div className={`v2-team-stat${mrr - burn < 0 ? ' v2-team-stat--bad' : ' v2-team-stat--good'}`}><span>Profit</span><strong>{formatProfit(mrr - burn)}</strong></div>
        <div className={`v2-team-stat${runway < 3 ? ' v2-team-stat--bad' : ''}`}><span>Runway</span><strong>{Number.isFinite(runway) ? `~${Math.max(0, runway)} mo` : '∞'}</strong></div>
        <div className={`v2-team-stat${atRisk > 0 ? ' v2-team-stat--bad' : ''}`}><span>Need attention</span><strong>{atRisk}</strong></div>
      </div>

      <div className="v2-team-cols">
        <section className="v2-team-col v2-team-col--people">
          <div className="v2-team-colhead">
            <span className="v2-team-coltitle">Your team</span>
            <div className="v2-team-filters">
              <button className={`v2-emp-chip${role === 'all' ? ' v2-emp-chip--on' : ''}`} onClick={() => setRole('all')}>All {members.length}</button>
              {ROLES.map(r => {
                const n = members.filter(m => m.role === r).length
                return n > 0 && (
                  <button key={r} className={`v2-emp-chip${role === r ? ' v2-emp-chip--on' : ''}`} onClick={() => setRole(r)} title={ROLE_INFO[r].label}>
                    {ROLE_INFO[r].icon} {n}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="v2-team-scroll">
            {members.length === 0
              ? <div className="v2-team-empty">No one yet. Hire someone from the list on the right →</div>
              : (
                <div className="v2-team-grid">
                  {shown.map(m => (
                    <MemberTile key={m.id} m={m} state={state}
                      featureTitle={m.task?.type === 'develop' ? features.find(f => f.id === m.task?.featureId)?.title : undefined} />
                  ))}
                </div>
              )}
          </div>
        </section>

        <section className="v2-team-col v2-team-col--hire">
          <div className="v2-team-colhead">
            <div className="v2-team-tabs" role="tablist">
              <button role="tab" aria-selected={activeTab === 'intern'} className={`v2-team-tab${activeTab === 'intern' ? ' v2-team-tab--on' : ''}`} onClick={() => setTab('intern')}>Interns</button>
              <button role="tab" aria-selected={activeTab === 'fulltime'} disabled={!fullTime} title={fullTime ? undefined : 'Full-time hires start at the Villa'}
                className={`v2-team-tab${activeTab === 'fulltime' ? ' v2-team-tab--on' : ''}`} onClick={() => setTab('fulltime')}>
                Full-time{fullTime ? '' : ' 🔒'}
              </button>
            </div>
            <button className="v2-btn v2-btn-ghost" onClick={() => refreshCandidateTier(activeTab)} title={`New ${activeTab === 'intern' ? 'intern' : 'full-time'} candidates`}>↻ Refresh</button>
          </div>
          <div className="v2-team-scroll">
            {candidates.map(c => <CandidateTile key={c.id} c={c} reason={hireReason(c)} />)}
          </div>
        </section>
      </div>
    </div>
  )
}
