import type { Assignment, FounderTask, FounderTaskType, TeamMember } from '../state'

const DOING: Record<FounderTaskType, string> = {
  research: '🔍 Researching',
  develop: '🛠️ Building',
  emails: '✉️ Sending emails',
  sales: '📞 On sales calls',
}

const WAITING: Record<Assignment, string> = {
  research: '⏳ Nothing left to research',
  develop: '⏳ Waiting for a feature to build',
  emails: '⏳ Waiting for work',
  sales: '⏳ Waiting for leads to call',
  idle: '💤 Idle',
}

function doing(task: FounderTask, featureTitle?: string): string {
  const what = task.type === 'develop' && featureTitle ? `🛠️ Building ${featureTitle}` : DOING[task.type]
  return `${what} · ${Math.round(task.progress * 100)}%`
}

/** One line for a hire: what they're doing and how far along, or why they're waiting. */
export function statusText(m: TeamMember, featureTitle?: string): string {
  return m.task ? doing(m.task, featureTitle) : WAITING[m.assignment]
}

export function founderStatusText(task: FounderTask | null, featureTitle?: string): string {
  return task ? doing(task, featureTitle) : '💤 Taking a breather'
}
