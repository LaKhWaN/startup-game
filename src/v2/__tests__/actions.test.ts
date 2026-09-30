import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }))
vi.mock('../../analytics/persistDayAnalytics', () => ({ persistDayAnalytics: vi.fn(async () => {}) }))

import { useGameStore } from '../../store/gameStore'
import {
  claimFamilyMoney, getV2State, newGameV2, pauseForModal, resetStoreForV2,
  startFounderTask, stepGame, upgradeLegacyRestart,
} from '../actions'
import { isV2Game } from '../state'
import { makeConfig } from './fixtures'

beforeEach(() => resetStoreForV2())

describe('resetStoreForV2', () => {
  it('leaves a clean setup state with no v2 slice', () => {
    newGameV2(makeConfig())
    resetStoreForV2()
    const s = getV2State()
    expect(s.phase).toBe('setup')
    expect(s.v2).toBeUndefined()
    expect(s.gameSpeed).toBe(1)
  })
})

describe('newGameV2', () => {
  it('starts a v2 game in the shared store', () => {
    newGameV2(makeConfig())
    const s = getV2State()
    expect(isV2Game(s)).toBe(true)
    expect(s.cash).toBe(500)
    expect(s.phase).toBe('playing')
  })
})

describe('startFounderTask', () => {
  it('returns the reason and leaves the state alone when a task is locked', () => {
    newGameV2(makeConfig())
    expect(startFounderTask('emails')).toBe('locked')
    expect(getV2State().v2.founder.task).toBeNull()
  })

  it('starts an unlocked task', () => {
    newGameV2(makeConfig())
    expect(startFounderTask('research')).toBeNull()
    expect(getV2State().v2.founder.task?.type).toBe('research')
  })
})

describe('stepGame', () => {
  it('advances legacy time by one hour and the founder with it', () => {
    newGameV2(makeConfig())
    startFounderTask('research')
    stepGame()
    const s = getV2State()
    expect(s.gameTime.totalHours).toBe(1)
    expect(s.v2.founder.task?.progress).toBeCloseTo(1 / 72)
  })
})

describe('family money modal', () => {
  it('pauses, then restores the previous speed and pays out on claim', () => {
    newGameV2(makeConfig())
    const s = getV2State()
    useGameStore.setState({
      gameSpeed: 3,
      v2: { ...s.v2, chapter: { ...s.v2.chapter, beat: 5, familyMoney: { giver: 'Your cousin', amount: 900, claimed: false } } },
    } as never)
    pauseForModal()
    expect(getV2State().gameSpeed).toBe(0)
    claimFamilyMoney()
    const after = getV2State()
    expect(after.gameSpeed).toBe(3)
    expect(after.cash).toBe(500 + 900)
    expect(after.v2.chapter.complete).toBe(true)
  })
})

describe('upgradeLegacyRestart', () => {
  it('turns a legacy "Play Again" inside /new into a fresh v2 game', () => {
    newGameV2(makeConfig())
    useGameStore.getState().quickRestart() // legacy action → legacy-rules state, stale v2 slice
    expect(isV2Game(getV2State())).toBe(false)
    upgradeLegacyRestart()
    const s = getV2State()
    expect(isV2Game(s)).toBe(true)
    expect(s.cash).toBe(500)
  })

  it('does nothing for a legacy "New Game" (setup phase)', () => {
    newGameV2(makeConfig())
    useGameStore.getState().restartGame()
    upgradeLegacyRestart()
    expect(getV2State().phase).toBe('setup')
  })
})
