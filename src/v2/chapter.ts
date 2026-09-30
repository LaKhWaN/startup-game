import { addStory, type Beat, type FamilyMoney, type FounderTaskType, type Rng, type V2GameState } from './state'

export const TASK_UNLOCK_BEAT: Record<FounderTaskType, Beat> = {
  research: 0,
  develop: 1,
  emails: 2,
  sales: 3,
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

export function reshowCurrentCard(state: V2GameState): V2GameState {
  const { chapter } = state.v2
  const id = cardIdFor(chapter.beat)
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
