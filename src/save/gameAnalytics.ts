import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import type { GameState, MetricsSnapshot } from '../types'
import { totalDays, getCompanyValuation } from '../engine/gameEngine'

export const ANALYTICS_DB_STORAGE_KEY = 'startup-game-analytics-sqlite'

const DB_KEY = ANALYTICS_DB_STORAGE_KEY

export interface GameSummary {
  id: string
  startupName: string
  difficultyTier: string
  phaseEnd: 'sold' | 'lost' | 'in_progress'
  finalDay: number
  finalMrr: number
  finalCustomers: number
  finalValuation: number
  startedAt: string
  endedAt: string | null
  daysRecorded: number
}

let sqlPromise: Promise<SqlJsStatic> | null = null
let dbPromise: Promise<Database> | null = null
let saveQueue: Promise<void> = Promise.resolve()

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

async function getSql(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({ locateFile: () => wasmUrl })
  }
  return sqlPromise
}

async function persistDb(db: Database): Promise<void> {
  const bytes = db.export()
  localStorage.setItem(DB_KEY, toBase64(bytes))
}

function ensureSchema(db: Database): void {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      startup_name TEXT NOT NULL,
      idea TEXT,
      difficulty_tier TEXT,
      workspace TEXT,
      phase_end TEXT DEFAULT 'in_progress',
      started_at TEXT NOT NULL,
      ended_at TEXT,
      final_day INTEGER DEFAULT 0,
      final_cash REAL DEFAULT 0,
      final_mrr REAL DEFAULT 0,
      final_customers INTEGER DEFAULT 0,
      final_valuation REAL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS game_daily_metrics (
      game_id TEXT NOT NULL,
      day INTEGER NOT NULL,
      mrr REAL NOT NULL,
      customers INTEGER NOT NULL,
      churn_rate REAL NOT NULL,
      cash REAL NOT NULL,
      burn REAL NOT NULL,
      runway INTEGER NOT NULL,
      arpu REAL NOT NULL,
      brand REAL NOT NULL,
      tech_debt REAL NOT NULL,
      product_progress REAL NOT NULL,
      team_size INTEGER NOT NULL,
      culture REAL NOT NULL,
      valuation REAL NOT NULL,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (game_id, day),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_daily_game_day ON game_daily_metrics(game_id, day);
    CREATE INDEX IF NOT EXISTS idx_games_started ON games(started_at DESC);
  `)
}

async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await getSql()
      const raw = localStorage.getItem(DB_KEY)
      const db = raw ? new SQL.Database(fromBase64(raw)) : new SQL.Database()
      ensureSchema(db)
      if (!raw) await persistDb(db)
      return db
    })()
  }
  return dbPromise
}

function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = saveQueue.then(fn, fn)
  saveQueue = run.then(() => undefined, () => undefined)
  return run
}

function getLatestSnapshot(state: GameState): MetricsSnapshot | null {
  const arr = state.fullMetricsHistory ?? []
  if (arr.length === 0) return null
  return arr[arr.length - 1]
}

async function upsertGameRow(db: Database, state: GameState): Promise<void> {
  const day = totalDays(state.gameTime)
  const valuation = getCompanyValuation(state).valuation
  const phaseEnd = state.phase === 'playing' ? 'in_progress' : state.phase
  const nowIso = new Date().toISOString()
  const startedAt = new Date(Date.now() - day * 24 * 60 * 60 * 1000).toISOString()
  const stmt = db.prepare(`
    INSERT INTO games (
      id, startup_name, idea, difficulty_tier, workspace, phase_end, started_at, ended_at,
      final_day, final_cash, final_mrr, final_customers, final_valuation
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      startup_name = excluded.startup_name,
      idea = excluded.idea,
      difficulty_tier = excluded.difficulty_tier,
      workspace = excluded.workspace,
      phase_end = excluded.phase_end,
      ended_at = excluded.ended_at,
      final_day = excluded.final_day,
      final_cash = excluded.final_cash,
      final_mrr = excluded.final_mrr,
      final_customers = excluded.final_customers,
      final_valuation = excluded.final_valuation;
  `)
  stmt.bind([
    state.gameId,
    state.startupName || 'Unnamed',
    state.idea ?? '',
    state.difficultyModifier?.tier ?? 'unknown',
    state.workspace ?? '',
    phaseEnd,
    startedAt,
    phaseEnd === 'in_progress' ? null : nowIso,
    day,
    state.cash,
    state.mrr,
    state.customers,
    valuation,
  ])
  stmt.step()
  stmt.free()
}

/** Upsert game metadata + append one row per (game_id, day) when snapshot exists. */
export async function syncDailyMetricsFromState(state: GameState): Promise<void> {
  return withWriteLock(async () => {
    const db = await getDb()
    await upsertGameRow(db, state)

    const snap = getLatestSnapshot(state)
    if (snap) {
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO game_daily_metrics (
          game_id, day, mrr, customers, churn_rate, cash, burn, runway, arpu, brand,
          tech_debt, product_progress, team_size, culture, valuation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.bind([
        state.gameId,
        snap.day,
        snap.mrr,
        snap.customers,
        snap.churnRate,
        snap.cash,
        snap.burn,
        snap.runway,
        snap.arpu,
        snap.brand,
        snap.techDebt,
        snap.productProgress,
        snap.teamSize,
        snap.culture,
        snap.valuation,
      ])
      stmt.step()
      stmt.free()
    }

    await persistDb(db)
  })
}

/** @deprecated use syncDailyMetricsFromState */
export async function recordDailyMetrics(state: GameState): Promise<void> {
  return syncDailyMetricsFromState(state)
}

export async function finalizeGameRecord(state: GameState): Promise<void> {
  return withWriteLock(async () => {
    const db = await getDb()
    await upsertGameRow(db, state)
    await persistDb(db)
  })
}

// Backward-compatible wrapper used in existing call sites.
export function saveGameRecord(state: GameState): void {
  void finalizeGameRecord(state)
}

function rowsFromQuery<T>(db: Database, sql: string, mapRow: (vals: (string | number | null)[]) => T): T[] {
  const out = db.exec(sql)
  if (out.length === 0) return []
  return out[0].values.map(v => mapRow(v as (string | number | null)[]))
}

export async function getGameSummaries(): Promise<GameSummary[]> {
  const db = await getDb()
  const sql = `
    SELECT g.id, g.startup_name, g.difficulty_tier, g.phase_end, g.final_day, g.final_mrr,
           g.final_customers, g.final_valuation, g.started_at, g.ended_at,
           (SELECT COUNT(*) FROM game_daily_metrics m WHERE m.game_id = g.id) AS days_recorded
    FROM games g
    ORDER BY g.started_at DESC
  `
  return rowsFromQuery(db, sql, (v: (string | number | null)[]) => ({
    id: String(v[0] ?? ''),
    startupName: String(v[1] ?? ''),
    difficultyTier: String(v[2] ?? 'unknown'),
    phaseEnd: (String(v[3] ?? 'in_progress') as GameSummary['phaseEnd']),
    finalDay: Number(v[4] ?? 0),
    finalMrr: Number(v[5] ?? 0),
    finalCustomers: Number(v[6] ?? 0),
    finalValuation: Number(v[7] ?? 0),
    startedAt: String(v[8] ?? ''),
    endedAt: (v[9] as string | null) ?? null,
    daysRecorded: Number(v[10] ?? 0),
  }))
}

/** Decode localStorage payload to a real SQLite file blob (for DB Browser / scripts). */
export function getAnalyticsDatabaseBytesFromStorage(): Uint8Array | null {
  const raw = localStorage.getItem(DB_KEY)
  if (!raw) return null
  try {
    return fromBase64(raw)
  } catch {
    return null
  }
}

export async function getDailyMetricsForGame(gameId: string): Promise<MetricsSnapshot[]> {
  const db = await getDb()
  const stmt = db.prepare(`
    SELECT day, mrr, customers, churn_rate, cash, burn, runway, arpu, brand, tech_debt,
           product_progress, team_size, culture, valuation
    FROM game_daily_metrics
    WHERE game_id = ?
    ORDER BY day ASC
  `)
  stmt.bind([gameId])
  const rows: MetricsSnapshot[] = []
  while (stmt.step()) {
    const row = stmt.get() as number[]
    rows.push({
      day: row[0],
      mrr: row[1],
      customers: row[2],
      churnRate: row[3],
      cash: row[4],
      burn: row[5],
      runway: row[6],
      arpu: row[7],
      brand: row[8],
      techDebt: row[9],
      productProgress: row[10],
      teamSize: row[11],
      culture: row[12],
      valuation: row[13],
    })
  }
  stmt.free()
  return rows
}
