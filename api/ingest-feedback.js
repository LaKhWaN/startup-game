import { MongoClient } from 'mongodb'

const COL = 'game_feedback'

let clientPromise = null
function getClient(uri) {
  if (!clientPromise) clientPromise = new MongoClient(uri).connect()
  return clientPromise
}

let indexEnsured = false
async function ensureIndex(db) {
  if (indexEnsured) return
  await db.collection(COL).createIndex({ sessionId: 1, submittedAt: 1 })
  indexEnsured = true
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

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : 'anonymous'
  const mood = typeof body.mood === 'number' ? body.mood : null
  const challenges = Array.isArray(body.challenges) ? body.challenges : []
  const wishlist = typeof body.wishlist === 'string' ? body.wishlist.trim().slice(0, 500) : ''
  const day = typeof body.day === 'number' ? body.day : 0
  const mrr = typeof body.mrr === 'number' ? body.mrr : 0
  const customers = typeof body.customers === 'number' ? body.customers : 0

  try {
    const client = await getClient(uri)
    const db = client.db(dbName)
    await ensureIndex(db)

    await db.collection(COL).insertOne({
      sessionId, mood, challenges, wishlist,
      gameContext: { day, mrr, customers },
      submittedAt: new Date(),
    })

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: true }))
  } catch (e) {
    console.error('[ingest-feedback]', e)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Database error' }))
  }
}
