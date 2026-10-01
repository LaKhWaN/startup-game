import { startFounderTask, useV2 } from './actions'
import { isTaskUnlocked } from './chapter'
import { TASK_INFO, taskReason } from './founderTasks'
import { FOUNDER_BUILD_SPEED, FOUNDER_ID, taskDurationDays } from './founder'
import type { FounderSkill, FounderTaskType } from './state'
import './ui/RightPanel.css'
import './v2.css'


const SKILL_LABEL: Record<FounderSkill, string> = {
  research: 'Research',
  build: 'Build',
  outreach: 'Outreach',
  sales: 'Sales',
}

const TASK_BUTTONS: FounderTaskType[] = ['research', 'emails', 'sales', 'support', 'refactor']

export function FounderPanel() {
  // Selectors return stored references only (see useV2 docs); derive below.
  const v2 = useV2(s => s.v2)
  const features = useV2(s => s.features)
  const customers = useV2(s => s.customers)
  const techDebt = useV2(s => s.techDebt)

  const task = v2.founder.task
  const busy = task !== null
  const proposed = features.filter(f => f.status === 'proposed')
  // Features your hires are building (yours shows under "Right now").
  const teamBuilds = features.filter(f => f.status === 'in_development' && f.assignedToDevId !== FOUNDER_ID)
  const shipped = features.filter(f => f.status === 'completed').length
  const developUnlocked = isTaskUnlocked({ v2 }, 'develop')

  const taskDays = task ? taskDurationDays({ features, techDebt }, task.type, task.featureId) : 0
  const daysLeft = task ? Math.max(0, Math.ceil((1 - task.progress) * taskDays)) : 0
  const taskTitle = task?.type === 'develop'
    ? `Building ${features.find(f => f.id === task.featureId)?.title ?? 'a feature'}`
    : task ? TASK_INFO[task.type].name : ''

  const reasonFor = (type: FounderTaskType) => taskReason(v2, type, { techDebt })

  return (
    <aside className="right-panel right-panel--open">
      <div className="rp-header">
        <span className="rp-title">Founder</span>
      </div>
      <div className="rp-body">
        <div className="rp-scroll">
          <div className="rp-content v2-founder">
            <section className="rp-section">
              <div className="rp-section-label">Right now</div>
              {task ? (
                <div className="v2-task-now">
                  <div className="v2-task-now-title">{TASK_INFO[task.type].icon} {taskTitle}</div>
                  <div className="v2-progress">
                    <div className="v2-progress-fill" style={{ width: `${Math.round(task.progress * 100)}%` }} />
                  </div>
                  <div className="v2-task-now-meta">{Math.round(task.progress * 100)}% · ~{daysLeft}d left</div>
                </div>
              ) : (
                <div className="v2-muted">Nothing in progress. Pick a task below.</div>
              )}
            </section>

            <section className="rp-section">
              <div className="rp-section-label">Tasks</div>
              <div className="v2-task-grid">
                {TASK_BUTTONS.map(type => {
                  const reason = reasonFor(type)
                  return (
                    <button
                      key={type}
                      className="v2-task-btn"
                      disabled={reason !== null}
                      onClick={() => startFounderTask(type)}
                    >
                      <span className="v2-task-icon" aria-hidden="true">{TASK_INFO[type].icon}</span>
                      <span className="v2-task-name">{TASK_INFO[type].name}</span>
                      <span className="v2-task-hint">{reason ?? TASK_INFO[type].hint}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            {developUnlocked && (
              <section className="rp-section">
                <div className="rp-section-label">Build next · {shipped} shipped</div>
                {teamBuilds.map(f => (
                  <div key={f.id} className="v2-feature v2-feature--building">
                    <div className="v2-feature-main">
                      <div className="v2-feature-title">{f.title}</div>
                      <div className="v2-feature-desc">
                        🛠️ {v2.team[f.assignedToDevId ?? '']?.name ?? 'Your team'} is building this · {Math.round(f.buildProgress * 100)}%
                      </div>
                    </div>
                  </div>
                ))}
                {proposed.length === 0 && teamBuilds.length === 0 ? (
                  <div className="v2-muted">No ideas queued. Research to find more.</div>
                ) : (
                  proposed.map(f => (
                    <div key={f.id} className="v2-feature">
                      <div className="v2-feature-main">
                        <div className="v2-feature-title">{f.title}</div>
                        <div className="v2-feature-desc">{f.description}</div>
                      </div>
                      <button className="v2-btn" disabled={busy} onClick={() => startFounderTask('develop', f.id)}>
                        Build · {Math.ceil(f.baseDays / FOUNDER_BUILD_SPEED)}d
                      </button>
                    </div>
                  ))
                )}
              </section>
            )}

            <section className="rp-section">
              <div className="rp-section-label">Funnel</div>
              <div className="v2-funnel">
                <div className="v2-funnel-step">
                  <span className="v2-funnel-num">{v2.leads}</span>
                  <span className="v2-funnel-label">Leads</span>
                </div>
                <span className="v2-funnel-arrow" aria-hidden="true">→</span>
                <div className="v2-funnel-step">
                  <span className="v2-funnel-num">{customers}</span>
                  <span className="v2-funnel-label">Customers</span>
                </div>
              </div>
            </section>

            <section className="rp-section">
              <div className="rp-section-label">Your skills</div>
              {(Object.keys(SKILL_LABEL) as FounderSkill[]).map(k => (
                <div key={k} className="v2-skill">
                  <span className="v2-skill-name">{SKILL_LABEL[k]}</span>
                  <div className="v2-progress">
                    <div className="v2-progress-fill" style={{ width: `${(v2.founder.skills[k] / 10) * 100}%` }} />
                  </div>
                  <span className="v2-skill-val">{v2.founder.skills[k].toFixed(1)}</span>
                </div>
              ))}
            </section>
          </div>
        </div>
      </div>
    </aside>
  )
}
