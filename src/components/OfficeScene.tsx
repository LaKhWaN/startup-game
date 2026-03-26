import { useMemo } from 'react'
import { useGameStore } from '../store/gameStore'
import './OfficeScene.css'

const TW = 96, TH = 48
const OX = 540, OY = 160

function iso(col: number, row: number) {
  return {
    x: OX + (col - row) * (TW / 2),
    y: OY + (col + row) * (TH / 2),
  }
}

function tilePoints(col: number, row: number): string {
  const { x, y } = iso(col, row)
  const hw = TW / 2, hh = TH / 2
  return `${x},${y} ${x + hw},${y + hh} ${x},${y + TH} ${x - hw},${y + hh}`
}

const COLS = 8, ROWS = 5, WH = 115

const ROLE_PALETTE: Record<string, [string, string, string]> = {
  developer:       ['#d8eafe', '#bcd4f8', '#9cbde8'],
  product_manager: ['#e8e0fa', '#d4caee', '#bfb0e0'],
  sales:           ['#fde8cc', '#f0d0a8', '#e0ba88'],
  marketing:       ['#cceedd', '#a8e0c4', '#84ccaa'],
}

// Role colors for the character sprite
const ROLE_CHAR: Record<string, { body: string; skin: string; accent: string }> = {
  developer:       { body: '#2563eb', skin: '#fcd9a8', accent: '#0ea5e9' },
  product_manager: { body: '#7c3aed', skin: '#fcd9a8', accent: '#8b5cf6' },
  sales:           { body: '#ea580c', skin: '#fcd9a8', accent: '#f97316' },
  marketing:       { body: '#059669', skin: '#fcd9a8', accent: '#10b981' },
}

const ROLE_STATUS: Record<string, { idle: string; busy: string }> = {
  developer:       { idle: 'idle...', busy: 'coding...' },
  product_manager: { idle: 'thinking...', busy: 'planning...' },
  sales:           { idle: 'idle...', busy: 'pitching...' },
  marketing:       { idle: 'idle...', busy: 'creating...' },
}

interface DeskCharacterProps {
  cx: number
  cy: number
  role: string
  busy: boolean
}

function DeskCharacter({ cx, cy, role, busy }: DeskCharacterProps) {
  const bh = 18
  // Character sits slightly behind and left of desk center (isometric "back")
  const charX = cx + 2
  const headY = cy - bh - 20

  const colors = ROLE_CHAR[role] ?? { body: '#555', skin: '#f0c8a0', accent: '#888' }
  const { body: bodyColor, skin: skinColor, accent } = colors

  const status = ROLE_STATUS[role] ?? { idle: 'idle...', busy: 'working...' }
  const bubbleText = busy ? status.busy : status.idle

  const headR = 7
  const bodyW = 9
  const bodyH = 12

  // Speech bubble sizing
  const charCount = bubbleText.length
  const bw = Math.max(charCount * 5.4 + 14, 52)
  const bubH = 17
  const bubX = charX - bw / 2
  const bubY = headY - headR - bubH - 6

  return (
    <g>
      {/* Bubble background */}
      <rect
        x={bubX} y={bubY}
        width={bw} height={bubH}
        rx={4}
        fill="rgba(255,255,255,0.96)"
        stroke={busy ? accent : '#d1d5db'}
        strokeWidth={0.9}
      />
      {/* Bubble tail */}
      <polygon
        points={`${charX - 3},${bubY + bubH} ${charX + 3},${bubY + bubH} ${charX},${headY - headR - 1}`}
        fill="rgba(255,255,255,0.96)"
      />
      <line
        x1={charX - 3} y1={bubY + bubH}
        x2={charX} y2={headY - headR - 1}
        stroke={busy ? accent : '#d1d5db'} strokeWidth={0.9}
      />
      <line
        x1={charX + 3} y1={bubY + bubH}
        x2={charX} y2={headY - headR - 1}
        stroke={busy ? accent : '#d1d5db'} strokeWidth={0.9}
      />
      {/* Bubble text */}
      <text
        x={charX} y={bubY + bubH / 2 + 3.5}
        textAnchor="middle"
        fill={busy ? accent : '#6b7280'}
        fontSize={8}
        fontFamily="'Roboto Mono', monospace"
        fontWeight={busy ? 700 : 400}
        style={busy ? { animation: 'bubble-pulse 1.4s ease-in-out infinite' } : undefined}
      >
        {bubbleText}
      </text>

      {/* Body */}
      <rect
        x={charX - bodyW / 2} y={headY + headR - 1}
        width={bodyW} height={bodyH}
        rx={2}
        fill={bodyColor}
        opacity={0.9}
      />
      {/* Head */}
      <circle cx={charX} cy={headY} r={headR} fill={skinColor} />
      {/* Eyes */}
      <circle cx={charX - 2.2} cy={headY - 1} r={1.3} fill={bodyColor} />
      <circle cx={charX + 2.2} cy={headY - 1} r={1.3} fill={bodyColor} />
      {/* Mouth: smile=idle, line=busy */}
      {busy ? (
        <line
          x1={charX - 2} y1={headY + 3}
          x2={charX + 2} y2={headY + 3}
          stroke={bodyColor} strokeWidth={1}
        />
      ) : (
        <path
          d={`M ${charX - 2} ${headY + 2} Q ${charX} ${headY + 5} ${charX + 2} ${headY + 2}`}
          stroke={bodyColor} strokeWidth={1} fill="none"
        />
      )}
    </g>
  )
}

const DESK_SLOTS = [
  { col: 1.4, row: 0.7 },
  { col: 3.5, row: 0.7 },
  { col: 5.6, row: 0.7 },
  { col: 1.4, row: 2.8 },
  { col: 3.5, row: 2.8 },
  { col: 5.6, row: 2.8 },
]

interface DeskProps {
  col: number
  row: number
  role?: string
  busy?: boolean
}

function Desk({ col, row, role, busy }: DeskProps) {
  const { x: cx, y: cy } = iso(col, row)
  const dw = 32, dh = 16, bh = 18

  const palette = role ? ROLE_PALETTE[role] : ['#ede4d0', '#e0d4bc', '#d0c4a8']
  const [top, left, right] = palette
  const accent = role ? ROLE_CHAR[role]?.accent ?? '#0ea5e9' : '#94a3b8'

  return (
    <g opacity={role ? 1 : 0.4}>
      {/* right face */}
      <polygon
        points={`${cx + dw},${cy + dh - bh} ${cx + dw},${cy + dh} ${cx},${cy + dh * 2} ${cx},${cy + dh * 2 - bh}`}
        fill={right}
        stroke="#cbd5e1" strokeWidth={0.8}
      />
      {/* left face */}
      <polygon
        points={`${cx - dw},${cy + dh - bh} ${cx},${cy + dh * 2 - bh} ${cx},${cy + dh * 2} ${cx - dw},${cy + dh}`}
        fill={left}
        stroke="#cbd5e1" strokeWidth={0.8}
      />
      {/* top face */}
      <polygon
        points={`${cx},${cy - bh} ${cx + dw},${cy + dh - bh} ${cx},${cy + dh * 2 - bh} ${cx - dw},${cy + dh - bh}`}
        fill={top}
        stroke="#cbd5e1" strokeWidth={0.8}
      />
      {/* monitor glow */}
      {role && (
        <ellipse
          cx={cx - 4} cy={cy - bh - 5}
          rx={9} ry={5}
          fill={busy ? accent : '#e2e8f0'}
          opacity={busy ? 0.7 : 0.5}
          filter="url(#desk-glow)"
        />
      )}
    </g>
  )
}

export function OfficeScene() {
  const employees = useGameStore(s => s.employees)

  const floorTiles = useMemo(() => {
    const tiles = []
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        tiles.push({ c, r, isDark: (c + r) % 2 === 0 })
      }
    }
    return tiles
  }, [])

  const bl0 = iso(0, 0)
  const blR = iso(0, ROWS)
  const brC = iso(COLS, 0)

  const leftWallPts = [
    `${bl0.x},${bl0.y - WH}`,
    `${blR.x},${blR.y - WH}`,
    `${blR.x},${blR.y}`,
    `${bl0.x},${bl0.y}`,
  ].join(' ')

  const rightWallPts = [
    `${bl0.x},${bl0.y - WH}`,
    `${brC.x},${brC.y - WH}`,
    `${brC.x},${brC.y}`,
    `${bl0.x},${bl0.y}`,
  ].join(' ')

  const desks = DESK_SLOTS.map((slot, i) => ({
    ...slot,
    employee: employees[i] ?? null,
  }))

  return (
    <svg
      className="office-scene"
      viewBox="0 0 1200 680"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="bg-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f2ece0" />
          <stop offset="100%" stopColor="#f8f4ec" />
        </linearGradient>
        <filter id="desk-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width="1200" height="680" fill="url(#bg-grad)" />

      {/* Left wall */}
      <polygon points={leftWallPts} fill="#eee8d8" stroke="#d8cdb8" strokeWidth={1} />
      {/* Right wall */}
      <polygon points={rightWallPts} fill="#f4ede0" stroke="#d8cdb8" strokeWidth={1} />

      {/* Wall grid lines - left */}
      {Array.from({ length: ROWS + 1 }, (_, i) => {
        const p = iso(0, i)
        return (
          <line key={`wl-${i}`}
            x1={p.x} y1={p.y}
            x2={p.x} y2={p.y - WH}
            stroke="#d0c4b0" strokeWidth={0.5}
          />
        )
      })}
      {/* Wall grid lines - right */}
      {Array.from({ length: COLS + 1 }, (_, i) => {
        const p = iso(i, 0)
        return (
          <line key={`wr-${i}`}
            x1={p.x} y1={p.y}
            x2={p.x} y2={p.y - WH}
            stroke="#d0c4b0" strokeWidth={0.5}
          />
        )
      })}

      {/* Ceiling strip */}
      <line
        x1={bl0.x} y1={bl0.y - WH}
        x2={blR.x} y2={blR.y - WH}
        stroke="#c4b89a" strokeWidth={1}
      />
      <line
        x1={bl0.x} y1={bl0.y - WH}
        x2={brC.x} y2={brC.y - WH}
        stroke="#c4b89a" strokeWidth={1}
      />

      {/* Floor tiles */}
      {floorTiles.map(({ c, r, isDark }) => (
        <polygon
          key={`t-${c}-${r}`}
          points={tilePoints(c, r)}
          fill={isDark ? '#e8e0cc' : '#f0e8d8'}
          stroke="#d8cdb8"
          strokeWidth={0.5}
        />
      ))}

      {/* Desks */}
      {desks.map((d, i) => (
        <Desk
          key={i}
          col={d.col}
          row={d.row}
          role={d.employee?.role}
          busy={d.employee?.status === 'busy'}
        />
      ))}

      {/* Characters at desks */}
      {desks.map((d, i) => {
        if (!d.employee) return null
        const { x: cx, y: cy } = iso(d.col, d.row)
        return (
          <DeskCharacter
            key={`char-${i}`}
            cx={cx}
            cy={cy}
            role={d.employee.role}
            busy={d.employee.status === 'busy'}
          />
        )
      })}

    </svg>
  )
}
