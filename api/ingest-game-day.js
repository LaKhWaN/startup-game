import { MongoClient } from 'mongodb'

const COL_SESSIONS = 'game_sessions'
const COL_DAYS = 'game_day_snapshots'

let clientPromise = null
function getClient(uri) {
  if (!clientPromise) clientPromise = new MongoClient(uri).connect()
  return clientPromise
}

let indexesEnsured = false
async function ensureIndexes(db) {
  if (indexesEnsured) return
  await db.collection(COL_SESSIONS).createIndex({ sessionId: 1 }, { unique: true })
  await db.collection(COL_DAYS).createIndex({ sessionId: 1, day: 1 }, { unique: true })
  indexesEnsured = true
}

function num(v, fallback = 0) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB_NAME || 'startup-game'
  const serverSecret = process.env.ANALYTICS_INGEST_SECRET

  if (!uri) {
    res.statusCode = 503
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'MONGODB_URI not configured' }))
    return
  }

  let body
  try {
    body = JSON.parse(await readBody(req))
  } catch {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Invalid JSON' }))
    return
  }

  if (serverSecret && body.ingestSecret !== serverSecret) {
    res.statusCode = 401
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Unauthorized' }))
    return
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
  if (!sessionId) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'sessionId required' }))
    return
  }

  const s = body.snapshot
  if (!s || typeof s !== 'object' || !Number.isInteger(num(s.day, NaN))) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'snapshot required' }))
    return
  }

  const snapshot = {
    day: num(s.day), mrr: num(s.mrr), customers: num(s.customers),
    churnRate: num(s.churnRate), cash: num(s.cash), burn: num(s.burn),
    runway: num(s.runway), arpu: num(s.arpu), brand: num(s.brand),
    techDebt: num(s.techDebt), productProgress: num(s.productProgress),
    teamSize: num(s.teamSize), culture: num(s.culture), valuation: num(s.valuation),
  }

  const session = body.session && typeof body.session === 'object' ? body.session : {}

  try {
    const client = await getClient(uri)
    const db = client.db(dbName)
    await ensureIndexes(db)
    const now = new Date()

    await db.collection(COL_SESSIONS).updateOne(
      { sessionId },
      {
        $set: {
          sessionId,
          startupName: String(session.startupName ?? 'Unnamed'),
          idea: String(session.idea ?? ''),
          difficultyTier: String(session.difficultyTier ?? 'unknown'),
          workspace: String(session.workspace ?? ''),
          phase: String(session.phase ?? 'playing'),
          updatedAt: now,
          lastRecordedDay: snapshot.day,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    )

    await db.collection(COL_DAYS).updateOne(
      { sessionId, day: snapshot.day },
      { $set: { sessionId, gameDay: snapshot.day, ...snapshot, ingestedAt: now } },
      { upsert: true }
    )

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: true, sessionId, day: snapshot.day }))
  } catch (e) {
    console.error('[ingest-game-day]', e)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Database error' }))
  }
}
