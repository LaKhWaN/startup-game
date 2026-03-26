import { useGameStore } from '../store/gameStore'
import './StoryLog.css'

export function StoryLog() {
  const storyLog = useGameStore(s => s.storyLog)
  if (storyLog.length === 0) return null

  return (
    <div className="story-log">
      <div className="story-log-header">Log</div>
      <div className="story-entries">
        {storyLog.slice(0, 6).map((entry, i) => (
          <div key={`${entry.day}-${i}`} className={`story-entry ${i === 0 ? 'story-entry--current' : ''}`}>
            <span className="story-day">D{entry.day}</span>
            <div className="story-lines">
              {entry.lines.map((line, j) => (
                <p key={j} className={`story-line${entry.tags?.[j] ? ` story-line--${entry.tags[j]}` : ''}`}>{line}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
