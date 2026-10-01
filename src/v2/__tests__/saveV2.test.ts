import { beforeEach, describe, expect, it } from 'vitest'
import { EVENTS } from '../../data/events'
import { FOUNDER_ID, reconcileFounderFeatures } from '../founder'
import { deleteSaveV2, listSavesV2, loadGameV2, saveGameV2, slotKeyV2 } from '../saveV2'
import { makeFeature, makeState, withChapter, withFounder, withV2 } from './fixtures'

function installLocalStorage(): Map<string, string> {
  const store = new Map<string, string>()
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)) },
    removeItem: (k: string) => { store.delete(k) },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size },
  } as Storage
  return store
}

let store: Map<string, string>
beforeEach(() => { store = installLocalStorage() })

describe('saveV2', () => {
  it('uses its own key prefix and never touches legacy slots', () => {
    saveGameV2(1, makeState())
    expect(slotKeyV2(1)).toBe('startup-game-v2-save-1')
    expect(store.has('startup-game-v2-save-1')).toBe(true)
    expect(store.has('startup-game-save-1')).toBe(false)
  })

  it('round-trips the v2 slice and restores the pending event by id', () => {
    const s = withV2(withChapter(makeState({ pendingEvent: EVENTS[1] }), { beat: 2 }), { leads: 7 })
    saveGameV2(2, s)
    const loaded = loadGameV2(2)!
    expect(loaded.v2.chapter.beat).toBe(2)
    expect(loaded.v2.leads).toBe(7)
    expect(loaded.pendingEvent?.id).toBe(EVENTS[1].id)
    expect(loaded.gameId).toBe(s.gameId)
  })

  it('rejects saves without a valid v2 slice or with a legacy id', () => {
    store.set(slotKeyV2(1), JSON.stringify({ meta: {}, state: { ...makeState(), v2: {} } }))
    expect(loadGameV2(1)).toBeNull()
    store.set(slotKeyV2(2), JSON.stringify({ meta: {}, state: { ...makeState(), gameId: 'game-123' } }))
    expect(loadGameV2(2)).toBeNull()
    store.set(slotKeyV2(3), 'not json')
    expect(loadGameV2(3)).toBeNull()
  })

  it('lists and deletes slots', () => {
    saveGameV2(3, withChapter(makeState(), { beat: 5, complete: true }))
    const metas = listSavesV2()
    expect(metas[0]).toBeNull()
    expect(metas[2]).toMatchObject({ slot: 3, startupName: 'Groomly', chapterComplete: true })
    deleteSaveV2(3)
    expect(listSavesV2()[2]).toBeNull()
  })
})

describe('reconcileFounderFeatures', () => {
  it('returns an orphaned founder build to proposed', () => {
    const orphan = makeFeature({ status: 'in_development', assignedToDevId: FOUNDER_ID, buildProgress: 0.4 })
    const fixed = reconcileFounderFeatures(makeState({ features: [orphan] }))
    expect(fixed.features[0]).toMatchObject({ status: 'proposed', buildProgress: 0 })
    expect(fixed.features[0].assignedToDevId).toBeUndefined()
  })

  it('drops a develop task that points at a missing feature', () => {
    const s = withFounder(makeState(), { task: { type: 'develop', featureId: 'nope', progress: 0.5 } })
    expect(reconcileFounderFeatures(s).v2.founder.task).toBeNull()
  })

  it('leaves a consistent in-progress build alone', () => {
    const building = makeFeature({ status: 'in_development', assignedToDevId: FOUNDER_ID, buildProgress: 0.4 })
    const s = withFounder(makeState({ features: [building] }), { task: { type: 'develop', featureId: 'feat-test', progress: 0.4 } })
    expect(reconcileFounderFeatures(s)).toBe(s)
  })

  it('runs on load', () => {
    const orphan = makeFeature({ status: 'in_development', assignedToDevId: FOUNDER_ID })
    saveGameV2(1, makeState({ features: [orphan] }))
    expect(loadGameV2(1)!.features[0].status).toBe('proposed')
  })
})

describe('Phase 1/2 save compatibility', () => {
  it('loads a save whose v2 slice has no team fields', () => {
    const s = makeState()
    const { team: _t, candidates: _c, chapter2: _ch, ...oldV2 } = s.v2
    store.set(slotKeyV2(1), JSON.stringify({ meta: {}, state: { ...s, v2: oldV2 } }))
    const loaded = loadGameV2(1)
    expect(loaded).not.toBeNull()
    expect(loaded!.v2.team).toEqual({})
    expect(loaded!.v2.chapter2.complete).toBe(false)
  })
})
