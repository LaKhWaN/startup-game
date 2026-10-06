import { useEffect, useRef, useState } from 'react'
import { useV2 } from './actions'
import type { V2GameState } from './state'
import './v2.css'

export const TOAST_MS = 5000
const MAX_TOASTS = 4

/** Story lines worth a toast: the ones that start with an emoji (people leaving, raises, unlocks, moves…). */
export function isNotable(line: string): boolean {
  return /^\p{Extended_Pictographic}/u.test(line)
}

/** Lines added since `prevHead` (the story log is newest-first). A log that no longer holds it (a loaded save) adds nothing. */
export function newLines(log: V2GameState['storyLog'], prevHead: V2GameState['storyLog'][number] | undefined): string[] {
  if (prevHead && !log.includes(prevHead)) return []
  const out: string[] = []
  for (const entry of log) {
    if (entry === prevHead) break
    out.push(...[...entry.lines].reverse())
  }
  return out.reverse()
}

interface Toast { id: number; text: string }

/** Short-lived notifications for notable story lines; each disappears after 5 seconds. */
export function NotificationToasts() {
  const log = useV2(s => s.storyLog)
  const head = useRef(log[0])
  const nextId = useRef(0)
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    if (log[0] === head.current) return
    const fresh = newLines(log, head.current).filter(isNotable)
    head.current = log[0]
    if (fresh.length === 0) return
    const added = fresh.map(text => ({ id: nextId.current++, text }))
    setToasts(t => [...t, ...added].slice(-MAX_TOASTS))
    for (const a of added) setTimeout(() => setToasts(t => t.filter(x => x.id !== a.id)), TOAST_MS)
  }, [log])

  if (toasts.length === 0) return null
  return (
    <div className="v2-toasts" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className="v2-toast" onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}>{t.text}</div>
      ))}
    </div>
  )
}
