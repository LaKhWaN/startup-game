import { useState } from 'react'
import { startFounderTask, useV2 } from './actions'
import { FOUNDER_BUILD_SPEED, FOUNDER_ID, taskDurationDays } from './founder'
import { TASK_INFO, taskReason } from './founderTasks'
import type { FounderTaskType } from './state'
import { openModal } from './ui'
import './v2.css'

const QUICK: FounderTaskType[] = ['research', 'emails', 'sales']

/** The founder's controls, floating at the bottom of the room. */
export function FounderBar() {
  const v2 = useV2(s => s.v2)
  const features = useV2(s => s.features)
  const [picking, setPicking] = useState(false)

  const task = v2.founder.task
  const proposed = features.filter(f => f.status === 'proposed')
  const teamBuilds = features.filter(f => f.status === 'in_development' && f.assignedToDevId !== FOUNDER_ID)
  const buildReason = taskReason(v2, 'develop') ?? (proposed.length === 0 ? 'Nothing to build. Research first' : null)

  const days = task ? taskDurationDays({ features }, task.type, task.featureId) : 0
  const title = task?.type === 'develop'
    ? `Building ${features.find(f => f.id === task.featureId)?.title ?? 'a feature'}`
    : task ? TASK_INFO[task.type].name : 'Nothing in progress'

  return (
    <div className="v2-founder-bar">
      <button className="v2-fb-now" onClick={() => openModal({ kind: 'founder' })} title="Open your founder card">
        <span className="v2-fb-now-title">{task ? TASK_INFO[task.type].icon : '💤'} {title}</span>
        {task && (
          <>
            <span className="v2-progress v2-fb-progress"><span className="v2-progress-fill" style={{ width: `${Math.round(task.progress * 100)}%` }} /></span>
            <span className="v2-fb-meta">{Math.round(task.progress * 100)}% · ~{Math.max(0, Math.ceil((1 - task.progress) * days))}d</span>
          </>
        )}
      </button>
      <div className="v2-fb-actions">
        {QUICK.map(type => {
          const reason = taskReason(v2, type)
          return (
            <button key={type} className="v2-fb-btn" disabled={reason !== null} title={reason ?? TASK_INFO[type].hint} onClick={() => startFounderTask(type)}>
              <span aria-hidden="true">{TASK_INFO[type].icon}</span> {TASK_INFO[type].name}
            </button>
          )
        })}
        <div className="v2-fb-build">
          <button className="v2-fb-btn" disabled={buildReason !== null} title={buildReason ?? 'Pick a feature to build'} onClick={() => setPicking(p => !p)}>
            <span aria-hidden="true">🛠️</span> Build ▾
          </button>
          {picking && buildReason === null && (
            <div className="v2-fb-picker" role="menu">
              {proposed.map(f => (
                <button key={f.id} className="v2-fb-pick" role="menuitem" onClick={() => { setPicking(false); startFounderTask('develop', f.id) }}>
                  <span className="v2-fb-pick-title">{f.title}</span>
                  <span className="v2-fb-pick-meta">{Math.ceil(f.baseDays / FOUNDER_BUILD_SPEED)}d</span>
                </button>
              ))}
              {teamBuilds.map(f => (
                <div key={f.id} className="v2-fb-pick v2-fb-pick--taken">
                  <span className="v2-fb-pick-title">{f.title}</span>
                  <span className="v2-fb-pick-meta">🛠️ {v2.team[f.assignedToDevId ?? '']?.name ?? 'team'} · {Math.round(f.buildProgress * 100)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
