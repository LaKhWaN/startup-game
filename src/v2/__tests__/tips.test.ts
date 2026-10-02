import { describe, expect, it } from 'vitest'
import { currentCard, dismissCard } from '../chapter'
import { currentTip, TIPS } from '../tips'
import { makeState, member, withChapter, withTeam, withV2 } from './fixtures'

const seenAll = ['beat-0', 'beat-1', 'beat-2', 'beat-3', 'beat-4', 'c2-0', 'c2-1', 'c2-2', 'c2-mistake']
const BIG = { hosting: 5, wifi: 'home' as const, tools: [] }
const base = () => withV2(withChapter(makeState({ cash: 5000, customers: 30 }), { beat: 5, complete: true, seenCards: seenAll }), { infra: BIG })

describe('tips', () => {
  it('cover every new system once', () => {
    expect(TIPS.map(t => t.id)).toEqual(['tip-support', 'tip-debt', 'tip-hosting', 'tip-stress', 'tip-notice', 'tip-shop', 'tip-night', 'tip-market', 'tip-stale'])
  })

  it('show when their moment comes, after chapter cards', () => {
    const s = withV2(base(), { tickets: 5 })
    expect(currentTip(s)?.id).toBe('tip-support')
    expect(currentCard(s)?.id).toBe('tip-support')
    const after = dismissCard(s, 'tip-support')
    expect(currentTip(after)?.id).not.toBe('tip-support')
  })

  it('stay quiet while a chapter card is up', () => {
    const s = withV2(withChapter(base(), { seenCards: ['beat-0', 'beat-1', 'beat-2', 'beat-3', 'beat-4'] }), { tickets: 5 })
    expect(currentCard(s)?.id).toBe('c2-0')
  })

  it('warn about stressed people and notices', () => {
    expect(currentTip(withTeam(base(), member({ stress: 70 })))?.id).toBe('tip-stress')
    const leaving = withTeam(base(), member({ stress: 40, leavingOn: 30 }))
    expect(currentTip(dismissCard(leaving, 'tip-stress'))?.id).toBe('tip-notice')
  })

  it('point at Infra when hosting fills up', () => {
    expect(currentTip(withV2({ ...base(), customers: 17 }, { infra: { hosting: 1, wifi: 'home', tools: [] } }))?.id).toBe('tip-hosting')
  })
})
