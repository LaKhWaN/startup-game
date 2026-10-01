import { useEffect, type ReactNode } from 'react'
import './v2.css'

/** A sheet over the room. Esc or the backdrop closes it. Event cards stay above it. */
export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="v2-sheet-backdrop" onClick={onClose}>
      <div className={`v2-sheet${wide ? ' v2-sheet--wide' : ''}`} role="dialog" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className="v2-sheet-head">
          <span className="v2-sheet-title">{title}</span>
          <button className="v2-sheet-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="v2-sheet-body">{children}</div>
      </div>
    </div>
  )
}
