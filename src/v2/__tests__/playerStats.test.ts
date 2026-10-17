import { describe, expect, it } from 'vitest'
// @ts-expect-error -- plain-JS Vercel function, no types
import { buildPlayerStats as fromApi } from '../../../api/admin-dashboard.js'
import { buildPlayerStats } from '../../../server/playerStats'

const NOW = Date.parse('2026-10-17T12:00:00Z')
const d = (s: string) => new Date(s)
const sessions = [
  { sessionId: 's1', anonId: 'aaaaaaaa-1111', startupName: 'A1', idea: 'x'.repeat(200), difficultyTier: 'risky', workspace: 'villa', phase: 'lost', lastRecordedDay: 120, createdAt: d('2026-10-10T09:00:00Z'), updatedAt: d('2026-10-10T10:00:00Z') },
  { sessionId: 's2', anonId: 'aaaaaaaa-1111', startupName: 'A2', difficultyTier: 'promising', workspace: 'building', phase: 'sold', lastRecordedDay: 400, createdAt: d('2026-10-16T20:00:00Z'), updatedAt: d('2026-10-17T08:00:00Z') },
  { sessionId: 's3', anonId: 'bbbbbbbb-2222', startupName: 'B1', workspace: 'home', phase: 'playing', lastRecordedDay: 5, createdAt: d('2026-10-17T07:00:00Z'), updatedAt: d('2026-10-17T07:30:00Z') },
  { sessionId: 's4', startupName: 'Old', workspace: 'home', phase: 'lost', lastRecordedDay: 40, createdAt: d('2026-09-01T09:00:00Z'), updatedAt: d('2026-09-01T09:30:00Z') },
]

describe('admin player stats', () => {
  const r = buildPlayerStats(sessions, NOW)

  it('counts unique, recurring and came-back-another-day players', () => {
    expect(r.players).toMatchObject({ unique: 2, recurring: 1, returnedAnotherDay: 1, sessionsWithoutId: 1 })
    expect(r.players.gamesPerPlayer).toEqual({ '1': 1, '2': 1 })
    expect(r.players.top[0]).toMatchObject({ player: 'aaaaaaaa', games: 2, bestDay: 400 })
  })

  it('same-day replays are recurring but not "another day"', () => {
    const same = [sessions[0], { ...sessions[0], sessionId: 'x', createdAt: d('2026-10-10T15:00:00Z') }]
    expect(buildPlayerStats(same, NOW).players).toMatchObject({ unique: 1, recurring: 1, returnedAnotherDay: 0 })
  })

  it('activity, funnel, locations and recent games', () => {
    expect(r.activity).toEqual({ games24h: 2, games7d: 2, activePlayers7d: 2 })
    expect(r.funnel.find(f => f.day === 100)).toMatchObject({ count: 2, pct: 0.5 })
    expect(r.locationSplit).toEqual({ villa: 1, building: 1, home: 2 })
    expect(r.recent[0]).toMatchObject({ startupName: 'A2', player: 'aaaaaaaa' })
    expect(r.recent.find(x => x.startupName === 'A1')!.idea).toHaveLength(90)
    expect(r.recent.find(x => x.startupName === 'Old')!.player).toBeNull()
  })

  it('handles an empty database', () => {
    expect(buildPlayerStats([], NOW).players).toMatchObject({ unique: 0, recurring: 0 })
  })

  it('the Vercel copy gives exactly the same answer', () => {
    expect(JSON.stringify(fromApi(sessions, NOW))).toBe(JSON.stringify(r))
  })
})
