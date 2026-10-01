import { skipNight, useV2 } from './actions'
import { clockLabel, isWeekend, isWorkHour } from './engine/clock'
import { useUi } from './ui'
import './v2.css'

/** "Office closed" strip with ⏭ Skip to morning, shown whenever hires are off. */
export function NightBanner() {
  const hours = useV2(s => s.gameTime.totalHours)
  const playing = useV2(s => s.phase === 'playing')
  const pending = useV2(s => s.pendingEvent !== null)
  const view = useUi(s => s.view)
  if (!playing || view !== 'office' || isWorkHour(hours)) return null
  return (
    <div className="v2-night">
      <span>{isWeekend(hours) ? '🛋️ Weekend' : '🌙 Office closed'} · {clockLabel(hours)}</span>
      <button className="v2-fb-btn" onClick={skipNight} disabled={pending} title="Fast-forward to 09:00 on the next work day">⏭ Skip to morning</button>
    </div>
  )
}
