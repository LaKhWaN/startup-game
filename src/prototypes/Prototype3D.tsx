import { Canvas } from '@react-three/fiber'
import { OrbitControls, Box, Cylinder } from '@react-three/drei'

export default function Prototype3D({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1e293b' }}>
      <button className="back-button" onClick={onBack}>&larr; Back to Hub</button>
      
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, color: '#f8fafc', background: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: 8 }}>
        <h3>3D Diorama (React Three Fiber)</h3>
        <p>Uses proper depth sorting and 3D lighting.</p>
        <p>Tip: Drag to rotate, scroll to zoom.</p>
      </div>

      <Canvas camera={{ position: [5, 5, 5], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        
        {/* Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#334155" />
        </mesh>

        {/* Desks */}
        <Box position={[-2, 0.5, -2]} args={[2, 1, 1]} castShadow>
          <meshStandardMaterial color="#8b5a2b" />
        </Box>
        <Box position={[2, 0.5, 2]} args={[2, 1, 1]} castShadow>
          <meshStandardMaterial color="#8b5a2b" />
        </Box>

        {/* Employees */}
        <Cylinder position={[-2, 1.5, -1]} args={[0.3, 0.3, 1]} castShadow>
          <meshStandardMaterial color="#ef4444" />
        </Cylinder>
        <Cylinder position={[2, 1.5, 1]} args={[0.3, 0.3, 1]} castShadow>
          <meshStandardMaterial color="#3b82f6" />
        </Cylinder>

        {/* Plants / Props */}
        <Cylinder position={[4, 1, -4]} args={[0.5, 0.5, 2]} castShadow>
          <meshStandardMaterial color="#22c55e" />
        </Cylinder>

        <OrbitControls makeDefault />
      </Canvas>
    </div>
  )
}
