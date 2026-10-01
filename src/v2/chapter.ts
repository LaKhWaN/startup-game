import { currentTip } from './tips'
import { addStory, type Beat, type FamilyMoney, type FounderTaskType, type Rng, type V2GameState } from './state'

export const TASK_UNLOCK_BEAT: Record<FounderTaskType, Beat> = {
  research: 0,
  develop: 1,
  emails: 2,
  sales: 3,
  // Unlocked with Chapter 1 (family money).
  support: 5,
  refactor: 5,
}

export function isTaskUnlocked(state: Pick<V2GameState, 'v2'>, type: FounderTaskType): boolean {
  const { chapter } = state.v2
  return chapter.complete || chapter.beat >= TASK_UNLOCK_BEAT[type]
}

export function isMetricsUnlocked(state: Pick<V2GameState, 'v2'>): boolean {
  return state.v2.chapter.complete || state.v2.chapter.beat >= 4
}

export interface CoachCard {
  id: string
  title: string
  body: string
}

type CardId = 'beat-0' | 'beat-1' | 'beat-2' | 'beat-3' | 'beat-4'

export const COACH_CARDS: Record<CardId, CoachCard> = {
  'beat-0': {
    id: 'beat-0',
    title: 'Day one',
    body: "It's just you, a laptop and an idea. Every company starts here. Start by researching your market.",
  },
  'beat-1': {
    id: 'beat-1',
    title: 'You know what to build',
    body: 'Research turns an idea into concrete things to build. Pick one and build it yourself.',
  },
  'beat-2': {
    id: 'beat-2',
    title: 'Your first users',
    body: "People signed up to try it. They're leads, not customers. Go find more.",
  },
  'beat-3': {
    id: 'beat-3',
    title: 'Time to sell',
    body: "Leads don't pay. Customers do. Time to sell.",
  },
  'beat-4': {
    id: 'beat-4',
    title: 'First paying customer!',
    body: "🎉 First paying customer! That's real revenue: $50/mo.",
  },
}

function cardIdFor(beat: Beat): CardId {
  return `beat-${Math.min(beat, 4)}` as CardId
}

export function currentCoachCard(state: Pick<V2GameState, 'v2'>): CoachCard | null {
  const { beat, seenCards } = state.v2.chapter
  const id = cardIdFor(beat)
  return seenCards.includes(id) ? null : COACH_CARDS[id]
}

export function dismissCard(state: V2GameState, id: string): V2GameState {
  const { chapter } = state.v2
  if (chapter.seenCards.includes(id)) return state
  return { ...state, v2: { ...state.v2, chapter: { ...chapter, seenCards: [...chapter.seenCards, id] } } }
}

/** The card the player is on right now, seen or not (what Settings re-shows). */
export function currentCardId(state: Pick<V2GameState, 'v2'>): string {
  const { chapter, chapter2, chapter3 } = state.v2
  if (!chapter.complete || !chapter.seenCards.includes('beat-4')) return cardIdFor(chapter.beat)
  if (chapter2.complete && chapter.seenCards.includes('c2-done')) return chapter3Id(state)
  if (chapter2.complete) return 'c2-done'
  if (chapter2.firstMistake && !chapter.seenCards.includes('c2-mistake')) return 'c2-mistake'
  return `c2-${chapter2.beat}`
}

/** The coach card to show: each chapter's cards in turn, until dismissed. */
export function currentCard(state: Pick<V2GameState, 'v2'>): CoachCard | null {
  const chapterCard = currentCoachCard(state) ?? currentChapter2Card(state) ?? currentChapter3Card(state)
  if (chapterCard) return chapterCard
  // System tips need the whole game state; panels pass it, older callers pass only { v2 }.
  return 'gameTime' in state ? currentTip(state as V2GameState) : null
}

export function reshowCurrentCard(state: V2GameState): V2GameState {
  const { chapter } = state.v2
  const id = currentCardId(state)
  return { ...state, v2: { ...state.v2, chapter: { ...chapter, seenCards: chapter.seenCards.filter(c => c !== id) } } }
}

export const FAMILY_GIVERS = [
  'Your cousin',
  'An old college friend',
  'Your former manager',
  'Your parents',
  'Your best friend',
]
export const FAMILY_MIN = 800
export const FAMILY_MAX = 1500

export function rollFamilyMoney(rng: Rng): FamilyMoney {
  const giver = FAMILY_GIVERS[Math.min(FAMILY_GIVERS.length - 1, Math.floor(rng() * FAMILY_GIVERS.length))]
  const amount = FAMILY_MIN + Math.floor(rng() * (FAMILY_MAX - FAMILY_MIN + 1))
  return { giver, amount, claimed: false }
}

/** Called by v2Tick whenever the founder completes a task. Beats only move forward, one at a time. */
export function onTaskCompleted(state: V2GameState, type: FounderTaskType, rng: Rng): V2GameState {
  const { chapter } = state.v2
  if (chapter.complete) return state

  let beat: Beat = chapter.beat
  if (beat === 0 && type === 'research') beat = 1
  else if (beat === 1 && type === 'develop') beat = 2
  else if (beat === 2 && type === 'emails') beat = 3
  else if (beat === 3 && type === 'sales' && state.v2.firstSaleDone) beat = 4
  if (beat === chapter.beat) return state

  let familyMoney = chapter.familyMoney
  if (beat === 4) {
    // Beat 4 (first customer card) and beat 5 (family money) happen together.
    beat = 5
    familyMoney = rollFamilyMoney(rng)
  }
  return { ...state, v2: { ...state.v2, chapter: { ...chapter, beat, familyMoney } } }
}

export function claimFamilyMoney(state: V2GameState): V2GameState {
  const { chapter } = state.v2
  const money = chapter.familyMoney
  if (chapter.beat !== 5 || !money || money.claimed) return state
  const next: V2GameState = {
    ...state,
    cash: state.cash + money.amount,
    v2: { ...state.v2, chapter: { ...chapter, complete: true, familyMoney: { ...money, claimed: true } } },
  }
  return addStory(next, [`${money.giver} believed in you before anyone else did: +$${money.amount.toLocaleString()}.`])
}

// ── Chapter 2: first hires ──────────────────────────────────────────────────

export function isTeamUnlocked(state: Pick<V2GameState, 'v2'>): boolean {
  return state.v2.chapter.complete
}

export const CHAPTER2_GOAL_MRR = 1000

type Chapter2CardId = 'c2-0' | 'c2-1' | 'c2-2' | 'c2-mistake' | 'c2-done'

export const CHAPTER2_CARDS: Record<Chapter2CardId, CoachCard> = {
  'c2-0': { id: 'c2-0', title: 'Time to hire', body: "You can't do everything yourself. Hire an intern: cheap, eager, a bit messy. Open the Team tab." },
  'c2-1': { id: 'c2-1', title: 'Give them a job', body: "Interns keep doing their assignment until you change it. Pick what each person works on in the Team tab." },
  'c2-2': { id: 'c2-2', title: 'That’s leverage', body: 'Work just got done without you. Keep growing to $1,000 MRR.' },
  'c2-mistake': { id: 'c2-mistake', title: 'Interns make mistakes', body: 'Rushed work, typos, fumbled calls. They make fewer mistakes as their skills grow.' },
  'c2-done': { id: 'c2-done', title: 'Chapter 2 done', body: 'Your bedroom is getting crowded. Chapter 3: a bigger space.' },
}

export function currentChapter2Card(state: Pick<V2GameState, 'v2'>): CoachCard | null {
  const { chapter, chapter2 } = state.v2
  if (!chapter.complete) return null
  const unseen = (id: Chapter2CardId) => (chapter.seenCards.includes(id) ? null : CHAPTER2_CARDS[id])
  if (chapter2.complete) return unseen('c2-done')
  if (chapter2.firstMistake && !chapter.seenCards.includes('c2-mistake')) return CHAPTER2_CARDS['c2-mistake']
  return unseen(`c2-${chapter2.beat}` as Chapter2CardId)
}

export function onTeamProgress(state: V2GameState, r: { completedBy: string[]; mistakes: string[] }): V2GameState {
  const c2 = state.v2.chapter2
  const beat = c2.beat === 1 && r.completedBy.length > 0 ? 2 : c2.beat
  const firstMistake = c2.firstMistake || r.mistakes.length > 0
  if (beat === c2.beat && firstMistake === c2.firstMistake) return state
  return { ...state, v2: { ...state.v2, chapter2: { ...c2, beat, firstMistake } } }
}

export function checkChapter2Complete(state: V2GameState): V2GameState {
  const { chapter, chapter2 } = state.v2
  if (!chapter.complete || chapter2.complete || state.mrr < CHAPTER2_GOAL_MRR) return state
  const next: V2GameState = { ...state, v2: { ...state.v2, chapter2: { ...chapter2, complete: true } } }
  return addStory(next, [`$${CHAPTER2_GOAL_MRR.toLocaleString()} MRR. ${state.startupName} has outgrown the bedroom.`])
}

// ── Chapter 3: a bigger space ───────────────────────────────────────────────

export function isMapUnlocked(state: Pick<V2GameState, 'v2'>): boolean {
  return state.v2.chapter2.complete
}

export const CHAPTER3_GOAL_MRR = 5000

type Chapter3CardId = 'c3-0' | 'c3-1' | 'c3-done'

export const CHAPTER3_CARDS: Record<Chapter3CardId, CoachCard> = {
  'c3-0': { id: 'c3-0', title: 'Time to move', body: 'Your bedroom is full. Open the Map and move somewhere bigger.' },
  'c3-1': { id: 'c3-1', title: 'More room, more people', body: 'At the Villa you can hire full-time staff and promote your best interns.' },
  'c3-done': { id: 'c3-done', title: 'Chapter 3 done', body: "You're a real company now, and the ladder goes all the way to your own building." },
}

function chapter3Id(state: Pick<V2GameState, 'v2'>): Chapter3CardId {
  const c3 = state.v2.chapter3
  if (c3.complete) return 'c3-done'
  return c3.beat === 1 ? 'c3-1' : 'c3-0'
}

/** Shown once Chapter 2's closing card is dismissed. Earlier unseen cards come first. */
export function currentChapter3Card(state: Pick<V2GameState, 'v2'>): CoachCard | null {
  const { chapter, chapter2, chapter3 } = state.v2
  if (!chapter2.complete || !chapter.seenCards.includes('c2-done')) return null
  const unseen = (id: Chapter3CardId) => (chapter.seenCards.includes(id) ? null : CHAPTER3_CARDS[id])
  if (chapter3.complete) return unseen('c3-0') ?? unseen('c3-done')
  return unseen('c3-0') ?? (chapter3.beat === 1 ? unseen('c3-1') : null)
}

export function onMoved(state: V2GameState): V2GameState {
  const c3 = state.v2.chapter3
  if (c3.beat !== 0) return state
  return { ...state, v2: { ...state.v2, chapter3: { ...c3, beat: 1 } } }
}

export function checkChapter3Complete(state: V2GameState): V2GameState {
  const { chapter2, chapter3 } = state.v2
  if (!chapter2.complete || chapter3.complete || state.mrr < CHAPTER3_GOAL_MRR) return state
  const next: V2GameState = { ...state, v2: { ...state.v2, chapter3: { ...chapter3, complete: true } } }
  return addStory(next, [`$${CHAPTER3_GOAL_MRR.toLocaleString()} MRR. ${state.startupName} is a real company now.`])
}
