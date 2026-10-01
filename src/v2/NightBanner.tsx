import { skipNight, toggleAutoSkip, useV2 } from './actions'
import { officeOpen } from './engine/infra'
import { clockLabel, isWeekend } from './engine/clock'
import { useUi } from './ui'
import './v2.css'

/** "Office closed" strip with ⏭ Skip to morning, shown whenever hires are off. */
export function NightBanner() {
  const hours = useV2(s => s.gameTime.totalHours)
  const open = useV2(s => officeOpen(s, s.gameTime.totalHours))
  const auto = useV2(s => !!s.v2.autoSkipNights)
  const playing = useV2(s => s.phase === 'playing')
  const pending = useV2(s => s.pendingEvent !== null)
  const view = useUi(s => s.view)
  const held = useUi(s => s.pauseHolds.length > 0)
  if (!playing || view !== 'office' || open) return null
  return (
    <div className="v2-night">
      <span>{isWeekend(hours) ? '🛋️ Weekend' : '🌙 Office closed'} · {clockLabel(hours)}</span>
      <button className="v2-fb-btn" onClick={skipNight} disabled={pending || held} title="Fast-forward to 09:00 on the next work day">⏭ Skip to morning</button>
      <button className={`v2-chip${auto ? ' v2-chip--on' : ''}`} onClick={toggleAutoSkip} title="Skip closed hours automatically (not while you work late)">Auto</button>
    </div>
  )
}
