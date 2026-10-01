import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }))
vi.mock('../analytics', () => ({ syncAnalytics: vi.fn() }))

import { holdPause, releasePause } from '../pause'
import { gameStore } from '../store'
import { uiStore } from '../ui'

beforeEach(() => {
  gameStore.setState({ gameSpeed: 5 })
  uiStore.setState(uiStore.getInitialState())
})

describe('pause on popups', () => {
  it('pauses on the first popup and restores the previous speed when it closes', () => {
    holdPause('event')
    expect(gameStore.getState().gameSpeed).toBe(0)
    releasePause('event')
    expect(gameStore.getState().gameSpeed).toBe(5)
  })

  it('stays paused until every popup has closed', () => {
    holdPause('event')
    holdPause('family-money')
    releasePause('event')
    expect(gameStore.getState().gameSpeed).toBe(0)
    releasePause('family-money')
    expect(gameStore.getState().gameSpeed).toBe(5)
  })

  it('holding twice or releasing an unknown popup is harmless', () => {
    holdPause('event'); holdPause('event')
    releasePause('nope')
    expect(gameStore.getState().gameSpeed).toBe(0)
    releasePause('event')
    expect(gameStore.getState().gameSpeed).toBe(5)
  })

  it('resumes at 1× if the game was already paused by the player', () => {
    gameStore.setState({ gameSpeed: 0 })
    holdPause('event')
    releasePause('event')
    expect(gameStore.getState().gameSpeed).toBe(1)
  })

  it('exposes whether a popup is holding the game (speed buttons disable)', () => {
    holdPause('event')
    expect(uiStore.getState().pauseHolds).toEqual(['event'])
  })
})
