import { ContactShadows, useGLTF } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, type ReactNode } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { PRELOAD_URLS } from './assets'
import { ROOM } from './layout'
import { Room } from './Room'

PRELOAD_URLS.forEach(url => useGLTF.preload(url))

const CENTER: [number, number, number] = [ROOM.width / 2, 0.45, -ROOM.depth / 2]
// Isometric direction: 45° around, ≈33° down.
const CAMERA_DIR: [number, number, number] = [1, 0.9, 1]
const CAMERA_DISTANCE = 20
/** World units the room needs horizontally / vertically on screen, with margin. */
const VIEW_SPAN_X = 6.6
const VIEW_SPAN_Y = 5.0

function CameraRig() {
  const { camera, size } = useThree()
  useEffect(() => {
    const len = Math.hypot(...CAMERA_DIR)
    camera.position.set(
      CENTER[0] + (CAMERA_DIR[0] / len) * CAMERA_DISTANCE,
      CENTER[1] + (CAMERA_DIR[1] / len) * CAMERA_DISTANCE,
      CENTER[2] + (CAMERA_DIR[2] / len) * CAMERA_DISTANCE,
    )
    camera.lookAt(...CENTER)
    camera.zoom = Math.min(size.width / VIEW_SPAN_X, size.height / VIEW_SPAN_Y)
    camera.updateProjectionMatrix()
  }, [camera, size])
  return null
}

function Lights() {
  return (
    <>
      <hemisphereLight args={['#ffe9cc', '#4a3a2c', 0.9]} />
      {/* Warm evening light coming in through the back-wall window */}
      <directionalLight
        position={[1.5, 5, -7]}
        intensity={2.2}
        color="#ffd9a8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-bias={-0.0005}
      />
      {/* Soft front fill so the cut-away side isn't black */}
      <directionalLight position={[8, 6, 6]} intensity={0.55} color="#ffe2c2" />
      {/* Floor lamp by the desk */}
      <pointLight position={[0.33, 0.95, -3.52]} intensity={3} distance={3.5} decay={2} color="#ffb46b" />
    </>
  )
}

export default function HomeScene({ children }: { children?: ReactNode }) {
  return (
    <div className="v2-scene">
      <Canvas
        orthographic
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: import.meta.env.DEV }}
        onCreated={({ gl }) => { gl.toneMapping = ACESFilmicToneMapping }}
      >
        <color attach="background" args={['#2b2119']} />
        <CameraRig />
        <Lights />
        <Room />
        <ContactShadows position={[ROOM.width / 2, 0.006, -ROOM.depth / 2]} scale={4.5} blur={2.4} opacity={0.45} far={1.5} />
        {children}
      </Canvas>
    </div>
  )
}
