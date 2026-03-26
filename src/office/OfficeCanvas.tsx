import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { OfficeScene } from './OfficeScene'

interface OfficeCanvasProps {
  onReady?: () => void
}

export function OfficeCanvas({ onReady }: OfficeCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const { clientWidth: w, clientHeight: h } = wrapper

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: w,
      height: h,
      parent: wrapper,
      backgroundColor: '#2C1E0F',
      physics: {
        default: 'arcade',
        arcade: { debug: false },
      },
      scene: [OfficeScene],
      scale: {
        mode: Phaser.Scale.NONE,
      },
    }

    const game = new Phaser.Game(config)
    gameRef.current = game

    // Wait for the scene's create() to finish (not just the game boot),
    // then enforce a minimum 800ms so the loader is always visible.
    const startTime = Date.now()
    const MIN_MS = 800

    function fireReady() {
      const elapsed = Date.now() - startTime
      const delay   = Math.max(0, MIN_MS - elapsed)
      setTimeout(() => onReady?.(), delay)
    }

    game.events.once('ready', () => {
      const scene = game.scene.getScene('OfficeScene')
      if (scene) {
        scene.events.once('create', fireReady)
      } else {
        // Fallback if scene key not found
        fireReady()
      }
    })

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) {
        game.scale.resize(width, height)
        const scene = game.scene.getScene('OfficeScene') as OfficeScene | null
        scene?.handleResize(width, height)
      }
    })
    ro.observe(wrapper)

    return () => {
      ro.disconnect()
      game.destroy(true)
      gameRef.current = null
    }
  }, [])

  return (
    <div
      ref={wrapperRef}
      style={{ flex: 1, minHeight: 0, background: '#2C1E0F' }}
    />
  )
}
