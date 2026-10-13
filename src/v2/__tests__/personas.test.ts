import { describe, it, vi } from 'vitest'
import { totalDays } from '../engine/clock'
import { valuation } from '../engine/money'
import { createV2State } from '../state'
import { stepV2 } from '../v2Tick'
import { makeConfig } from './fixtures'
import { act, resetPersonaMemory, type Persona, type RunLog } from './simPersonas'
import { seeded } from './simPlayer'
import { scoreToDifficulty } from '../../ai/gemini'

const DAYS = 730
const SEEDS = [1, 2, 3]
const SHORT: Record<string, string> = { home: 'Home', biggerHome: 'BigHome', villa: 'Villa', coworking: 'Cowork', smallOffice: 'SmOffice', bigOffice: 'BigOffice', building: 'Building' }

function run(persona: Persona, score: number, seed: number) {
  const rng = seeded(seed * 97 + score)
  vi.spyOn(Math, 'random').mockImplementation(rng)
  resetPersonaMemory()
  let s = createV2State(makeConfig({ ideaScore: score, difficulty: scoreToDifficulty(score) }))
  const log: RunLog = { quits: 0, fired: 0, maxTeam: 0, peakMrr: 0 }
  const reached: Record<string, number> = {}
  const mrrAt: Record<number, number> = {}
  for (let h = 0; h < DAYS * 24 && s.phase === 'playing'; h++) {
    if (h % 6 === 0) {
      const before = Object.keys(s.v2.team).length
      s = act(s, persona, rng, log)
      void before
    }
    const ids = Object.keys(s.v2.team)
    s = stepV2(s, rng)
    log.quits += ids.filter(id => !s.v2.team[id]).length
    log.maxTeam = Math.max(log.maxTeam, Object.keys(s.v2.team).length)
    log.peakMrr = Math.max(log.peakMrr, s.mrr)
    if (!(s.v2.location in reached)) reached[s.v2.location] = totalDays(s.gameTime)
    const d = totalDays(s.gameTime)
    if (d % 180 === 0 && !(d in mrrAt)) mrrAt[d] = s.mrr
  }
  vi.restoreAllMocks()
  const day = totalDays(s.gameTime)
  return {
    persona, score, seed, tier: s.difficultyModifier?.tier, alive: s.phase === 'playing', sold: s.phase === 'sold', day,
    stress: avgMood(s, 'stress'), morale: avgMood(s, 'morale'), avgSalary: Math.round(Object.values(s.v2.team).reduce((a, m) => a + m.salary, 0) / Math.max(1, Object.keys(s.v2.team).length)),
    loc: s.v2.location, reached, mrr: s.mrr, peak: log.peakMrr, cust: s.customers, cash: Math.round(s.cash),
    val: valuation(s), team: Object.keys(s.v2.team).length, maxTeam: log.maxTeam, quits: log.quits, fired: log.fired,
    epics: s.features.filter(f => f.epic && f.status === 'completed').length, churn: s.churnRate, arpu: s.arpu,
    mrrAt,
  }
}

const avgMood = (s: ReturnType<typeof createV2State>, key: 'stress' | 'morale') => {
  const ms = Object.values(s.v2.team)
  return ms.length ? Math.round(ms.reduce((a, m) => a + (m[key] ?? 0), 0) / ms.length) : 0
}

const k = (n: number) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : Math.abs(n) >= 1e3 ? `${Math.round(n / 1e3)}k` : String(Math.round(n)))

describe.skipIf(!process.env.SIM_PERSONAS)('personas', () => {
  it('easy / medium / hard × idea 3 / 5 / 8', () => {
    const rows = []
    for (const score of [3, 5, 8]) for (const persona of ['easy', 'medium', 'hard'] as Persona[]) for (const seed of SEEDS) rows.push(run(persona, score, seed))
    console.log('\nidea tier        player seed | result        | MRR@180 MRR@360 MRR@540 final  peak  | cust  arpu churn | cash   val    | team max quits fired epics str mor  sal | Cowork SmOffice BigOffice Building')
    for (const r of rows) {
      const res = r.alive ? `alive ${SHORT[r.loc]}` : r.sold ? `SOLD d${r.day}` : `BROKE d${r.day}`
      console.log(`${r.score}/10 ${String(r.tier).padEnd(11)} ${r.persona.padEnd(6)} ${r.seed}    | ${res.padEnd(13)} | ${k(r.mrrAt[180] ?? 0).padStart(6)} ${k(r.mrrAt[360] ?? 0).padStart(7)} ${k(r.mrrAt[540] ?? 0).padStart(7)} ${k(r.mrr).padStart(6)} ${k(r.peak).padStart(5)} | ${String(r.cust).padStart(5)} ${String(r.arpu).padStart(4)} ${r.churn.toFixed(0).padStart(4)}% | ${k(r.cash).padStart(6)} ${k(r.val).padStart(6)} | ${String(r.team).padStart(4)} ${String(r.maxTeam).padStart(3)} ${String(r.quits).padStart(5)} ${String(r.fired).padStart(5)} ${String(r.epics).padStart(5)} ${String(r.stress).padStart(3)} ${String(r.morale).padStart(3)} ${k(r.avgSalary).padStart(4)} | ${['coworking', 'smallOffice', 'bigOffice', 'building'].map(l => String(r.reached[l] ?? '-').padStart(6)).join(' ')}`)
    }
    // Averages per persona × idea.
    console.log('\nAVERAGES (3 seeds)')
    for (const score of [3, 5, 8]) for (const persona of ['easy', 'medium', 'hard']) {
      const g = rows.filter(r => r.score === score && r.persona === persona)
      const avg = (f: (r: typeof g[number]) => number) => g.reduce((a, r) => a + f(r), 0) / g.length
      console.log(`${score}/10 ${persona.padEnd(6)} survived ${g.filter(r => r.alive).length}/3 · final MRR ${k(avg(r => r.mrr))} · peak ${k(avg(r => r.peak))} · val ${k(avg(r => r.val))} · cash ${k(avg(r => r.cash))} · quits ${avg(r => r.quits).toFixed(1)} · team ${avg(r => r.team).toFixed(0)}`)
    }
  }, 600_000)
})
