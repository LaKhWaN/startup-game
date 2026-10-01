import { beforeEach, describe, expect, it } from 'vitest'
import { currentCard, dismissCard, reshowCurrentCard } from '../chapter'
import { loadGameV2, saveGameV2 } from '../saveV2'
import type { InternCandidate, V2GameState } from '../state'
import { advanceTeam, hireIntern, teamFinances } from '../team'
import { stepV2 } from '../v2Tick'
import { makeState, seq, withChapter, withV2 } from './fixtures'

const cand = (over: Partial<InternCandidate> = {}): InternCandidate => ({
  id: 'c1', name: 'Sam', gender: 'male', role: 'sales', tier: 'intern',
  skills: { research: 1, build: 1, outreach: 1, sales: 3 }, salary: 800, bio: '', characterModel: 'character-male-c', ...over,
})

const ready = (cash = 5000) => withChapter(makeState({ cash }), { beat: 5, complete: true, seenCards: ['beat-0', 'beat-1', 'beat-2', 'beat-3', 'beat-4'] })
const hire = (s: V2GameState, c = cand()) => hireIntern(withV2(s, { candidates: [c] }), c.id)

describe('teamFinances', () => {
  it('uses net burn (burn minus MRR) for runway, like the legacy banner', () => {
    let s = hire(ready(2000), cand({ id: 'a' }))
    s = hire(s, cand({ id: 'b' }))
    const f = teamFinances({ ...s, cash: 2000, mrr: 900 })
    expect(f.burn).toBe(1600 + 27) // + 3% fees on $900 MRR
    expect(f.runwayMonths).toBe(2) // floor(2000 / 700)
  })

  it('is unlimited once MRR covers the burn', () => {
    const s = hire(ready())
    expect(teamFinances({ ...s, mrr: 5000 }).runwayMonths).toBe(Infinity)
  })
})

describe('a hire finishing sales calls after the leads are gone', () => {
  it('makes no mistake, gains no skill, and says the leads were already called', () => {
    let s = hire(ready())
    s = withV2(s, { leads: 0, team: { c1: { ...s.v2.team.c1, task: { type: 'sales', progress: 0.999 } } } })
    const r = advanceTeam(s, 1, seq(0.0)) // 0.0 would roll a mistake
    const m = r.state.v2.team.c1
    expect(m.mistakes).toBe(0)
    expect(m.skills.sales).toBe(3)
    expect(r.mistakes).toEqual([])
    expect(r.state.storyLog[0].lines.join(' ')).toMatch(/already/i)
  })
})

describe('coach card selection across chapters', () => {
  it('keeps the first-customer card until dismissed, even after the family money is claimed', () => {
    const s = withChapter(makeState(), { beat: 5, complete: true, seenCards: ['beat-0', 'beat-1', 'beat-2', 'beat-3'] })
    expect(currentCard(s)?.id).toBe('beat-4')
    expect(currentCard(dismissCard(s, 'beat-4'))?.id).toBe('c2-0')
  })

  it('re-shows the current Chapter 2 card from Settings', () => {
    let s = withV2(ready(), { chapter2: { beat: 1, complete: false, firstMistake: false } })
    s = dismissCard(s, 'c2-1')
    expect(currentCard(s)).toBeNull()
    expect(currentCard(reshowCurrentCard(s))?.id).toBe('c2-1')
  })
})

describe('spec §7.7 coverage', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, String(v)) },
      removeItem: (k: string) => { store.delete(k) },
      clear: () => store.clear(),
      key: (i: number) => [...store.keys()][i] ?? null,
      get length() { return store.size },
    } as Storage
  })

  it('the real legacy tick produces no customers or features from hires', () => {
    let s = hire(hire(ready(10_000), cand({ id: 'a', role: 'developer', skills: { research: 1, build: 3, outreach: 1, sales: 1 } })), cand({ id: 'b' }))
    s = withV2(s, { team: Object.fromEntries(Object.values(s.v2.team).map(m => [m.id, { ...m, assignment: 'idle' as const }])) })
    const features = s.features.length
    for (let h = 0; h < 24 * 20; h++) s = stepV2(s, seq(0.5))
    expect(s.customers).toBe(0)
    expect(s.features.length).toBe(features)
  })

  it('salaries appear in burn', () => {
    const s = hire(ready())
    expect(teamFinances(s).burn).toBe(800)
  })

  it('round-trips a save with a team', () => {
    const s = hire(ready())
    saveGameV2(2, s)
    const loaded = loadGameV2(2)!
    expect(loaded.v2.team.c1).toEqual(s.v2.team.c1)
  })
})
