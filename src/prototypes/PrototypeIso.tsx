import { useEffect, useRef } from 'react'
import Phaser from 'phaser'

class IsoScene extends Phaser.Scene {
  constructor() {
    super('IsoScene')
  }

  preload() {
    // Generate an isometric tile texture programmatically
    const ctx = this.textures.createCanvas('iso-tile', 100, 50)
    if (ctx && ctx.context) {
      const c = ctx.context
      c.beginPath()
      c.moveTo(50, 0)
      c.lineTo(100, 25)
      c.lineTo(50, 50)
      c.lineTo(0, 25)
      c.closePath()
      c.fillStyle = '#475569'
      c.fill()
      c.strokeStyle = '#94a3b8'
      c.stroke()
      ctx.refresh()
    }
  }

  create() {
    this.cameras.main.setBackgroundColor('#0f172a')
    
    // Draw a small 5x5 isometric grid manually for the prototype
    const tileW = 100
    const tileH = 50
    const originX = 400
    const originY = 150

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const x = originX + (col - row) * (tileW / 2)
        const y = originY + (col + row) * (tileH / 2)
        
        const tile = this.add.image(x, y, 'iso-tile')
        tile.setInteractive()
        tile.on('pointerover', () => tile.setTint(0x38bdf8))
        tile.on('pointerout', () => tile.clearTint())
      }
    }

    this.add.text(20, 60, '2.5D Isometric Grid', { color: '#f8fafc', fontSize: '24px' })
    this.add.text(20, 90, 'Phaser 3 Engine.', { color: '#94a3b8', fontSize: '16px' })
    this.add.text(20, 110, 'Hover over tiles to see simple interaction.', { color: '#94a3b8', fontSize: '16px' })
  }
}

export default function PrototypeIso({ onBack }: { onBack: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: containerRef.current,
      scene: [IsoScene]
    })

    const handleResize = () => {
      game.scale.resize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      game.destroy(true)
    }
  }, [])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <button className="back-button" onClick={onBack}>&larr; Back to Hub</button>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
