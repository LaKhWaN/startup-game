import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }))
vi.mock('../analytics', () => ({ syncAnalytics: vi.fn() }))

import { gameStore } from '../store'
import { holdPause, releasePause } from '../pause'
import {
  claimFamilyMoney, getV2State, newGameV2, resetStore,
  startFounderTask, stepGame, quickRestart,
  assignTeamMember, ensureCandidates, fireTeamMember, hireCandidate, moveToLocation, promoteTeamMember,
} from '../actions'
import { isV2Game } from '../state'
import { makeConfig } from './fixtures'

beforeEach(() => resetStore())

describe('resetStore', () => {
  it('leaves a clean setup state', () => {
    newGameV2(makeConfig())
    resetStore()
    const s = getV2State()
    expect(s.phase).toBe('setup')
    expect(s.v2.team).toEqual({})
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
  it('advances time by one hour and the founder with it', () => {
    newGameV2(makeConfig())
    startFounderTask('research')
    stepGame()
    const s = getV2State()
    expect(s.gameTime.totalHours).toBe(10) // games start Monday 09:00
    expect(s.v2.founder.task?.progress).toBeCloseTo(1 / 36)
  })
})

describe('family money modal', () => {
  it('pauses, then restores the previous speed and pays out on claim', () => {
    newGameV2(makeConfig())
    const s = getV2State()
    gameStore.setState({
      gameSpeed: 3,
      v2: { ...s.v2, chapter: { ...s.v2.chapter, beat: 5, familyMoney: { giver: 'Your cousin', amount: 900, claimed: false } } },
    } as never)
    holdPause('family-money') // the modal mounting
    expect(getV2State().gameSpeed).toBe(0)
    claimFamilyMoney()
    releasePause('family-money') // the modal unmounting after the claim
    const after = getV2State()
    expect(after.gameSpeed).toBe(3)
    expect(after.cash).toBe(500 + 900)
    expect(after.v2.chapter.complete).toBe(true)
  })
})

describe('quickRestart', () => {
  it('starts a fresh game with the same idea', () => {
    newGameV2(makeConfig())
    gameStore.setState({ cash: 9999 })
    quickRestart()
    const s = getV2State()
    expect(isV2Game(s)).toBe(true)
    expect(s.cash).toBe(500)
  })
})

describe('resetStore', () => {
  it('goes back to setup', () => {
    newGameV2(makeConfig())
    resetStore()
    expect(getV2State().phase).toBe('setup')
  })
})

describe('team actions', () => {
  function chapterOneDone() {
    newGameV2(makeConfig())
    const s = getV2State()
    gameStore.setState({ cash: 3000, v2: { ...s.v2, chapter: { ...s.v2.chapter, beat: 5, complete: true } } } as never)
  }

  it('fills candidates on demand and hires through the store', () => {
    chapterOneDone()
    ensureCandidates()
    const c = getV2State().v2.candidates[0]
    expect(getV2State().v2.candidates).toHaveLength(3)
    expect(hireCandidate(c.id)).toBe('ok')
    const s = getV2State()
    expect(s.v2.team[c.id]).toBeDefined()
  })

  it('reports why a hire is blocked', () => {
    chapterOneDone()
    ensureCandidates()
    gameStore.setState({ cash: 100 } as never)
    expect(hireCandidate(getV2State().v2.candidates[0].id)).toBe('cash')
  })

  it('reassigns and lets go', () => {
    chapterOneDone()
    ensureCandidates()
    const c = getV2State().v2.candidates[0]
    hireCandidate(c.id)
    assignTeamMember(c.id, 'idle')
    expect(getV2State().v2.team[c.id].assignment).toBe('idle')
    fireTeamMember(c.id)
    expect(getV2State().v2.team[c.id]).toBeUndefined()
  })
})

describe('location actions', () => {
  function chapterTwoDone(cash = 50_000) {
    newGameV2(makeConfig())
    const s = getV2State()
    gameStore.setState({
      cash,
      v2: {
        ...s.v2,
        chapter: { ...s.v2.chapter, beat: 5, complete: true },
        chapter2: { beat: 2, complete: true, firstMistake: false },
        unlockedLocations: ['home', 'biggerHome', 'villa'],
      },
    } as never)
  }

  it('moves, starts Chapter 3 beat 1, and reports blocks', () => {
    chapterTwoDone()
    expect(moveToLocation('coworking')).toBe('locked')
    expect(moveToLocation('biggerHome')).toBe('ok')
    const s = getV2State()
    expect(s.v2.location).toBe('biggerHome')
    expect(s.v2.chapter3.beat).toBe(1)
  })

  it('adds full-time candidates when a move unlocks them', () => {
    chapterTwoDone()
    ensureCandidates()
    expect(getV2State().v2.candidates.some(c => c.tier === 'fulltime')).toBe(false)
    moveToLocation('villa')
    expect(getV2State().v2.candidates.filter(c => c.tier === 'fulltime')).toHaveLength(2)
  })

  it('promotes through the store', () => {
    chapterTwoDone()
    moveToLocation('villa')
    const c = getV2State().v2.candidates.find(x => x.tier === 'intern')!
    hireCandidate(c.id)
    const s = getV2State()
    const m = s.v2.team[c.id]
    gameStore.setState({ v2: { ...s.v2, team: { [c.id]: { ...m, skills: { research: 5, build: 5, outreach: 5, sales: 5 } } } } } as never)
    expect(promoteTeamMember(c.id)).toBe('ok')
    expect(getV2State().v2.team[c.id].tier).toBe('fulltime')
  })
})

describe('ui reset on new game', () => {
  it('a new game starts in the office with nothing open', async () => {
    const { openModal, showCity, uiStore } = await import('../ui')
    showCity(); openModal({ kind: 'team' })
    newGameV2(makeConfig())
    expect(uiStore.getState()).toMatchObject({ view: 'office', modal: null })
  })
})

describe('people actions', () => {
  it('convinces a leaver to stay', async () => {
    const { convinceTeamMemberToStay } = await import('../actions')
    newGameV2(makeConfig())
    const s = getV2State()
    gameStore.setState({ v2: { ...s.v2, team: { x: { id: 'x', name: 'X', gender: 'male', role: 'sales', tier: 'intern', skills: { research: 1, build: 1, outreach: 1, sales: 3 }, assignment: 'sales', task: null, mistakes: 0, seat: 0, characterModel: 'character-male-b', salary: 1000, stress: 95, leavingOn: 20 } } } })
    convinceTeamMemberToStay('x')
    expect(getV2State().v2.team.x.leavingOn).toBeUndefined()
  })
})

describe('shop actions', () => {
  it('buys a perk and upgrades a desk through the store', async () => {
    const { buyShopPerk, upgradeDesk } = await import('../actions')
    newGameV2(makeConfig())
    gameStore.setState({ cash: 10_000 })
    expect(buyShopPerk('coffee')).toBe('ok')
    expect(getV2State().v2.perks).toEqual(['coffee'])
    expect(upgradeDesk('founder')).toBe('ok')
    expect(getV2State().v2.setups.founder).toBe(2)
  })
})

describe('infra actions', () => {
  it('migrates hosting, picks Wi-Fi and toggles tools through the store', async () => {
    const { migrateHosting, chooseWifi, toggleInfraTool } = await import('../actions')
    newGameV2(makeConfig())
    expect(migrateHosting(2)).toBe('ok')
    expect(getV2State().v2.infra.migratingTo).toBe(2)
    chooseWifi('fiber')
    toggleInfraTool('ci')
    expect(getV2State().v2.infra).toMatchObject({ wifi: 'fiber', tools: ['ci'] })
  })
})
