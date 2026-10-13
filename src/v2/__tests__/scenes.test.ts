import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, vi } from 'vitest'
import { scoreToDifficulty } from '../../ai/gemini'
import { SCENE_ID_PREFIX } from '../analytics'
import { CHAPTER2_CARDS, CHAPTER3_CARDS, COACH_CARDS } from '../chapter'
import { totalDays } from '../engine/clock'
import { serializeGame } from '../saveV2'
import { createV2State, type V2GameState } from '../state'
import { TIPS } from '../tips'
import { stepV2 } from '../v2Tick'
import { makeConfig } from './fixtures'
import { act, resetPersonaMemory, type RunLog } from './simPersonas'
import { seeded } from './simPlayer'

const OUT = join(process.cwd(), 'public', 'dev-scenes')
const ALL_CARDS = [...Object.keys(COACH_CARDS), ...Object.keys(CHAPTER2_CARDS), ...Object.keys(CHAPTER3_CARDS), ...TIPS.map(t => t.id)]

/** A clean frame: no tutorial cards, no queued alerts, a stable id that analytics ignores. */
function frame(s: V2GameState, name: string): V2GameState {
  return { ...s, gameId: `${SCENE_ID_PREFIX}${name}`, pendingEvent: null, v2: { ...s.v2, alerts: [], chapter: { ...s.v2.chapter, seenCards: ALL_CARDS } } }
}

function write(name: string, s: V2GameState, extra: Record<string, unknown> = {}): void {
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify({ ...serializeGame(s), ...extra }))
  console.log(`scene ${name.padEnd(13)} day ${String(totalDays(s.gameTime)).padStart(3)} · ${s.v2.location} · team ${Object.keys(s.v2.team).length} · ${s.customers} customers · $${s.mrr.toLocaleString()} MRR`)
}

type Want = { name: string; when: (s: V2GameState) => boolean }
const WANTS: Want[] = [
  { name: 'bedroom', when: s => totalDays(s.gameTime) >= 12 && !!s.v2.founder.task },
  { name: 'first-hires', when: s => s.v2.location === 'biggerHome' && Object.keys(s.v2.team).length >= 3 },
  { name: 'villa', when: s => s.v2.location === 'villa' && Object.keys(s.v2.team).length >= 5 },
  { name: 'coworking', when: s => s.v2.location === 'coworking' && Object.keys(s.v2.team).length >= 8 },
  { name: 'small-office', when: s => s.v2.location === 'smallOffice' && Object.keys(s.v2.team).length >= 14 },
  { name: 'building', when: s => s.v2.location === 'building' && Object.keys(s.v2.team).length >= 40 && s.features.some(f => f.epic && f.status === 'in_development') },
]

describe.skipIf(!process.env.SIM_SCENES)('screenshot scenes', () => {
  it('plays a strong game and saves the moments worth a screenshot', () => {
    mkdirSync(OUT, { recursive: true })
    const rng = seeded(42)
    vi.spyOn(Math, 'random').mockImplementation(rng)
    resetPersonaMemory()
    let s = createV2State(makeConfig({
      idea: 'AI scribe for primary-care doctors that writes the clinical note and billing codes straight into the health record',
      startupName: 'Notewell', ideaScore: 8, difficulty: scoreToDifficulty(8),
    }))
    const log: RunLog = { quits: 0, fired: 0, maxTeam: 0, peakMrr: 0 }
    const done = new Set<string>()
    const settle = new Map<string, number>() // wait a few days after a move so everyone is seated and busy
    for (let h = 0; h < 730 * 24 && s.phase === 'playing' && done.size < WANTS.length; h++) {
      if (h % 6 === 0) s = act(s, 'hard', rng, log)
      s = stepV2(s, rng)
      if (s.gameTime.totalHours % 24 !== 11) continue
      const day = totalDays(s.gameTime)
      for (const w of WANTS) {
        if (done.has(w.name) || !w.when(s)) continue
        if (!settle.has(w.name)) settle.set(w.name, day + 3)
        if (day < settle.get(w.name)!) continue
        write(w.name, frame(s, w.name))
        done.add(w.name)
        if (w.name === 'small-office') {
          // A good-news event, waiting for a decision.
          write('event', frame(s, 'event'), { _pendingEventId: 'product-hunt-launch' })
        }
        if (w.name === 'building') {
          // Someone close to quitting: the people pop-up.
          const m = Object.values(s.v2.team).find(x => x.role === 'developer') ?? Object.values(s.v2.team)[0]
          const tense = frame(s, 'people-alert')
          write('people-alert', { ...tense, v2: { ...tense.v2, alerts: [{ kind: 'atRisk', memberId: m.id, reason: 'stress' }], team: { ...tense.v2.team, [m.id]: { ...m, stress: 84, morale: 41 } } } })
        }
      }
    }
    vi.restoreAllMocks()
  }, 300_000)
})
