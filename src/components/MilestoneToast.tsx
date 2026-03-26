import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { MilestoneToastEntry } from '../types'
import './MilestoneToast.css'

interface MilestoneToastProps {
  toast: MilestoneToastEntry
  onDismiss: (triggeredAt: number) => void
  index: number
}

function MilestoneToast({ toast, onDismiss, index }: MilestoneToastProps) {
  const [exiting, setExiting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true)
      setTimeout(() => onDismiss(toast.triggeredAt), 220)
    }, 3500)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [toast.triggeredAt, onDismiss])

  return (
    <div
      className={`mt-toast${exiting ? ' mt-toast--exit' : ''}`}
      style={{ '--index': index } as React.CSSProperties}
      onClick={() => {
        setExiting(true)
        setTimeout(() => onDismiss(toast.triggeredAt), 220)
      }}
    >
      <span className="mt-icon">{toast.icon}</span>
      <div className="mt-body">
        <div className="mt-label">Goal Reached</div>
        <div className="mt-title">{toast.title}</div>
        <div className="mt-desc">{toast.description}</div>
      </div>
    </div>
  )
}

interface MilestoneToastQueueProps {
  toasts: MilestoneToastEntry[]
  onDismiss: (triggeredAt: number) => void
}

export function MilestoneToastQueue({ toasts, onDismiss }: MilestoneToastQueueProps) {
  const visible = toasts.slice(0, 3)
  if (visible.length === 0) return null

  return createPortal(
    <div className="mt-container">
      {visible.map((t, i) => (
        <MilestoneToast key={t.triggeredAt} toast={t} onDismiss={onDismiss} index={i} />
      ))}
    </div>,
    document.body
  )
}
