/**
 * Loads `.env` from project root, connects with MONGODB_URI, writes a probe doc, reads it back, deletes it.
 * Usage: node scripts/mongo-smoke-test.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MongoClient } from 'mongodb'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const envPath = join(root, '.env')

function loadDotEnv(path) {
  let data
  try {
    data = readFileSync(path, 'utf8')
  } catch {
    console.error('Missing .env at', path)
    process.exit(1)
  }
  for (const line of data.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (key && !(key in process.env)) process.env[key] = val
  }
}

loadDotEnv(envPath)

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB_NAME || 'startup-game'

if (!uri || typeof uri !== 'string' || !uri.startsWith('mongodb')) {
  console.error('MONGODB_URI is missing or invalid in .env (expected mongodb:// or mongodb+srv://)')
  process.exit(1)
}

const collName = '_startup_game_connection_test'

async function main() {
  const client = new MongoClient(uri)
  try {
    await client.connect()
    const db = client.db(dbName)
    const col = db.collection(collName)

    const doc = { probe: true, at: new Date(), note: 'mongo-smoke-test (safe to ignore if you see this briefly)' }
    const ins = await col.insertOne(doc)
    const found = await col.findOne({ _id: ins.insertedId })
    if (!found) {
      console.error('FAIL: inserted document not readable')
      process.exit(1)
    }
    await col.deleteOne({ _id: ins.insertedId })

    console.log('OK: MongoDB connection works.')
    console.log('  Database:', dbName)
    console.log('  Insert + read + delete on collection:', collName)
  } finally {
    await client.close().catch(() => {})
  }
}

main().catch((e) => {
  console.error('FAIL:', e instanceof Error ? e.message : e)
  process.exit(1)
})
