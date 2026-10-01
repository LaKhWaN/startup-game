import { useEffect, useState } from 'react'
import { assignTeamMember, fireTeamMember, promoteTeamMember, useV2 } from './actions'
import { armedNow, CONFIRM_MS, type Armed } from './confirm'
import { fmtMoney, ROLE_INFO, TierBadge } from './MemberCard'
import { statusText } from './scene/hoverText'
import type { Assignment, FounderSkill, FounderTaskType, TeamMember, V2GameState } from './state'
import { canPromote, PROMOTE_SKILL } from './team'
import { hireSpeed, MAIN_TASK, mainSkillOf, TIER_RULES, workerDurationDays } from './work'
import { closeModal } from './ui'
import './v2.css'

const TASK_LABEL: Record<FounderTaskType, string> = { research: 'research', develop: 'building', emails: 'emails', sales: 'sales' }

const ASSIGNMENTS: { id: Assignment; label: string }[] = [
  { id: 'research', label: '🔍 Research' },
  { id: 'develop', label: '🛠️ Develop' },
  { id: 'emails', label: '✉️ Emails' },
  { id: 'sales', label: '🤝 Sales' },
  { id: 'idle', label: '💤 Idle' },
]

const SKILLS: { id: FounderSkill; label: string }[] = [
  { id: 'research', label: 'Research' },
  { id: 'build', label: 'Build' },
  { id: 'outreach', label: 'Outreach' },
  { id: 'sales', label: 'Sales' },
]

export function portraitUrl(model: string): string {
  return `/assets/v2/portraits/${model}.png`
}

/** The big card for one hire: portrait, one-liner, current task, skill bars and controls. */
export function PersonCard({ m }: { m: TeamMember }) {
  // Stored refs / primitives only; derive below.
  const v2 = useV2(s => s.v2)
  const features = useV2(s => s.features)
  const employees = useV2(s => s.employees)
  const state = { v2, features } as V2GameState

  const [armed, setArmed] = useState<Armed | null>(null)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(null), CONFIRM_MS)
    return () => clearTimeout(t)
  }, [armed])
  function letGo() {
    if (armedNow(armed, m.id, Date.now())) { setArmed(null); fireTeamMember(m.id); closeModal() }
    else setArmed({ id: m.id, at: Date.now() })
  }

  const rule = TIER_RULES[m.tier]
  const main = mainSkillOf(m.role)
  const featureTitle = m.task?.type === 'develop' ? features.find(f => f.id === m.task?.featureId)?.title : undefined
  const daysLeft = m.task
    ? Math.max(0, Math.ceil((1 - m.task.progress) * workerDurationDays(state, m.task.type, m.task.featureId, hireSpeed(m.role, m.task.type, m.tier))))
    : 0
  const joined = employees.find(e => e.id === m.id)?.hiredAtDay
  const promote = canPromote(state, m.id)

  return (
    <div className="v2-person">
      <div className="v2-person-head">
        <img className="v2-person-portrait" src={portraitUrl(m.characterModel)} alt="" />
        <div className="v2-person-id">
          <div className="v2-person-name">{m.name}<TierBadge tier={m.tier} /></div>
          <div className="v2-person-role">{ROLE_INFO[m.role].icon} {ROLE_INFO[m.role].label} · best at {TASK_LABEL[MAIN_TASK[m.role]]}</div>
          <div className="v2-person-meta">
            {fmtMoney(m.salary)}/mo{joined !== undefined && ` · joined day ${joined}`}
            {m.mistakes > 0 && ` · ${m.mistakes} mistake${m.mistakes > 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {m.bio && <blockquote className="v2-person-bio">“{m.bio}”</blockquote>}

      <section className="v2-person-section">
        <div className="v2-person-label">Right now</div>
        <div className="v2-person-task">{statusText(m, featureTitle)}</div>
        {m.task && (
          <>
            <div className="v2-progress v2-person-progress">
              <div className="v2-progress-fill" style={{ width: `${Math.round(m.task.progress * 100)}%` }} />
            </div>
            <div className="v2-person-meta">~{daysLeft}d left</div>
          </>
        )}
      </section>

      <section className="v2-person-section">
        <div className="v2-person-label">Skills <span className="v2-muted">(max {rule.cap})</span></div>
        {SKILLS.map(sk => (
          <div key={sk.id} className={`v2-skill${sk.id === main ? ' v2-skill--main' : ''}`}>
            <span className="v2-skill-name">{sk.label}{sk.id === main && ' ★'}</span>
            <div className="v2-progress">
              <div className="v2-progress-fill" style={{ width: `${(m.skills[sk.id] / rule.cap) * 100}%` }} />
            </div>
            <span className="v2-skill-val">{m.skills[sk.id].toFixed(1)}</span>
          </div>
        ))}
      </section>

      <section className="v2-person-section">
        <div className="v2-person-label">Works on</div>
        <div className="v2-person-assign">
          {ASSIGNMENTS.map(a => (
            <button
              key={a.id}
              className={`v2-chip${m.assignment === a.id ? ' v2-chip--on' : ''}`}
              onClick={() => assignTeamMember(m.id, a.id)}
            >
              {a.label}
            </button>
          ))}
        </div>
      </section>

      <div className="v2-person-actions">
        {promote === 'ok' && (
          <button className="v2-btn v2-btn-primary" onClick={() => promoteTeamMember(m.id)}>Promote to full-time</button>
        )}
        {promote === 'skill' && <span className="v2-muted">Promotable at {SKILLS.find(sk => sk.id === main)?.label.toLowerCase()} skill {PROMOTE_SKILL}</span>}
        <button className="v2-btn v2-btn-ghost" onClick={letGo}>{armed ? 'Sure? Click again' : 'Let go'}</button>
      </div>
    </div>
  )
}
