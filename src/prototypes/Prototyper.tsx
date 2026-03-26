import { useState } from 'react'
import Prototype3D from './Prototype3D'
import PrototypeNode from './PrototypeNode'
import PrototypeNodeV2 from './PrototypeNodeV2'
import PrototypeNodeV3 from './PrototypeNodeV3'
import PrototypeOS from './PrototypeOS'
import PrototypeIso from './PrototypeIso'
import PrototypeIsoV2 from './PrototypeIsoV2'
import PrototypeBoardGame from './PrototypeBoardGame'
import './Prototyper.css'

type Paradigm = 'menu' | '3d' | '3d-board' | 'node' | 'node2' | 'node3' | 'os' | 'iso' | 'iso2'

export default function Prototyper() {
  const [view, setView] = useState<Paradigm>('menu')

  if (view === '3d') return <Prototype3D onBack={() => setView('menu')} />
  if (view === '3d-board') return <PrototypeBoardGame onBack={() => setView('menu')} />
  if (view === 'node') return <PrototypeNode onBack={() => setView('menu')} />
  if (view === 'node2') return <PrototypeNodeV2 onBack={() => setView('menu')} />
  if (view === 'node3') return <PrototypeNodeV3 onBack={() => setView('menu')} />
  if (view === 'os') return <PrototypeOS onBack={() => setView('menu')} />
  if (view === 'iso') return <PrototypeIso onBack={() => setView('menu')} />
  if (view === 'iso2') return <PrototypeIsoV2 onBack={() => setView('menu')} />

  return (
    <div className="prototyper-menu">
      <div className="prototyper-header">
        <h1>Visual Paradigms Prototype Hub</h1>
        <p>Explore different rendering approaches for the startup game.</p>
        <button onClick={() => window.location.pathname = '/'}>&larr; Back to Main Game</button>
      </div>

      <div className="prototyper-grid">
        <button className="proto-card" onClick={() => setView('3d')} style={{ opacity: 0.6 }}>
          <h2>1. Full 3D Diorama</h2>
          <p>Requires complex assets & animations.</p>
        </button>

        <button className="proto-card" onClick={() => setView('3d-board')} style={{ borderColor: '#38bdf8', transform: 'scale(1.05)' }}>
          <h2>🌟 2. 3D Digital Board Game</h2>
          <p>Premium tactile feel. Zero animations required. Hop pawns to assign tasks.</p>
        </button>

        <button className="proto-card" onClick={() => setView('node')} style={{ opacity: 0.6 }}>
          <h2>3. Abstract Node Flow</h2>
          <p>Pure React with SVGs.</p>
        </button>

        <button className="proto-card" onClick={() => setView('node2')}>
          <h2>3. "Nerve Center" Node Game</h2>
          <p>Fully fledged game loop simulation.</p>
        </button>

        <button className="proto-card" onClick={() => setView('node3')} style={{ borderColor: '#38bdf8' }}>
          <h2>4. Interactable Task Flow</h2>
          <p>Drag lines to assign employees to tasks.</p>
        </button>

        <button className="proto-card" onClick={() => setView('os')}>
          <h2>5. Desktop OS Sim</h2>
          <p>HTML/CSS Mock Windows.</p>
        </button>

        <button className="proto-card" onClick={() => setView('iso')} style={{ opacity: 0.6 }}>
          <h2>5. Basic Phaser 2.5D Isometric</h2>
          <p>Drawn flat lines on a canvas grid.</p>
        </button>

        <button className="proto-card" onClick={() => setView('iso2')} style={{ borderColor: '#10b981', transform: 'scale(1.05)' }}>
          <h2>🌟 6. Advanced CSS/React Isometric V2</h2>
          <p>Beautiful, fully HTML/CSS rendered 3D extruded blocks, scalable map, and smooth interactions. Zero image assets required.</p>
        </button>
      </div>
    </div>
  )
}
