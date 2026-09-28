import { MongoClient } from 'mongodb'
import { checkAdminToken, type AdminAuthEnv } from './adminAuth'

const COL_SESSIONS = 'game_sessions'
const COL_DAYS = 'game_day_snapshots'
const COL_FEEDBACK = 'game_feedback'

const FINISHED_PHASES = ['sold', 'lost']

let clientPromise: Promise<MongoClient> | null = null
function getClient(uri: string): Promise<MongoClient> {
  if (!clientPromise) clientPromise = new MongoClient(uri).connect()
  return clientPromise
}

export type AdminDashboardEnv = AdminAuthEnv & {
  MONGODB_URI?: string
  MONGODB_DB_NAME?: string
}

export async function adminDashboard(
  authHeader: string | undefined | null,
  env: AdminDashboardEnv,
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!checkAdminToken(authHeader, env)) {
    return { status: 401, body: { error: 'Unauthorized' } }
  }

  const uri = env.MONGODB_URI
  const dbName = env.MONGODB_DB_NAME || 'startup-game'
  if (!uri) {
    return { status: 503, body: { error: 'MONGODB_URI is not configured' } }
  }

  try {
    const client = await getClient(uri)
    const db = client.db(dbName)

    const [sessions, phaseSplit, tierSplit, dailyStarts, latestSnapshots, feedback] = await Promise.all([
      db.collection(COL_SESSIONS).find({}, {
        projection: { _id: 0, sessionId: 1, phase: 1, lastRecordedDay: 1, difficultyTier: 1, createdAt: 1 },
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

    const exitDayBuckets: Record<string, number> = {}
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

    return {
      status: 200,
      body: {
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
      },
    }
  } catch (e) {
    console.error('[admin-dashboard]', e)
    return { status: 500, body: { error: 'Database error' } }
  }
}
