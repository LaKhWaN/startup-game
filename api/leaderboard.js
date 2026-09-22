import { MongoClient } from 'mongodb'

const COL_SESSIONS = 'game_sessions'
const COL_DAYS = 'game_day_snapshots'

let clientPromise = null
function getClient(uri) {
  if (!clientPromise) clientPromise = new MongoClient(uri).connect()
  return clientPromise
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB_NAME || 'startup-game'

  if (!uri) {
    res.statusCode = 503
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'MONGODB_URI not configured' }))
    return
  }

  try {
    const client = await getClient(uri)
    const db = client.db(dbName)

    const sessions = await db
      .collection(COL_SESSIONS)
      .find(
        { phase: { $in: ['sold', 'lost', 'playing'] } },
        {
          projection: {
            _id: 0,
            sessionId: 1,
            startupName: 1,
            idea: 1,
            difficultyTier: 1,
            phase: 1,
            lastRecordedDay: 1,
          },
        }
      )
      .sort({ lastRecordedDay: -1 })
      .limit(100)
      .toArray()

    const results = []
    for (const session of sessions) {
      const snap = await db.collection(COL_DAYS).findOne(
        { sessionId: session.sessionId, day: session.lastRecordedDay },
        { projection: { _id: 0, mrr: 1, valuation: 1 } }
      )
      results.push({
        rank: 0,
        startupName: String(session.startupName ?? 'Unnamed'),
        idea: String(session.idea ?? ''),
        difficultyTier: String(session.difficultyTier ?? 'unknown'),
        phase: String(session.phase ?? 'unknown'),
        lastRecordedDay: Number(session.lastRecordedDay ?? 0),
        mrr: Number(snap?.mrr ?? 0),
        valuation: Number(snap?.valuation ?? 0),
      })
    }

    results.sort((a, b) => b.valuation - a.valuation || b.mrr - a.mrr)
    results.forEach((r, i) => { r.rank = i + 1 })

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60')
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ entries: results }))
  } catch (e) {
    console.error('[leaderboard]', e)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Database error' }))
  }
}
