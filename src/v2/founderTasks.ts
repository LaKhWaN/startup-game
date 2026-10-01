import { isTaskUnlocked } from './chapter'
import type { FounderTaskType, V2Slice } from './state'

export const TASK_INFO: Record<FounderTaskType, { icon: string; name: string; hint: string }> = {
  research: { icon: '🔍', name: 'Research', hint: 'Find 2 concrete things worth building' },
  develop:  { icon: '🛠️', name: 'Develop', hint: 'Build a feature yourself' },
  emails:   { icon: '✉️', name: 'Send emails', hint: 'Cold outreach brings in leads' },
  sales:    { icon: '🤝', name: 'Sell', hint: 'Turn leads into paying customers' },
}

export const UNLOCK_HINT: Record<FounderTaskType, string> = {
  research: '',
  develop: 'Unlocks after your first research',
  emails: 'Unlocks after you ship your first feature',
  sales: 'Unlocks after your first emails',
}

/** Why the founder can't start `type` right now, or null when they can. */
export function taskReason(v2: V2Slice, type: FounderTaskType): string | null {
  if (!isTaskUnlocked({ v2 }, type)) return UNLOCK_HINT[type]
  if (v2.founder.task) return 'Finish your current task first'
  if (type === 'sales' && v2.leads < 1) return 'No leads yet. Send emails first'
  return null
}
