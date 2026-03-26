import { useState, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, RoundedBox, Cylinder, Sphere, Text } from '@react-three/drei'
import * as THREE from 'three'

// A simple hexagon tile
function HexTile({ position, color, label, onClick }: any) {
  return (
    <group position={position} onClick={onClick}>
      <Cylinder args={[0.6, 0.6, 0.1, 6]} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.1} />
      </Cylinder>
      <Cylinder args={[0.55, 0.55, 0.11, 6]}>
        <meshStandardMaterial color="#ffffff" roughness={0.8} />
      </Cylinder>
      {label && (
        <Text position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.15} color="#1e293b" fontWeight="bold">
          {label}
        </Text>
      )}
    </group>
  )
}

// A literal board game pawn piece
function Pawn({ position, targetPosition, color, roleText }: any) {
  const group = useRef<THREE.Group>(null)

  // Smoothly move piece to target position
  useFrame((state, delta) => {
    if (group.current) {
      group.current.position.lerp(new THREE.Vector3(targetPosition[0], targetPosition[1], targetPosition[2]), delta * 4)
      
      // Simple hopping arc effect: If we are far from target, bounce Y up slightly
      const dist = group.current.position.distanceTo(new THREE.Vector3(targetPosition[0], targetPosition[2], targetPosition[2]))
      // (very basic hop, true maths would use a parabola, but lerpping Y is fine for prototype)
    }
  })

  return (
    <group ref={group} position={position}>
      {/* Base */}
      <Cylinder args={[0.3, 0.35, 0.2, 16]} position={[0, 0.1, 0]} castShadow>
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.4} />
      </Cylinder>
      {/* Body */}
      <Cylinder args={[0.15, 0.25, 0.6, 16]} position={[0, 0.5, 0]} castShadow>
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.4} />
      </Cylinder>
      {/* Head */}
      <Sphere args={[0.25, 16, 16]} position={[0, 0.9, 0]} castShadow>
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.4} />
      </Sphere>
      {/* Floating Label */}
      <Text position={[0, 1.4, 0]} fontSize={0.2} color="#ffffff" outlineColor="#000000" outlineWidth={0.02}>
        {roleText}
      </Text>
    </group>
  )
}

export default function PrototypeBoardGame({ onBack }: { onBack: () => void }) {
  // Tile definitions
  const TILES = [
    { id: 'idle1', pos: [-2, 0, 2], label: 'Idle' },
    { id: 'idle2', pos: [0, 0, 2], label: 'Idle' },
    { id: 'idle3', pos: [2, 0, 2], label: 'Idle' },
    { id: 'feat1', pos: [-1, 0, -1], label: 'Auth API' },
    { id: 'feat2', pos: [1, 0, -1], label: 'Landing Pg' },
    { id: 'camp1', pos: [0, 0, -3], label: 'FB Ads' },
  ]

  // Game Pieces State
  const [pieces, setPieces] = useState([
    { id: 'p1', role: 'Dev', color: '#38bdf8', currentTileId: 'idle1' },
    { id: 'p2', role: 'Dev', color: '#38bdf8', currentTileId: 'idle2' },
    { id: 'p3', role: 'Mkt', color: '#f472b6', currentTileId: 'idle3' },
  ])

  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null)

  const handleTileClick = (tileId: string) => {
    if (selectedPieceId) {
      // Move selected piece to this tile
      setPieces(prev => prev.map(p => p.id === selectedPieceId ? { ...p, currentTileId: tileId } : p))
      setSelectedPieceId(null)
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0f172a', position: 'relative' }}>
      <button className="back-button" onClick={onBack}>&larr; Back to Hub</button>

      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, background: 'rgba(15,23,42,0.8)', padding: '1.5rem', borderRadius: 12, border: '1px solid #334155', maxWidth: 300, color: '#f8fafc' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#38bdf8' }}>Premium Tabletop Engine</h3>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 15px 0', lineHeight: 1.5 }}>
          This requires ZERO character animations (no walking or typing). Employees are solid game pieces.
        </p>
        <div style={{ fontSize: 13, background: '#1e293b', padding: 10, borderRadius: 6 }}>
          <strong>How to play:</strong><br />
          1. Click a game piece (Dev/Mkt).<br />
          2. Click an empty hexagon tile.<br />
          Watch the piece slide smoothly to assign to that feature!
        </div>
      </div>

      <Canvas camera={{ position: [0, 6, 8], fov: 40 }}>
        {/* Environment mapping gives it that premium glossy look */}
        <Environment preset="city" />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />
        
        {/* Soft Contact Shadows to ground everything */}
        <ContactShadows position={[0, -0.05, 0]} opacity={0.6} scale={15} blur={2.5} far={10} color="#000000" />

        {/* The Game Board Base */}
        <group position={[0, -0.2, 0]}>
          <RoundedBox args={[8, 0.4, 10]} radius={0.1} smoothness={4} receiveShadow>
            <meshStandardMaterial color="#1e293b" roughness={0.1} metalness={0.2} />
          </RoundedBox>
          {/* A glowing edge around the board */}
          <RoundedBox args={[8.1, 0.3, 10.1]} radius={0.1} smoothness={4}>
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.1} />
          </RoundedBox>
        </group>

        {/* Render Hex Tiles */}
        {TILES.map(tile => (
          <HexTile 
            key={tile.id} 
            position={tile.pos} 
            color="#334155" 
            label={tile.label} 
            onClick={() => handleTileClick(tile.id)} 
          />
        ))}

        {/* Render Employee Pawns */}
        {pieces.map(piece => {
          const targetTile = TILES.find(t => t.id === piece.currentTileId)
          // Add slight Y offset so piece sits on top of tile
          const targetPos = targetTile ? [targetTile.pos[0], 0.05, targetTile.pos[2]] : [0, 0, 0]
          const isSelected = selectedPieceId === piece.id

          return (
            <group 
              key={piece.id} 
              onClick={(e) => { e.stopPropagation(); setSelectedPieceId(isSelected ? null : piece.id) }}
            >
              {/* Highlight Ring when selected */}
              {isSelected && (
                <Cylinder args={[0.5, 0.5, 0.05, 16]} position={[targetPos[0], 0.1, targetPos[2]]}>
                  <meshBasicMaterial color="#10b981" />
                </Cylinder>
              )}
              
              <Pawn 
                targetPosition={targetPos} 
                position={targetPos} // Start at target
                color={piece.color} 
                roleText={piece.role} 
              />
            </group>
          )
        })}

        <OrbitControls 
          makeDefault 
          minPolarAngle={0} 
          maxPolarAngle={Math.PI / 2.5} 
          minDistance={3} 
          maxDistance={15} 
        />
      </Canvas>
    </div>
  )
}
