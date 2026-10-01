import { dismissCoachCard, startFounderTask, useV2 } from './actions'
import { currentCard, isTaskUnlocked } from './chapter'
import { nextLocation } from './locations'
import { FOUNDER_BUILD_SPEED, taskDurationDays } from './founder'
import type { FounderSkill, FounderTaskType } from './state'
import '../components/RightPanel.css'
import './v2.css'

const TASK_INFO: Record<FounderTaskType, { icon: string; name: string; hint: string }> = {
  research: { icon: '🔍', name: 'Research', hint: 'Find 2 concrete things worth building' },
  develop:  { icon: '🛠️', name: 'Develop', hint: 'Build a feature yourself' },
  emails:   { icon: '✉️', name: 'Send emails', hint: 'Cold outreach brings in leads' },
  sales:    { icon: '🤝', name: 'Sell', hint: 'Turn leads into paying customers' },
}

const UNLOCK_HINT: Record<FounderTaskType, string> = {
  research: '',
  develop: 'Unlocks after your first research',
  emails: 'Unlocks after you ship your first feature',
  sales: 'Unlocks after your first emails',
}

const SKILL_LABEL: Record<FounderSkill, string> = {
  research: 'Research',
  build: 'Build',
  outreach: 'Outreach',
  sales: 'Sales',
}

const TASK_BUTTONS: FounderTaskType[] = ['research', 'emails', 'sales']

export function FounderPanel() {
  // Selectors return stored references only (see useV2 docs); derive below.
  const v2 = useV2(s => s.v2)
  const features = useV2(s => s.features)
  const customers = useV2(s => s.customers)

  const card = currentCard({ v2 })
  const next = nextLocation({ v2 })
  const task = v2.founder.task
  const busy = task !== null
  const proposed = features.filter(f => f.status === 'proposed')
  const shipped = features.filter(f => f.status === 'completed').length
  const developUnlocked = isTaskUnlocked({ v2 }, 'develop')

  const taskDays = task ? taskDurationDays({ features }, task.type, task.featureId) : 0
  const daysLeft = task ? Math.max(0, Math.ceil((1 - task.progress) * taskDays)) : 0
  const taskTitle = task?.type === 'develop'
    ? `Building ${features.find(f => f.id === task.featureId)?.title ?? 'a feature'}`
    : task ? TASK_INFO[task.type].name : ''

  function reasonFor(type: FounderTaskType): string | null {
    if (!isTaskUnlocked({ v2 }, type)) return UNLOCK_HINT[type]
    if (busy) return 'Finish your current task first'
    if (type === 'sales' && v2.leads < 1) return 'No leads yet. Send emails first'
    return null
  }

  return (
    <aside className="right-panel right-panel--open">
      <div className="rp-header">
        <span className="rp-title">Founder</span>
      </div>
      <div className="rp-body">
        <div className="rp-scroll">
          <div className="rp-content v2-founder">
            {v2.chapter.complete && !v2.chapter2.complete && (
              <div className="v2-banner">
                <strong>Chapter 2: build a team.</strong> Hire interns in the Team tab and grow to $1,000 MRR.
              </div>
            )}
            {v2.chapter2.complete && !v2.chapter3.complete && (
              <div className="v2-banner">
                <strong>Chapter 3: a bigger space.</strong> Move up from the Map tab and grow to $5,000 MRR.
              </div>
            )}
            {v2.chapter3.complete && next && (
              <div className="v2-banner">
                <strong>Climb the ladder:</strong> next stop {next.icon} {next.name} at ${next.unlockMrr.toLocaleString()} MRR.
              </div>
            )}
            {v2.chapter3.complete && !next && (
              <div className="v2-banner"><strong>🏙️ You made it:</strong> your own building.</div>
            )}

            {card && (
              <div className="v2-coach">
                <div className="v2-coach-title">{card.title}</div>
                <p className="v2-coach-body">{card.body}</p>
                <button className="v2-btn v2-btn-ghost" onClick={() => dismissCoachCard(card.id)}>Got it</button>
              </div>
            )}

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
                {proposed.length === 0 ? (
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
