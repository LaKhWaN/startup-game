import { setSpeed as setGameSpeed, useV2 } from './actions'
import type { GameSpeed } from './store'
import { useRef, useState, useEffect } from 'react'
import { useAudioStore } from '../audio/audioStore'
import { playSfx } from '../audio/sfx'
import { tierLabel, tierColor } from '../ai/gemini'
import { clockLabel, totalDays as daysOf } from './engine/clock'
import { monthlyBurn, valuation } from './engine/money'
import { saveGameV2, listSavesV2, type SlotId, type SaveMetaV2 } from './saveV2'
import type { V2GameState } from './state'
import { formatProfit, profitMonthly } from './finance'
import { Avatar } from './ui/Avatar'
import { SellCompanyModal } from './ui/SellCompanyModal'
import './ui/TopBar.css'

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}m`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`
  return `$${Math.floor(n)}`
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return `${Math.floor(n)}`
}

function fmtDelta(n: number): string {
  const abs = Math.abs(n)
  const str = abs >= 1_000_000 ? `$${(abs / 1_000_000).toFixed(1)}m`
            : abs >= 1_000     ? `$${(abs / 1_000).toFixed(1)}k`
            : abs < 1          ? `${abs.toFixed(1)}`
            : `${Math.round(abs)}`
  return (n > 0 ? '+' : '−') + str
}

function getStage(customers: number, mrr: number): string {
  if (mrr >= 100_000) return 'Series A'
  if (mrr >= 25_000)  return 'Seed Stage'
  if (mrr >= 5_000)   return 'Early Growth'
  if (customers >= 5) return 'Early Traction'
  return 'Pre-revenue'
}

const METRIC_INFO: Record<string, { title: string; desc: string; tip: string }> = {
  MRR: {
    title: 'Monthly Recurring Revenue',
    desc:  'Revenue your customers pay every month. The core health signal of a SaaS.',
    tip:   'Profitability = MRR > Burn. Grow this consistently.',
  },
  Users: {
    title: 'Active Customers',
    desc:  'Total paying customers on your platform right now.',
    tip:   'More users = stronger product-market fit and more stable MRR.',
  },
  Cash: {
    title: 'Cash in Bank',
    desc:  'Total money available. When this hits $0, it\'s game over.',
    tip:   'Always keep at least 3–6 months of runway in reserve.',
  },
  Burn: {
    title: 'Monthly Burn Rate',
    desc:  'How much cash you spend each month beyond your revenue.',
    tip:   'Lower burn = longer runway. Hire carefully.',
  },
  Profit: {
    title: 'Monthly Profit',
    desc:  'MRR minus burn (rent + salaries). Positive means you make money every month.',
    tip:   'Get this above $0 and your runway stops shrinking.',
  },
  Runway: {
    title: 'Runway',
    desc:  'Months before you run out of cash at the current burn rate.',
    tip:   'Aim for 12+ months. Under 3 is a code-red emergency.',
  },
}

interface PillItemProps {
  icon:            string
  value:           string
  label:           string
  rawValue?:       number
  higherIsBetter?: boolean
  warn?:           boolean
  danger?:         boolean
  good?:           boolean
}

function PillItem({ icon, value, label, rawValue, higherIsBetter = true, warn, danger, good }: PillItemProps) {
  const prevRaw  = useRef<number | undefined>(undefined)
  const [flash,  setFlash]  = useState<'up' | 'down' | null>(null)
  const [delta,  setDelta]  = useState<{ text: string; dir: 'up' | 'down' } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (rawValue === undefined) return
    if (prevRaw.current === undefined) { prevRaw.current = rawValue; return }
    if (rawValue === prevRaw.current)  return

    const diff = rawValue - prevRaw.current
    const dir: 'up' | 'down' = diff > 0 ? 'up' : 'down'
    const good = higherIsBetter ? dir === 'up' : dir === 'down'

    setFlash(good ? 'up' : 'down')
    setDelta({ text: fmtDelta(diff), dir })
    prevRaw.current = rawValue

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { setFlash(null); setDelta(null) }, 1000)
  }, [rawValue, higherIsBetter])

  const info = METRIC_INFO[label]
  const valueClass = [
    'tb-pill-value',
    flash  ? `tb-flash-${flash}` : '',
    danger ? 'tb-pill-value--danger' : warn ? 'tb-pill-value--warn' : good ? 'tb-pill-value--good' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className="tb-pill-item">
      <span className="tb-pill-icon">{icon}</span>
      <span className={valueClass}>{value}</span>
      <span className="tb-pill-mini-label">{label}</span>
      {delta && <span className={`tb-delta tb-delta-${delta.dir}`}>{delta.text}</span>}
      {info && (
        <div className="tb-pill-tooltip">
          <div className="tb-tooltip-title">{info.title}</div>
          <div className="tb-tooltip-desc">{info.desc}</div>
          <div className="tb-tooltip-tip">{info.tip}</div>
        </div>
      )}
    </div>
  )
}

// 10× is a local-dev convenience for playtesting; production builds keep the legacy set.
const SPEEDS: GameSpeed[] = import.meta.env.DEV ? [1, 2, 3, 5, 10] : [1, 2, 3, 5]

function SpeedControl() {
  const gameSpeed    = useV2(s => s.gameSpeed)
  const setSpeed     = (() => setGameSpeed)()
  const pendingEvent = useV2(s => s.pendingEvent)

  const isPaused = gameSpeed === 0 || !!pendingEvent

  function togglePause() {
    if (pendingEvent) return
    setSpeed(gameSpeed === 0 ? 1 : 0)
  }

  return (
    <div className="tb-speed">
      <button
        className={`tb-speed-pause ${isPaused ? 'tb-speed-pause--on' : ''}`}
        onClick={togglePause}
        title={gameSpeed === 0 ? 'Resume' : 'Pause'}
        disabled={!!pendingEvent}
      >
        {isPaused ? '▶' : '⏸'}
      </button>

      <div className="tb-speed-divider" />

      {SPEEDS.map(s => (
        <button
          key={s}
          className={`tb-speed-btn ${gameSpeed === s && !isPaused ? 'tb-speed-btn--active' : ''}`}
          onClick={() => setSpeed(s)}
          disabled={!!pendingEvent}
        >
          {s}×
        </button>
      ))}
    </div>
  )
}

interface TopBarProps {
  onShowTutorial?: () => void
}

export function TopBarV2({ onShowTutorial }: TopBarProps) {
  const startupName      = useV2(s => s.startupName)
  const gameTime         = useV2(s => s.gameTime)
  const mrr              = useV2(s => s.mrr)
  const customers        = useV2(s => s.customers)
  const churnRate        = useV2(s => s.churnRate)
  const cash             = useV2(s => s.cash)
  const pendingEvent     = useV2(s => s.pendingEvent)
  const difficultyMod    = useV2(s => s.difficultyModifier)
  const ideaScore        = useV2(s => s.ideaScore)
  const state            = useV2(s => s)
  const musicVolume    = useAudioStore(s => s.musicVolume)
  const sfxVolume      = useAudioStore(s => s.sfxVolume)
  const setMusicVolume = useAudioStore(s => s.setMusicVolume)
  const setSfxVolume   = useAudioStore(s => s.setSfxVolume)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [savedMsg, setSavedMsg]         = useState<string | null>(null)
  const [showSellModal, setShowSellModal] = useState(false)

  function handleQuickSave(slot: SlotId) {
    saveGameV2(slot, state as unknown as V2GameState)
    playSfx('click', 0.5)
    setSavedMsg(`Saved to Slot ${slot}!`)
    setTimeout(() => setSavedMsg(null), 2000)
  }

  const burn = monthlyBurn(state)
  const profit = profitMonthly(state)

  const totalDays = daysOf(gameTime) + 1
  const clock = clockLabel(gameTime.totalHours)

  const runwayMonths = burn > 0 ? cash / burn : Infinity
  const cashWarn   = runwayMonths < 6
  const cashDanger = runwayMonths < 3
  const churnWarn   = churnRate > 12
  const churnDanger = churnRate > 25

  const stage = getStage(customers, mrr)

  // Play a sound when a new random event arrives (once per event).
  const hadEventRef = useRef<boolean>(false)
  useEffect(() => {
    const hasEvent = !!pendingEvent
    if (hasEvent && !hadEventRef.current) {
      playSfx('notification', 0.85)
    }
    hadEventRef.current = hasEvent
  }, [pendingEvent])

  // Play a cash up/down sound once per in-game day (avoids spamming on fast speeds).
  const prevDayRef = useRef<number | null>(null)
  const prevCashRef = useRef<number | null>(null)
  useEffect(() => {
    if (prevDayRef.current === null || prevCashRef.current === null) {
      prevDayRef.current = totalDays
      prevCashRef.current = cash
      return
    }

    if (prevDayRef.current !== totalDays) {
      const diff = cash - prevCashRef.current
      if (diff < -0.5) playSfx('cashDebit', 0.8)
      else if (diff > 0.5) playSfx('cashCredit', 0.7)

      prevDayRef.current = totalDays
      prevCashRef.current = cash
    }
  }, [totalDays, cash])

  return (
    <header className="top-bar">

      {/* ── Left: Brand ─────────────────────────────────── */}
      <div className="tb-brand">
        <div className="tb-logo">🚀</div>
        <div className="tb-brand-info">
          <span className="tb-name">{startupName}</span>
          <span className="tb-sub">
            Day {totalDays} · {clock}
            <span className="tb-sub-dot">·</span>
            {stage}
            {difficultyMod && (
              <span
                className="tb-difficulty-badge"
                style={{ background: tierColor(difficultyMod.tier) }}
                title={`Idea score: ${ideaScore ?? '?'}/10`}
              >
                {tierLabel(difficultyMod.tier)}
              </span>
            )}
            {pendingEvent && <span className="tb-event-badge">⏸ EVENT</span>}
          </span>
        </div>
      </div>

      {/* ── Center: Dark pill ────────────────────────────── */}
      <div className="tb-pill-wrap">
        <div className="tb-pill">
          <PillItem icon="💹" value={fmt(mrr)}                        label="MRR"    rawValue={mrr}       />
          <div className="tb-pill-sep" />
          <PillItem icon="👥" value={`${fmtNum(customers)} Users`}    label="Users"  rawValue={customers} />
          <div className="tb-pill-sep" />
          <PillItem icon="🏦" value={fmt(cash)}                       label="Cash"   rawValue={cash}      warn={cashWarn}   danger={cashDanger}   />
          <div className="tb-pill-sep" />
          <PillItem icon="🔥" value={`${fmt(burn)}/mo`}               label="Burn"   rawValue={burn}      higherIsBetter={false} />
          <div className="tb-pill-sep" />
          <PillItem icon="💰" value={formatProfit(profit)} label="Profit" rawValue={profit} danger={profit < 0} good={profit > 0} />
          <div className="tb-pill-sep" />
          <PillItem icon="📉" value={`${churnRate.toFixed(1)}% churn`} label="Churn" rawValue={churnRate}  higherIsBetter={false} warn={churnWarn} danger={churnDanger} />
        </div>
      </div>

      {/* ── Right: Speed + Settings + avatar ─────────────── */}
      <div className="tb-right">
        <button
          className="tb-sell-btn"
          onClick={() => setShowSellModal(true)}
          title={`Sell company — est. $${valuation(state).toLocaleString()}`}
        >
          💰 Sell
        </button>

        <button
          className="tb-settings-btn"
          onClick={() => window.dispatchEvent(new Event('investor-checkin-open'))}
          title="Test feedback form"
        >
          💬
        </button>

        <div className="tb-settings">
          <button
            className={`tb-settings-btn ${settingsOpen ? 'tb-settings-btn--on' : ''}`}
            onClick={() => { playSfx('click', 0.6); setSettingsOpen(v => !v) }}
            title="Settings"
          >
            ⚙️
          </button>

          {settingsOpen && (
            <div className="tb-settings-pop">
              {/* Audio */}
              <div className="tb-settings-section-label">Audio</div>
              <div className="tb-audio-row">
                <span className="tb-audio-label">Music</span>
                <input
                  className="tb-audio-slider"
                  type="range" min={0} max={100}
                  value={Math.round(musicVolume * 100)}
                  onChange={e => setMusicVolume(Number(e.target.value) / 100)}
                />
                <span className="tb-audio-val">{Math.round(musicVolume * 100)}%</span>
              </div>
              <div className="tb-audio-row">
                <span className="tb-audio-label">SFX</span>
                <input
                  className="tb-audio-slider"
                  type="range" min={0} max={100}
                  value={Math.round(sfxVolume * 100)}
                  onChange={e => { setSfxVolume(Number(e.target.value) / 100); playSfx('click', 0.6) }}
                />
                <span className="tb-audio-val">{Math.round(sfxVolume * 100)}%</span>
              </div>

              <div className="tb-settings-divider" />

              {/* Save */}
              <div className="tb-settings-section-label">Save Game</div>
              {savedMsg && <div className="tb-save-toast-inline">{savedMsg}</div>}
              <div className="tb-settings-save-row">
                {([2, 3] as SlotId[]).map(slot => {
                  const meta: SaveMetaV2 | null = listSavesV2()[slot - 1]
                  return (
                    <button key={slot} className="tb-save-slot-btn" onClick={() => handleQuickSave(slot)}>
                      <span className="tb-save-slot-name">Slot {slot}</span>
                      <span className="tb-save-slot-info">
                        {meta ? `Day ${meta.day} · $${meta.mrr.toLocaleString()}` : 'Empty'}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="tb-settings-divider" />

              {/* Tutorial */}
              <button
                className="tb-tutorial-btn"
                onClick={() => { setSettingsOpen(false); onShowTutorial?.() }}
              >
                📖 Show Tip Again
              </button>
            </div>
          )}
        </div>

        <SpeedControl />
        <div className="tb-avatar-wrap">
          <Avatar name={startupName} size={34} />
        </div>
      </div>

      {showSellModal && <SellCompanyModal onClose={() => setShowSellModal(false)} />}
    </header>
  )
}
