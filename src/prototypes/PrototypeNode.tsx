import { useState, useEffect } from 'react'
import { Server, User, Database, Code2 } from 'lucide-react'

export default function PrototypeNode({ onBack }: { onBack: () => void }) {
  const [particles, setParticles] = useState<number[]>([0, 0, 0])

  useEffect(() => {
    const id = setInterval(() => {
      setParticles(p => p.map(val => (val >= 100 ? 0 : val + 2)))
    }, 50)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#020617', color: '#e2e8f0', position: 'relative', overflow: 'hidden', fontFamily: 'monospace' }}>
      <button className="back-button" onClick={onBack}>&larr; Back to Hub</button>
      
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, background: 'rgba(0,0,0,0.8)', padding: '1rem', border: '1px solid #334155', borderRadius: 8 }}>
        <h3>Abstract Node Flow</h3>
        <p>Entities are nodes. Data flows between them via simulated particles.</p>
        <p>Zero reliance on complex game assets.</p>
      </div>

      {/* SVG Background for connections */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
        <defs>
          <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Link 1 (Dev to Project) */}
        <polyline points="250,250 500,200" fill="none" stroke="#1e293b" strokeWidth="4" />
        <circle cx={250 + (250 * particles[0] / 100)} cy={250 - (50 * particles[0] / 100)} r="4" fill="#38bdf8" />

        {/* Link 2 (Dev 2 to Project) */}
        <polyline points="250,450 500,200" fill="none" stroke="#1e293b" strokeWidth="4" />
        <circle cx={250 + (250 * particles[1] / 100)} cy={450 - (250 * particles[1] / 100)} r="4" fill="#818cf8" />

        {/* Link 3 (Project to Database) */}
        <polyline points="500,200 750,350" fill="none" stroke="#1e293b" strokeWidth="4" />
        <circle cx={500 + (250 * particles[2] / 100)} cy={200 + (150 * particles[2] / 100)} r="4" fill="#10b981" />
      </svg>

      {/* Nodes */}
      <div style={{ position: 'absolute', zIndex: 2, top: 0, left: 0, width: '100%', height: '100%' }}>
        {/* Node: Developer 1 */}
        <div style={{ position: 'absolute', left: 200, top: 200, width: 100, height: 100, background: '#1e293b', border: '1px solid #38bdf8', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(56, 189, 248, 0.2)' }}>
          <User color="#38bdf8" size={32} />
          <span style={{ fontSize: 10, marginTop: 8 }}>Dev 1</span>
        </div>

        {/* Node: Developer 2 */}
        <div style={{ position: 'absolute', left: 200, top: 400, width: 100, height: 100, background: '#1e293b', border: '1px solid #818cf8', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(129, 140, 248, 0.2)' }}>
          <User color="#818cf8" size={32} />
          <span style={{ fontSize: 10, marginTop: 8 }}>Dev 2</span>
        </div>

        {/* Node: Project Core */}
        <div style={{ position: 'absolute', left: 450, top: 150, width: 100, height: 100, background: '#0f172a', border: '2px dashed #94a3b8', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Code2 color="#94a3b8" size={32} />
          <span style={{ fontSize: 10, marginTop: 8 }}>Project Alpha</span>
        </div>

        {/* Node: Database Server */}
        <div style={{ position: 'absolute', left: 700, top: 300, width: 100, height: 100, background: '#1e293b', border: '1px solid #10b981', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)' }}>
          <Database color="#10b981" size={32} />
          <span style={{ fontSize: 10, marginTop: 8 }}>Production DB</span>
        </div>
      </div>
    </div>
  )
}
