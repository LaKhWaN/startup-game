import type { LeaderboardEntry } from '../types'

const STORAGE_KEY = 'startup-game-leaderboard'
const MAX_ENTRIES = 20

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as LeaderboardEntry[]
  } catch {
    return []
  }
}

function computeScore(entry: LeaderboardEntry): number {
  const outcomeWeight = entry.outcome === 'sold' ? 1.0 : 0.6
  const daysBonus = entry.daysSurvived * 50
  return Math.floor(outcomeWeight * entry.valuation + daysBonus)
}

export function addLeaderboardEntry(entry: LeaderboardEntry): LeaderboardEntry[] {
  const board = getLeaderboard()
  board.push(entry)
  board.sort((a, b) => computeScore(b) - computeScore(a))
  const trimmed = board.slice(0, MAX_ENTRIES)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  return trimmed
}
