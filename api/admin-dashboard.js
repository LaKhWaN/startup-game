import { MongoClient } from 'mongodb'

const COL_SESSIONS = 'game_sessions'
const COL_DAYS = 'game_day_snapshots'
const COL_FEEDBACK = 'game_feedback'
const FINISHED_PHASES = ['sold', 'lost']

let clientPromise = null
function getClient(uri) {
  if (!clientPromise) clientPromise = new MongoClient(uri).connect()
  return clientPromise
}

function checkAdminToken(authHeader, secret) {
  if (!secret) return false
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
  return token.length > 0 && token === secret
}

const DAY_MS = 24 * 60 * 60 * 1000
const ymd = d => d.toISOString().slice(0, 10)

/**
 * Player-level and engagement numbers for the admin dashboard, from `game_sessions` rows.
 * Keep in step with `buildPlayerStats` in server/playerStats.ts (a test runs both on the same data).
 */
export function buildPlayerStats(sessions, now = Date.now()) {
  const byPlayer = new Map()
  for (const s of sessions) {
    if (!s.anonId) continue
    const created = s.createdAt ? new Date(s.createdAt) : new Date(0)
    const updated = s.updatedAt ? new Date(s.updatedAt) : created
    const p = byPlayer.get(s.anonId) ?? { games: 0, days: new Set(), first: Infinity, last: 0, bestDay: 0 }
    p.games++
    p.days.add(ymd(created))
    p.first = Math.min(p.first, created.getTime())
    p.last = Math.max(p.last, updated.getTime())
    p.bestDay = Math.max(p.bestDay, Number(s.lastRecordedDay ?? 0))
    byPlayer.set(s.anonId, p)
  }

  const players = [...byPlayer.entries()]
  const gamesPerPlayer = {}
  for (const [, p] of players) {
    const k = p.games >= 6 ? '6+' : p.games >= 4 ? '4-5' : String(p.games)
    gamesPerPlayer[k] = (gamesPerPlayer[k] ?? 0) + 1
  }

  const total = sessions.length
  const funnel = [7, 30, 100, 200, 365].map(day => {
    const count = sessions.filter(s => Number(s.lastRecordedDay ?? 0) >= day).length
    return { day, count, pct: total > 0 ? count / total : 0 }
  })

  const locationSplit = {}
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

  const since = ms => sessions.filter(s => s.updatedAt && now - new Date(s.updatedAt).getTime() <= ms)
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  if (!checkAdminToken(req.headers.authorization, process.env.ADMIN_SECRET)) {
    res.statusCode = 401
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Unauthorized' }))
    return
  }

  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB_NAME || 'startup-game'
  if (!uri) {
    res.statusCode = 503
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'MONGODB_URI is not configured' }))
    return
  }

  try {
    const client = await getClient(uri)
    const db = client.db(dbName)

    const [sessions, phaseSplit, tierSplit, dailyStarts, latestSnapshots, feedback] = await Promise.all([
      db.collection(COL_SESSIONS).find({}, {
        projection: { _id: 0, sessionId: 1, anonId: 1, startupName: 1, idea: 1, workspace: 1, phase: 1, lastRecordedDay: 1, difficultyTier: 1, createdAt: 1, updatedAt: 1 },
      }).toArray(),

      db.collection(COL_SESSIONS).aggregate([
        { $group: { _id: '$phase', count: { $sum: 1 } } },
      ]).toArray(),

      db.collection(COL_SESSIONS).aggregate([
        { $group: { _id: '$difficultyTier', count: { $sum: 1 } } },
      ]).toArray(),

      db.collection(COL_SESSIONS).aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]).toArray(),

      db.collection(COL_DAYS).aggregate([
        { $sort: { sessionId: 1, day: -1 } },
        { $group: { _id: '$sessionId', mrr: { $first: '$mrr' }, cash: { $first: '$cash' }, churnRate: { $first: '$churnRate' }, day: { $first: '$day' } } },
      ]).toArray(),

      db.collection(COL_FEEDBACK)
        .find({}, { projection: { _id: 0 } })
        .sort({ submittedAt: -1 })
        .limit(200)
        .toArray(),
    ])

    const totalSessions = sessions.length
    const avgDayReached = totalSessions > 0
      ? sessions.reduce((sum, s) => sum + Number(s.lastRecordedDay ?? 0), 0) / totalSessions
      : 0

    const finishedSessions = sessions.filter(s => FINISHED_PHASES.includes(String(s.phase)))
    const wonSessions = sessions.filter(s => s.phase === 'sold')
    const winRate = finishedSessions.length > 0 ? wonSessions.length / finishedSessions.length : 0

    const exitDayBuckets = {}
    for (const s of finishedSessions) {
      const day = Number(s.lastRecordedDay ?? 0)
      const bucketStart = Math.floor(day / 10) * 10
      const key = `${bucketStart}-${bucketStart + 9}`
      exitDayBuckets[key] = (exitDayBuckets[key] ?? 0) + 1
    }

    const avgFinal = latestSnapshots.length > 0
      ? {
          mrr: latestSnapshots.reduce((sum, s) => sum + Number(s.mrr ?? 0), 0) / latestSnapshots.length,
          cash: latestSnapshots.reduce((sum, s) => sum + Number(s.cash ?? 0), 0) / latestSnapshots.length,
          churnRate: latestSnapshots.reduce((sum, s) => sum + Number(s.churnRate ?? 0), 0) / latestSnapshots.length,
        }
      : { mrr: 0, cash: 0, churnRate: 0 }

    let cumulative = 0
    const trends = dailyStarts.map(d => {
      cumulative += Number(d.count ?? 0)
      return { date: String(d._id), started: Number(d.count ?? 0), cumulative }
    })

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      sessions: {
        total: totalSessions,
        phaseSplit: Object.fromEntries(phaseSplit.map(p => [String(p._id ?? 'unknown'), p.count])),
        tierSplit: Object.fromEntries(tierSplit.map(t => [String(t._id ?? 'unknown'), t.count])),
        avgDayReached,
      },
      trends,
      financials: {
        avgFinalMrr: avgFinal.mrr,
        avgFinalCash: avgFinal.cash,
        avgFinalChurnRate: avgFinal.churnRate,
        winRate,
        finishedCount: finishedSessions.length,
        exitDayBuckets,
      },
      feedback,
      ...buildPlayerStats(sessions),
    }))
  } catch (e) {
    console.error('[admin-dashboard]', e)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Database error' }))
  }
}
