import type { Feature } from '../../types'

/** Someone stops building: a regular feature goes back unstarted; an epic keeps its progress and passes to a helper. */
export function releaseBuilder(features: Feature[], memberId: string): Feature[] {
  const involved = (f: Feature) => f.status === 'in_development' && (f.assignedToDevId === memberId || !!f.epic?.helpers?.includes(memberId))
  if (!features.some(involved)) return features
  return features.map(f => {
    if (!involved(f)) return f
    if (!f.epic) return { ...f, status: 'proposed' as const, assignedToDevId: undefined, buildProgress: 0 }
    const helpers = (f.epic.helpers ?? []).filter(h => h !== memberId)
    if (f.assignedToDevId !== memberId) return { ...f, epic: { ...f.epic, helpers } }
    const [lead, ...rest] = helpers
    return lead
      ? { ...f, assignedToDevId: lead, epic: { ...f.epic, helpers: rest } }
      : { ...f, status: 'proposed' as const, assignedToDevId: undefined, epic: { ...f.epic, helpers: [] } }
  })
}
