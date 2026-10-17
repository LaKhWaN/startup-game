export interface StatsSession {
  sessionId?: string
  anonId?: string
  startupName?: string
  idea?: string
  difficultyTier?: string
  workspace?: string
  phase?: string
  lastRecordedDay?: number
  createdAt?: Date
  updatedAt?: Date
}

const DAY_MS = 24 * 60 * 60 * 1000
const ymd = (d: Date) => d.toISOString().slice(0, 10)

/**
 * Player-level and engagement numbers for the admin dashboard, from `game_sessions` rows.
 * Keep in step with `buildPlayerStats` in api/admin-dashboard.js (a test runs both on the same data).
 */
export function buildPlayerStats(sessions: StatsSession[], now = Date.now()) {
  const byPlayer = new Map<string, { games: number; days: Set<string>; first: number; last: number; bestDay: number }>()
  for (const s of sessions) {
    if (!s.anonId) continue
    const created = s.createdAt ? new Date(s.createdAt) : new Date(0)
    const updated = s.updatedAt ? new Date(s.updatedAt) : created
    const p = byPlayer.get(s.anonId) ?? { games: 0, days: new Set<string>(), first: Infinity, last: 0, bestDay: 0 }
    p.games++
    p.days.add(ymd(created))
    p.first = Math.min(p.first, created.getTime())
    p.last = Math.max(p.last, updated.getTime())
    p.bestDay = Math.max(p.bestDay, Number(s.lastRecordedDay ?? 0))
    byPlayer.set(s.anonId, p)
  }

  const players = [...byPlayer.entries()]
  const gamesPerPlayer: Record<string, number> = {}
  for (const [, p] of players) {
    const k = p.games >= 6 ? '6+' : p.games >= 4 ? '4-5' : String(p.games)
    gamesPerPlayer[k] = (gamesPerPlayer[k] ?? 0) + 1
  }

  const total = sessions.length
  const funnel = [7, 30, 100, 200, 365].map(day => {
    const count = sessions.filter(s => Number(s.lastRecordedDay ?? 0) >= day).length
    return { day, count, pct: total > 0 ? count / total : 0 }
  })

  const locationSplit: Record<string, number> = {}
  for (const s of sessions) {
    const k = String(s.workspace || 'unknown')
    locationSplit[k] = (locationSplit[k] ?? 0) + 1
  }

  const recent = [...sessions]
    .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
    .slice(0, 15)
    .map(s => ({
      startupName: String(s.startupName ?? 'Unnamed'),
      idea: String(s.idea ?? '').slice(0, 90),
      tier: String(s.difficultyTier ?? 'unknown'),
      phase: String(s.phase ?? 'unknown'),
      day: Number(s.lastRecordedDay ?? 0),
      location: String(s.workspace || 'unknown'),
      player: s.anonId ? s.anonId.slice(0, 8) : null,
      updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : null,
    }))

  const since = (ms: number) => sessions.filter(s => s.updatedAt && now - new Date(s.updatedAt).getTime() <= ms)
  return {
    players: {
      unique: players.length,
      recurring: players.filter(([, p]) => p.games >= 2).length,
      returnedAnotherDay: players.filter(([, p]) => p.days.size >= 2).length,
      sessionsWithoutId: total - players.reduce((n, [, p]) => n + p.games, 0),
      gamesPerPlayer,
      top: players
        .sort((a, b) => b[1].games - a[1].games || b[1].last - a[1].last)
        .slice(0, 10)
        .map(([id, p]) => ({ player: id.slice(0, 8), games: p.games, bestDay: p.bestDay, firstSeen: new Date(p.first).toISOString(), lastSeen: new Date(p.last).toISOString() })),
    },
    activity: {
      games24h: since(DAY_MS).length,
      games7d: since(7 * DAY_MS).length,
      activePlayers7d: new Set(since(7 * DAY_MS).map(s => s.anonId).filter(Boolean)).size,
    },
    funnel,
    locationSplit,
    recent,
  }
}
