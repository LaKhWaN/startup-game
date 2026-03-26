import { useState, useEffect } from 'react'
import { User, Monitor, Coffee, Server } from 'lucide-react'

// A simple 10x10 map representation
// 0: empty void, 1: floor, 2: wall, 3: desk, 4: server, 5: coffee
const mapLayout = [
  [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  [2, 1, 1, 1, 1, 1, 1, 5, 1, 2],
  [2, 1, 3, 1, 3, 1, 1, 1, 1, 2],
  [2, 1, 3, 1, 3, 1, 1, 1, 1, 2],
  [2, 1, 1, 1, 1, 1, 1, 1, 1, 2],
  [2, 1, 1, 1, 1, 1, 4, 4, 1, 2],
  [2, 1, 3, 1, 3, 1, 1, 1, 1, 2],
  [2, 1, 3, 1, 3, 1, 1, 1, 1, 2],
  [2, 1, 1, 1, 1, 1, 1, 1, 1, 2],
  [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
]

const CELL_SIZE = 60

// 3D Block Component purely in CSS!
const Block3D = ({ type, x, y, onHover, isHovered }: any) => {
  // Base properties
  let colorTop = '#1e293b'
  let colorLeft = '#0f172a'
  let colorRight = '#334155'
  let height = 10
  let icon = null

  if (type === 1) { // Floor
    colorTop = isHovered ? '#38bdf8' : '#1e293b'
    height = 5
  } else if (type === 2) { // Wall
    colorTop = '#475569'
    colorLeft = '#334155'
    colorRight = '#64748b'
    height = 60
  } else if (type === 3) { // Desk
    colorTop = '#8b5a2b'
    colorLeft = '#5c3d1a'
    colorRight = '#a0522d'
    height = 30
    icon = <Monitor size={24} color="#f8fafc" style={{ transform: 'rotateZ(45deg) rotateX(-45deg)' }} />
  } else if (type === 4) { // Server
    colorTop = '#10b981'
    colorLeft = '#059669'
    colorRight = '#34d399'
    height = 50
    icon = <Server size={24} color="#0f172a" style={{ transform: 'rotateZ(45deg) rotateX(-45deg)' }} />
  } else if (type === 5) { // Coffee
    colorTop = '#ef4444'
    colorLeft = '#b91c1c'
    colorRight = '#f87171'
    height = 25
    icon = <Coffee size={24} color="#f8fafc" style={{ transform: 'rotateZ(45deg) rotateX(-45deg)' }} />
  }

  if (type === 0) return null

  return (
    <div 
      onMouseEnter={onHover}
      style={{
      position: 'absolute',
      left: x * CELL_SIZE,
      top: y * CELL_SIZE,
      width: CELL_SIZE,
      height: CELL_SIZE,
      transformStyle: 'preserve-3d',
      transition: 'all 0.2s ease',
      cursor: type === 1 ? 'pointer' : 'default',
    }}>
      {/* Top Face */}
      <div style={{
        position: 'absolute', width: '100%', height: '100%',
        background: colorTop,
        transform: `translateZ(${height}px)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid rgba(255,255,255,0.05)'
      }}>
        {icon}
      </div>

      {/* Right Face */}
      <div style={{
        position: 'absolute', width: '100%', height: `${height}px`,
        background: colorRight,
        transformOrigin: 'bottom',
        transform: `translateY(100%) rotateX(-90deg)`,
        bottom: 0, left: 0
      }} />

      {/* Left Face */}
      <div style={{
        position: 'absolute', width: `${height}px`, height: '100%',
        background: colorLeft,
        transformOrigin: 'right',
        transform: `translateX(100%) rotateY(90deg)`,
        top: 0, right: 0
      }} />

      {/* Floor Shadow Fix (optional but nice) */}
      <div style={{
        position: 'absolute', width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.5)',
        transform: `translateZ(-1px)`,
        filter: 'blur(2px)'
      }} />
    </div>
  )
}

// Isometric Employee Object
const EmployeeIso = ({ x, y, role, color }: any) => {
  return (
    <div style={{
      position: 'absolute',
      left: x * CELL_SIZE,
      top: y * CELL_SIZE,
      width: CELL_SIZE,
      height: CELL_SIZE,
      transformStyle: 'preserve-3d',
      transition: 'all 0.4s ease-in-out', // Smooth walking!
      pointerEvents: 'none',
      zIndex: 100 // Employees always draw above base tiles roughly
    }}>
      {/* Central "Pawn" Base */}
      <div style={{
        position: 'absolute', width: 24, height: 24,
        background: color, borderRadius: '50%',
        left: '50%', top: '50%',
        transform: `translate(-50%, -50%) translateZ(10px)`, // Hover above floor
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 15px ${color}`
      }}>
        <User size={16} color="#fff" style={{ transform: 'rotateZ(45deg) rotateX(-45deg)' }} />
      </div>
      
      {/* Drop shadow */}
      <div style={{
        position: 'absolute', width: 20, height: 20,
        background: 'rgba(0,0,0,0.4)', borderRadius: '50%',
        left: '50%', top: '50%',
        transform: `translate(-50%, -50%) translateZ(1px)`,
        filter: 'blur(3px)'
      }} />
    </div>
  )
}

export default function PrototypeIsoV2({ onBack }: { onBack: () => void }) {
  const [hoveredTile, setHoveredTile] = useState<{x: number, y: number} | null>(null)
  
  // Dev slowly walking back and forth
  const [devPos, setDevPos] = useState({ x: 5, y: 5 })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1)
      setDevPos(p => {
        // Simple pacing AI
        let nx = p.x
        let ny = p.y
        const dir = Math.floor(Math.random() * 4)
        if (dir === 0) nx += 1; else if (dir === 1) nx -= 1; else if (dir === 2) ny += 1; else if (dir === 3) ny -= 1;
        
        // Block collision
        if (mapLayout[ny] && mapLayout[ny][nx] === 1) { // can only walk on floor (1)
          return { x: nx, y: ny }
        }
        return p
      })
    }, 1200)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#020617', overflow: 'hidden', position: 'relative' }}>
      <button className="back-button" onClick={onBack}>&larr; Back to Hub</button>

      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, background: 'rgba(15,23,42,0.9)', padding: '1.5rem', border: '1px solid #334155', borderRadius: 12, maxWidth: 350, color: '#f8fafc', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#10b981' }}>CSS Isometric Engine</h3>
        <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
          This entire 3D office is rendered purely using HTML/CSS `transform: rotateX(60deg) rotateZ(-45deg)`.<br /><br />
          No heavy canvas. No 3D models. Zero image assets. Just perfect, crisp interactive UI blocks that scale infinitely. Watch the developer seamlessly roam the grid.
        </p>
      </div>

      {/* The Camera Window */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: 0, height: 0,
        // The master isometric transform
        transform: 'translate(-50%, -50%) rotateX(60deg) rotateZ(-45deg)',
        transformStyle: 'preserve-3d',
        perspective: '1200px'
      }}>
        {/* Center the grid rendering within the camera */}
        <div style={{
          position: 'absolute',
          left: -((mapLayout[0].length * CELL_SIZE) / 2),
          top: -((mapLayout.length * CELL_SIZE) / 2),
          width: mapLayout[0].length * CELL_SIZE,
          height: mapLayout.length * CELL_SIZE,
          transformStyle: 'preserve-3d'
        }}>
          
          {/* Render the Grid */}
          {mapLayout.map((row, y) => (
            row.map((cellType, x) => (
              <Block3D 
                key={`${x}-${y}`} 
                x={x} y={y} type={cellType} 
                isHovered={hoveredTile?.x === x && hoveredTile?.y === y}
                onHover={() => setHoveredTile({ x, y })}
              />
            ))
          ))}
          
          {/* Render Employees */}
          <EmployeeIso x={devPos.x} y={devPos.y} color="#38bdf8" role="dev" />
          <EmployeeIso x={2} y={2} color="#f472b6" role="mkt" /> {/* Stationary marketer at desk */}
          <EmployeeIso x={4} y={7} color="#eab308" role="sales" /> {/* Stationary sales at desk */}

        </div>
      </div>
    </div>
  )
}
