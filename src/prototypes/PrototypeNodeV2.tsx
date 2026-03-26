import { useState, useEffect } from 'react'
import { MonitorPlay, Users, Database, Terminal, Rss, Briefcase, Activity, Banknote } from 'lucide-react'

// Helper for nodes
const Node = ({ x, y, icon: Icon, label, color, stat = '', pulse = false }: any) => (
  <div style={{
    position: 'absolute', left: x, top: y, width: 120, height: 120, 
    transform: 'translate(-50%, -50%)',
    background: '#0f172a', border: `2px solid ${color}`, borderRadius: '50%',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    boxShadow: pulse ? `0 0 30px ${color}88` : `0 0 10px ${color}44`,
    zIndex: 10, transition: 'all 0.3s'
  }}>
    <Icon color={color} size={32} />
    <span style={{ fontSize: 12, marginTop: 8, fontWeight: 'bold', color: '#f8fafc' }}>{label}</span>
    {stat && <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{stat}</span>}
  </div>
)

// Helper for curved SVG edges
const Edge = ({ x1, y1, x2, y2, color, active = false }: any) => {
  const cx = (x1 + x2) / 2
  const cy = y1 - 50 // Curve upwards
  const path = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
  
  return (
    <path 
      d={path} 
      fill="none" 
      stroke={active ? color : '#334155'} 
      strokeWidth={active ? 3 : 2}
      strokeDasharray={active ? "8 8" : "none"}
      className={active ? "animated-dash" : ""}
      style={{ animation: active ? 'dash 1s linear infinite' : 'none' }}
    />
  )
}

export default function PrototypeNodeV2({ onBack }: { onBack: () => void }) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 600)
    return () => clearInterval(id)
  }, [])

  // Simulating Game State
  const state = {
    runway: '$142,000',
    users: '12,450',
    servers: 'Load 85%',
    devs: 'Coding Auth API',
    marketing: 'Ad Campaign Run',
  }

  // Animation triggers
  const coding = tick % 4 !== 0
  const deploying = tick % 5 === 0
  const marketingActive = tick % 3 !== 0
  const generatingRevenue = tick % 2 === 0

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#020617', color: '#e2e8f0', position: 'relative', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes dash {
          to { stroke-dashoffset: -16; }
        }
      `}</style>
      
      <button className="back-button" onClick={onBack}>&larr; Back to Hub</button>

      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, background: 'rgba(15,23,42,0.9)', padding: '1.5rem', border: '1px solid #334155', borderRadius: 12, maxWidth: 350 }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#38bdf8' }}>The "Nerve Center" UI</h3>
        <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
          In this paradigm, your startup is a living circuit board. Instead of placing desks, you allocate resources (bandwidth, budget, compute) through glowing pipelines. Upgrading a department means expanding its node size and bandwidth capacity.
        </p>
      </div>

      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
        {/* Edges */}
        <Edge x1={400} y1={200} x2={600} y2={400} color="#38bdf8" active={deploying} /> {/* Dev -> Servers */}
        <Edge x1={400} y1={600} x2={600} y2={400} color="#f472b6" active={marketingActive} /> {/* Marketing -> Servers */}
        <Edge x1={800} y1={400} x2={600} y2={400} color="#10b981" active={true} /> {/* Users -> Server (Traffic) */}
        
        {/* Revenue Flow */}
        <Edge x1={800} y1={400} x2={800} y2={200} color="#eab308" active={generatingRevenue} /> {/* Users -> Bank */}
        <Edge x1={800} y1={200} x2={400} y2={200} color="#eab308" active={true} /> {/* Bank -> Devs (Burn rate) */}
        <Edge x1={800} y1={200} x2={400} y2={600} color="#eab308" active={marketingActive} /> {/* Bank -> Marketing (Ad Spend) */}
      </svg>

      {/* Nodes Map */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 1200, height: 800 }}>
        
        {/* Top Left: Engineering */}
        <Node x={400} y={200} icon={Terminal} label="Engineering Dept" stat={state.devs} color="#38bdf8" pulse={coding} />
        
        {/* Bottom Left: Marketing */}
        <Node x={400} y={600} icon={Rss} label="Growth & Mkt" stat={state.marketing} color="#f472b6" pulse={marketingActive} />
        
        {/* Center: Infrastructure */}
        <Node x={600} y={400} icon={Database} label="AWS Cloud" stat={state.servers} color="#6366f1" pulse={true} />

        {/* Right: Active Users */}
        <Node x={800} y={400} icon={Users} label="Active Users" stat={state.users} color="#10b981" pulse={true} />

        {/* Top Right: Bank Account */}
        <Node x={800} y={200} icon={Banknote} label="Company Runway" stat={state.runway} color="#eab308" pulse={generatingRevenue} />
        
      </div>
    </div>
  )
}
