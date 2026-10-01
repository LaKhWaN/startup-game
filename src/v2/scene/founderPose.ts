import type { FounderTask } from '../state'
import type { CharacterClip } from './assets'
import type { SpotId } from './layout'

export interface FounderPose<S extends string = SpotId> {
  spot: S
  clip: CharacterClip
  typing: boolean
  pace: boolean
  icon: '✉️' | '📞' | '🔍' | null
}

export function founderPose(task: FounderTask | null): FounderPose {
  switch (task?.type) {
    case 'research': return { spot: 'bookshelf', clip: 'interact-right', typing: false, pace: false, icon: null }
    case 'develop': return { spot: 'desk', clip: 'sit', typing: true, pace: false, icon: null }
    case 'emails': return { spot: 'desk', clip: 'sit', typing: true, pace: false, icon: '✉️' }
    case 'sales': return { spot: 'paceA', clip: 'walk', typing: false, pace: true, icon: '📞' }
    default: return { spot: 'bed', clip: 'sit', typing: false, pace: false, icon: null }
  }
}

export type HireSpotId = 'seat' | 'paceA' | 'paceB'

/** Hires keep to their own seat: desk work happens on their laptop, selling paces nearby. */
export function hirePose(task: FounderTask | null): FounderPose<HireSpotId> {
  switch (task?.type) {
    case 'research': return { spot: 'seat', clip: 'sit', typing: true, pace: false, icon: '🔍' }
    case 'develop': return { spot: 'seat', clip: 'sit', typing: true, pace: false, icon: null }
    case 'emails': return { spot: 'seat', clip: 'sit', typing: true, pace: false, icon: '✉️' }
    case 'sales': return { spot: 'paceA', clip: 'walk', typing: false, pace: true, icon: '📞' }
    default: return { spot: 'seat', clip: 'sit', typing: false, pace: false, icon: null }
  }
}
