import { useState } from 'react'

export default function PrototypeOS({ onBack }: { onBack: () => void }) {
  const [pos, setPos] = useState({ x: 100, y: 100 })
  const [dragging, setDragging] = useState(false)

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragging) {
      setPos(p => ({ x: p.x + e.movementX, y: p.y + e.movementY }))
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    setDragging(false)
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'url(https://images.unsplash.com/photo-1544866601-5e7090b8f36c?auto=format&fit=crop&q=80) center/cover', position: 'relative', overflow: 'hidden' }}>
      
      {/* Desktop Background Area */}
      <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(10px) brightness(0.5)' }} />

      <button className="back-button" onClick={onBack}>&larr; Back to Hub</button>

      {/* Fake Window Component */}
      <div 
        style={{
          position: 'absolute',
          left: pos.x,
          top: pos.y,
          width: 600,
          height: 400,
          background: '#1e293b',
          borderRadius: 8,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #334155',
          overflow: 'hidden'
        }}
      >
        {/* Title Bar (Draggable Area) */}
        <div 
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            height: 32,
            background: '#0f172a',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            padding: '0 1rem',
            cursor: dragging ? 'grabbing' : 'grab',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
          </div>
          <div style={{ marginLeft: 16, color: '#94a3b8', fontSize: 12, fontFamily: 'sans-serif' }}>Slack Clone</div>
        </div>

        {/* Window Body */}
        <div style={{ flex: 1, padding: '1rem', color: '#f8fafc', fontFamily: 'sans-serif', display: 'flex' }}>
          {/* Fake Sidebar */}
          <div style={{ width: 150, borderRight: '1px solid #334155', paddingRight: '1rem' }}>
            <div style={{ fontWeight: 'bold', marginBottom: 12 }}>Channels</div>
            <div style={{ color: '#94a3b8', marginBottom: 8 }}># general</div>
            <div style={{ color: '#fff', marginBottom: 8, fontWeight: 'bold' }}># engineering</div>
            <div style={{ color: '#94a3b8', marginBottom: 8 }}># marketing</div>
          </div>
          {/* Fake Chat */}
          <div style={{ flex: 1, paddingLeft: '1rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 16 }}>
                <strong>Dev 1</strong> <span style={{ color: '#94a3b8', fontSize: 12 }}>10:41 AM</span>
                <div>Pushed the new payment gateway. It's live!</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <strong>Product Manager</strong> <span style={{ color: '#94a3b8', fontSize: 12 }}>10:45 AM</span>
                <div>Awesome. Did you run the tests?</div>
              </div>
            </div>
            <div style={{ height: 40, border: '1px solid #334155', borderRadius: 4, padding: '8px', color: '#94a3b8', background: '#0f172a' }}>Message #engineering...</div>
          </div>
        </div>
      </div>

      {/* Taskbar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 48, background: 'rgba(15, 23, 42, 0.8)', borderTop: '1px solid #334155', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
         <div style={{ width: 32, height: 32, background: '#38bdf8', borderRadius: 8 }} />
         <div style={{ width: 32, height: 32, background: '#818cf8', borderRadius: 8, border: '2px solid white' }} />
         <div style={{ width: 32, height: 32, background: '#10b981', borderRadius: 8 }} />
      </div>
    </div>
  )
}
