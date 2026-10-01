import { useEffect, useState } from 'react'
import { assignTeamMember, fireTeamMember, promoteTeamMember, useV2 } from './actions'
import { armedNow, CONFIRM_MS, type Armed } from './confirm'
import { statusText } from './scene/hoverText'
import type { Assignment, FounderSkill, TeamMember, TeamRole, Tier, V2GameState } from './state'
import { canPromote, PROMOTE_SKILL } from './team'
import { MAIN_TASK } from './work'
import './v2.css'

export const ROLE_INFO: Record<TeamRole, { icon: string; label: string }> = {
  developer: { icon: '🛠️', label: 'Developer' },
  product_manager: { icon: '🔍', label: 'Product' },
  marketing: { icon: '✉️', label: 'Marketing' },
  sales: { icon: '🤝', label: 'Sales' },
  support: { icon: '🎧', label: 'Support' },
}

const TIER_LABEL: Record<Tier, string> = { intern: 'Intern', fulltime: 'Full-time' }

export function TierBadge({ tier }: { tier: Tier }) {
  return <span className={`v2-tier v2-tier--${tier}`}>{TIER_LABEL[tier]}</span>
}

const ASSIGNMENT_LABEL: Record<Assignment, string> = {
  research: '🔍 Research',
  develop: '🛠️ Develop',
  emails: '✉️ Emails',
  sales: '🤝 Sales',
  support: '🎧 Support',
  refactor: '🧹 Refactor',
  idle: '💤 Idle',
}

const SKILL_SHORT: Record<FounderSkill, string> = { research: 'Res', build: 'Build', outreach: 'Out', sales: 'Sales' }
const ASSIGNMENTS: Assignment[] = ['research', 'develop', 'emails', 'sales', 'support', 'refactor', 'idle']

export function fmtMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

/** One team member: assignment, progress, skills, salary, Promote and a two-click Let go. */
export function MemberCard({ m }: { m: TeamMember }) {
  // Stored refs / primitives only; derive below.
  const v2 = useV2(s => s.v2)
  const features = useV2(s => s.features)
  const state = { v2 } as V2GameState

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

  const featureTitle = m.task?.type === 'develop' ? features.find(f => f.id === m.task?.featureId)?.title : undefined

  return (
    <div id={`v2-member-${m.id}`} className="v2-member">
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
        <button className="v2-btn v2-btn-ghost" onClick={letGo}>{armed ? 'Sure?' : 'Let go'}</button>
      </div>
      <div className="v2-progress">
        <div className="v2-progress-fill" style={{ width: `${Math.round((m.task?.progress ?? 0) * 100)}%` }} />
      </div>
      <div className="v2-member-status">{statusText(m, featureTitle)}</div>
      <div className="v2-member-skills">
        {(Object.keys(SKILL_SHORT) as FounderSkill[]).map(k => (
          <span key={k}>{SKILL_SHORT[k]} {m.skills[k].toFixed(1)}</span>
        ))}
      </div>
    </div>
  )
}
