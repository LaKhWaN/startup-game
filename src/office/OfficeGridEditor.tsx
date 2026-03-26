import { useMemo, useState } from 'react'

type CellType = 'empty' | 'walk' | 'seat' | 'planning' | 'gaming1' | 'gaming2' | 'pantry'

const COLS = 12
const ROWS = 7

const cellTypes: { id: CellType; label: string; color: string }[] = [
  { id: 'walk', label: 'Walkable', color: 'rgba(96,108,56,0.4)' },
  { id: 'seat', label: 'Seat', color: 'rgba(212,163,115,0.6)' },
  { id: 'planning', label: 'Planning', color: 'rgba(109,89,122,0.6)' },
  { id: 'gaming1', label: 'Gaming 1', color: 'rgba(69,123,157,0.6)' },
  { id: 'gaming2', label: 'Gaming 2', color: 'rgba(188,108,37,0.6)' },
  { id: 'pantry', label: 'Pantry', color: 'rgba(181,101,118,0.6)' },
  { id: 'empty', label: 'Eraser', color: 'transparent' },
]

function cellId(col: number, row: number) {
  const colLetter = String.fromCharCode('A'.charCodeAt(0) + col)
  return `${colLetter}${row + 1}`
}

export function OfficeGridEditor() {
  const [brush, setBrush] = useState<CellType>('walk')
  const [cells, setCells] = useState<Record<string, CellType>>({})
  const [exportJson, setExportJson] = useState('')

  const handleCellClick = (c: number, r: number) => {
    const id = cellId(c, r)
    setCells(prev => {
      const next = { ...prev }
      if (brush === 'empty') {
        delete next[id]
      } else {
        next[id] = brush
      }
      return next
    })
  }

  const grid = useMemo(
    () =>
      Array.from({ length: ROWS }, (_, r) =>
        Array.from({ length: COLS }, (_, c) => {
          const id = cellId(c, r)
          const type = cells[id] ?? 'empty'
          return { id, type }
        }),
      ),
    [cells],
  )

  const handleSave = () => {
    const data = {
      cols: COLS,
      rows: ROWS,
      cells,
    }
    const json = JSON.stringify(data, null, 2)
    console.log('OFFICE_GRID_JSON', json)
    setExportJson(json)
    alert('Grid JSON printed to console (OFFICE_GRID_JSON) and shown below. Copy and send it back to me.')
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          padding: '0.5rem 1rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <strong>Office Grid Editor</strong>
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          Click cells to paint. Use "Save" and paste the JSON here in chat.
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          {cellTypes.map(t => (
            <button
              key={t.id}
              onClick={() => setBrush(t.id)}
              style={{
                padding: '0.2rem 0.6rem',
                fontSize: 12,
                borderRadius: 4,
                border: brush === t.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: brush === t.id ? t.color : 'var(--surface)',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={handleSave}
            style={{
              padding: '0.25rem 0.9rem',
              fontSize: 12,
              borderRadius: 4,
              border: '1px solid var(--accent)',
              background: 'var(--accent)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Save JSON
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          padding: '1rem',
          gap: '1rem',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'relative',
            flex: '0 0 auto',
            width: 960,
            height: 540,
            backgroundImage: "url('/assets/office/office_bg_level1.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
              gridTemplateRows: `repeat(${ROWS}, 1fr)`,
            }}
          >
            {grid.flat().map(cell => {
              const typeMeta = cellTypes.find(t => t.id === cell.type)
              const bg = typeMeta?.color ?? 'transparent'
              return (
                <div
                  key={cell.id}
                  onClick={() => {
                    const index = grid.flat().findIndex(c => c.id === cell.id)
                    const r = Math.floor(index / COLS)
                    const c = index % COLS
                    handleCellClick(c, r)
                  }}
                  style={{
                    border: '1px solid rgba(0,0,0,0.15)',
                    boxSizing: 'border-box',
                    background: bg,
                    cursor: 'pointer',
                  }}
                  title={cell.id}
                />
              )
            })}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ fontSize: 12, marginBottom: 4 }}>Exported JSON</div>
          <textarea
            readOnly
            value={exportJson}
            style={{
              flex: 1,
              width: '100%',
              resize: 'none',
              fontFamily: 'monospace',
              fontSize: 11,
              padding: '0.5rem',
              borderRadius: 4,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
            }}
            placeholder="Click Save JSON to see the grid configuration here."
          />
        </div>
      </div>
    </div>
  )
}

