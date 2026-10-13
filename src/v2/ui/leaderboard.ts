import type { LeaderboardEntry } from '../../types'

/** New launch, new board (the legacy board lived under startup-game-leaderboard). */
export const LEADERBOARD_KEY = 'startup-v2-leaderboard'
const MAX_ENTRIES = 20

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY)
    return raw ? (JSON.parse(raw) as LeaderboardEntry[]) : []
  } catch {
    return []
  }
}

export function leaderboardScore(e: LeaderboardEntry): number {
  return Math.floor((e.outcome === 'sold' ? 1 : 0.6) * e.valuation + e.daysSurvived * 50)
}

export function addLeaderboardEntry(entry: LeaderboardEntry): LeaderboardEntry[] {
  const board = [...getLeaderboard(), entry].sort((a, b) => leaderboardScore(b) - leaderboardScore(a)).slice(0, MAX_ENTRIES)
  try { localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board)) } catch { /* private mode */ }
  return board
}
