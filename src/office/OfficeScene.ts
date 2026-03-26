import Phaser from 'phaser'
import { useGameStore } from '../store/gameStore'
import type { Employee } from '../types'
import { useAudioStore } from '../audio/audioStore'

type Point = { x: number; y: number }

type CellType = 'empty' | 'walk' | 'seat' | 'planning' | 'gaming1' | 'gaming2' | 'pantry'

const GRID = {
  cols: 12,
  rows: 7,
  cells: {
    D3: 'walk',
    E3: 'walk',
    F3: 'walk',
    G3: 'walk',
    H3: 'walk',
    I3: 'walk',
    I4: 'walk',
    I5: 'walk',
    I6: 'walk',
    H6: 'walk',
    G6: 'walk',
    F6: 'walk',
    E6: 'walk',
    D6: 'walk',
    D5: 'walk',
    D4: 'walk',
    J3: 'gaming1',
    K3: 'gaming1',
    J4: 'gaming1',
    K4: 'gaming1',
    J6: 'gaming2',
    J5: 'gaming2',
    K5: 'gaming2',
    K6: 'gaming2',
    B5: 'pantry',
    B6: 'pantry',
    C6: 'pantry',
    C5: 'pantry',
    E4: 'seat',
    F4: 'seat',
    F5: 'seat',
    E5: 'seat',
    H4: 'seat',
    H5: 'seat',
    C3: 'planning',
    B3: 'planning',
  } as Record<string, CellType>,
}

type CellCoord = { c: number; r: number }

interface SpriteEntry {
  sprite: Phaser.GameObjects.Sprite
  seatCoord: CellCoord
  seatIndex: number
  employeeId: string
  status: 'idle' | 'busy'
  patrolling: boolean
}

const SEAT_CELLS: CellCoord[] = [
  { c: 4, r: 3 }, // E4
  { c: 5, r: 3 }, // F4
  { c: 5, r: 4 }, // F5
  { c: 4, r: 4 }, // E5
  { c: 7, r: 3 }, // H4
  { c: 7, r: 4 }, // H5
]

const BUSY_TEXTS: Record<string, string[]> = {
  developer: [
    '💻 Coding...',
    '🧪 Writing tests...',
    '🐛 Debugging...',
    '🚀 Deploying...',
    '🔧 Fixing build...',
    '📦 Shipping code...',
  ],
  product_manager: [
    '📋 Writing specs...',
    '🗺️ Roadmapping...',
    '📊 Analyzing data...',
    '🎯 Prioritizing...',
    '💡 Brainstorming...',
    '📝 Writing PRD...',
  ],
  sales: [
    '📧 Cold emailing...',
    '📞 On a call...',
    '🔍 Fetching leads...',
    '🤝 Closing deal...',
    '💰 Sending proposal...',
    '📈 Updating CRM...',
  ],
  marketing: [
    '🎨 Designing ad...',
    '✍️ Writing copy...',
    '📱 A/B testing...',
    '📣 Running campaign...',
    '🎬 Editing video...',
    '📊 Tracking metrics...',
  ],
}

const IDLE_AREA_TEXTS: Record<string, string[]> = {
  pantry: [
    '☕ Grabbing coffee...',
    '🍵 Making tea...',
    '🥤 Quick refill...',
    '🍪 Snack break...',
  ],
  planning: [
    '📌 Checking board...',
    '🗺️ Reviewing roadmap...',
    '📝 Reading notes...',
    '🤔 Thinking ahead...',
  ],
  gaming1: [
    '🎮 Quick game...',
    '🕹️ Destressing...',
    '🏓 Ping pong!',
  ],
  gaming2: [
    '🎮 Quick game...',
    '🕹️ Destressing...',
    '🏓 Ping pong!',
  ],
  seat: [
    '💺 Back to work',
    '🖥️ Settling in...',
  ],
}

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

function busyBubbleText(emp: Employee): string {
  if (emp.isRefactoring) return `${emp.name}\n🔄 Refactoring...`
  const pool = BUSY_TEXTS[emp.role] ?? ['⚙️ Working...']
  return `${emp.name}\n${pickRandom(pool)}`
}

function idleAreaBubbleText(name: string, cellType: string): string {
  const pool = IDLE_AREA_TEXTS[cellType]
  if (!pool) return `${name}\n🚶 Walking...`
  return `${name}\n${pickRandom(pool)}`
}

export class OfficeScene extends Phaser.Scene {
  private spriteMap = new Map<string, SpriteEntry>()
  private bubbles = new Map<Phaser.GameObjects.Sprite, Phaser.GameObjects.Container>()
  private usedSeats = new Set<number>()
  private bgSprite!: Phaser.GameObjects.Image
  private syncTimer?: Phaser.Time.TimerEvent
  // Phaser sound typings vary by audio backend; keep flexible.
  private bgm?: any
  private audioTimer?: Phaser.Time.TimerEvent

  constructor() {
    super('OfficeScene')
  }

  preload() {
    this.load.image('office-bg', '/assets/office/office_bg_level1.png')
    this.load.spritesheet('employee', '/assets/office/employee_walk.png', {
      frameWidth: 177,
      frameHeight: 175,
    })

    // Audio
    this.load.audio('bgm-office', '/assets/music/bg_music.mp3')
    this.load.audio('sfx-coffee', '/assets/music/coffee_machine.mp3')
    this.load.audio('sfx-typing', '/assets/music/keyboard_typing.mp3')
  }

  create() {
    const w = this.scale.width
    const h = this.scale.height

    this.cameras.main.setBackgroundColor(0x000000)

    this.bgSprite = this.add.image(w / 2, h / 2, 'office-bg')
    this.rescaleBg(w, h)

    this.anims.create({
      key: 'walk-side',
      frames: this.anims.generateFrameNumbers('employee', { start: 1, end: 3 }),
      frameRate: 8,
      repeat: -1,
    })

    // Background music (loop). If autoplay is blocked, start on first click.
    this.bgm = this.sound.add('bgm-office', { loop: true, volume: useAudioStore.getState().musicVolume })
    const started = this.bgm.play()
    if (!started) {
      this.input.once('pointerdown', () => {
        const v = useAudioStore.getState().musicVolume
        if (this.bgm?.setVolume) this.bgm.setVolume(v)
        else if (this.bgm) this.bgm.volume = v
        this.bgm?.play()
      })
    }

    // Periodically apply volume changes from the UI sliders.
    this.audioTimer = this.time.addEvent({
      delay: 350,
      loop: true,
      callback: () => {
        const v = useAudioStore.getState().musicVolume
        if (this.bgm?.setVolume) this.bgm.setVolume(v)
        else if (this.bgm) this.bgm.volume = v
      },
    })

    this.syncWithStore()

    this.syncTimer = this.time.addEvent({
      delay: 1000,
      callback: this.syncWithStore,
      callbackScope: this,
      loop: true,
    })
  }

  handleResize(w: number, h: number) {
    if (this.bgSprite) {
      this.bgSprite.setPosition(w / 2, h / 2)
      this.rescaleBg(w, h)
    }
  }

  private rescaleBg(w: number, h: number) {
    const scaleX = w / this.bgSprite.width
    const scaleY = h / this.bgSprite.height
    this.bgSprite.setScale(Math.max(scaleX, scaleY))
    this.bgSprite.setScrollFactor(0)
  }

  private cellToWorld(c: number, r: number): Point {
    const w = this.scale.width
    const h = this.scale.height
    const cellW = w / GRID.cols
    const cellH = h / GRID.rows
    return {
      x: (c + 0.5) * cellW,
      y: (r + 0.5) * cellH,
    }
  }

  private isWalkable(c: number, r: number): boolean {
    if (c < 0 || c >= GRID.cols || r < 0 || r >= GRID.rows) return false
    const colLetter = String.fromCharCode('A'.charCodeAt(0) + c)
    const id = `${colLetter}${r + 1}`
    const t = GRID.cells[id]
    return !!t && t !== 'empty'
  }

  private bfsToTypes(start: CellCoord, targetTypes: CellType[]): CellCoord[] | null {
    const key = (c: number, r: number) => `${c},${r}`
    const queue: CellCoord[] = [start]
    const parent = new Map<string, CellCoord | null>()
    parent.set(key(start.c, start.r), null)

    while (queue.length) {
      const cur = queue.shift()!
      const colLetter = String.fromCharCode('A'.charCodeAt(0) + cur.c)
      const id = `${colLetter}${cur.r + 1}`
      const t = GRID.cells[id]
      if (targetTypes.includes(t ?? 'empty')) {
        const path: CellCoord[] = []
        let k: string | null = key(cur.c, cur.r)
        while (k) {
          const parentCoord = parent.get(k) as CellCoord | null
          const [cc, rr] = k.split(',').map(Number)
          path.push({ c: cc, r: rr })
          k = parentCoord ? key(parentCoord.c, parentCoord.r) : null
        }
        return path.reverse()
      }

      const dirs = [
        { dc: 1, dr: 0 },
        { dc: -1, dr: 0 },
        { dc: 0, dr: 1 },
        { dc: 0, dr: -1 },
      ]
      for (const d of dirs) {
        const nc = cur.c + d.dc
        const nr = cur.r + d.dr
        const nk = key(nc, nr)
        if (!this.isWalkable(nc, nr) || parent.has(nk)) continue
        parent.set(nk, cur)
        queue.push({ c: nc, r: nr })
      }
    }

    return null
  }

  private syncWithStore = () => {
    const employees = useGameStore.getState().employees
    const storeIds = new Set(employees.map(e => e.id))

    // Despawn fired employees
    for (const [id, entry] of this.spriteMap) {
      if (!storeIds.has(id)) {
        this.tweens.killTweensOf(entry.sprite)
        this.hideBubble(entry.sprite)
        entry.sprite.destroy()
        this.usedSeats.delete(entry.seatIndex)
        this.spriteMap.delete(id)
      }
    }

    // Spawn new hires & update statuses
    for (const emp of employees) {
      const existing = this.spriteMap.get(emp.id)
      if (!existing) {
        this.spawnEmployee(emp)
      } else {
        this.updateEmployeeBehavior(emp, existing)
      }
    }
  }

  private allocateSeat(): { coord: CellCoord; index: number } | null {
    for (let i = 0; i < SEAT_CELLS.length; i++) {
      if (!this.usedSeats.has(i)) {
        this.usedSeats.add(i)
        return { coord: SEAT_CELLS[i], index: i }
      }
    }
    return null
  }

  private spawnEmployee(emp: Employee) {
    const seat = this.allocateSeat()
    if (!seat) return

    const pos = this.cellToWorld(seat.coord.c, seat.coord.r)
    const sprite = this.add.sprite(pos.x, pos.y, 'employee', 1)
    sprite.setOrigin(0.5, 0.8)
    sprite.setScale(1)

    const entry: SpriteEntry = {
      sprite,
      seatCoord: seat.coord,
      seatIndex: seat.index,
      employeeId: emp.id,
      status: emp.status,
      patrolling: false,
    }
    this.spriteMap.set(emp.id, entry)

    if (emp.status === 'idle') {
      this.startIdlePatrol(entry, emp)
    } else {
      this.sitAtDesk(entry, emp)
    }
  }

  private updateEmployeeBehavior(emp: Employee, entry: SpriteEntry) {
    if (entry.status === emp.status) return

    entry.status = emp.status

    this.tweens.killTweensOf(entry.sprite)
    this.hideBubble(entry.sprite)

    if (emp.status === 'busy') {
      this.sitAtDesk(entry, emp)
    } else {
      this.startIdlePatrol(entry, emp)
    }
  }

  private sitAtDesk(entry: SpriteEntry, emp: Employee) {
    entry.patrolling = false
    const pos = this.cellToWorld(entry.seatCoord.c, entry.seatCoord.r)

    entry.sprite.anims.stop()
    entry.sprite.setFrame(0)
    entry.sprite.setFlipX(false)
    entry.sprite.setPosition(pos.x, pos.y)

    this.showBubble(entry.sprite, busyBubbleText(emp))
  }

  private bfsToCell(start: CellCoord, target: CellCoord): CellCoord[] | null {
    const key = (c: number, r: number) => `${c},${r}`
    const queue: CellCoord[] = [start]
    const parent = new Map<string, CellCoord | null>()
    parent.set(key(start.c, start.r), null)

    while (queue.length) {
      const cur = queue.shift()!
      if (cur.c === target.c && cur.r === target.r) {
        const path: CellCoord[] = []
        let k: string | null = key(cur.c, cur.r)
        while (k) {
          const parentCoord = parent.get(k) as CellCoord | null
          const [cc, rr] = k.split(',').map(Number)
          path.push({ c: cc, r: rr })
          k = parentCoord ? key(parentCoord.c, parentCoord.r) : null
        }
        return path.reverse()
      }

      const dirs = [
        { dc: 1, dr: 0 },
        { dc: -1, dr: 0 },
        { dc: 0, dr: 1 },
        { dc: 0, dr: -1 },
      ]
      for (const d of dirs) {
        const nc = cur.c + d.dc
        const nr = cur.r + d.dr
        const nk = key(nc, nr)
        if (!this.isWalkable(nc, nr) || parent.has(nk)) continue
        parent.set(nk, cur)
        queue.push({ c: nc, r: nr })
      }
    }

    return null
  }

  private startIdlePatrol(entry: SpriteEntry, emp: Employee) {
    entry.patrolling = true

    // Sit at desk working for a long stretch first
    const pos = this.cellToWorld(entry.seatCoord.c, entry.seatCoord.r)
    entry.sprite.anims.stop()
    entry.sprite.setFrame(0)
    entry.sprite.setFlipX(false)
    entry.sprite.setPosition(pos.x, pos.y)
    this.showBubble(entry.sprite, busyBubbleText(emp))

    // Very subtle typing sometimes while working
    if (Phaser.Math.Between(0, 99) < 35) {
      this.sound.play('sfx-typing', { volume: useAudioStore.getState().sfxVolume * 0.12 })
    }

    const deskTime = Phaser.Math.Between(8000, 18000)

    this.time.delayedCall(deskTime, () => {
      if (!entry.patrolling) return
      this.hideBubble(entry.sprite)
      this.doShortTrip(entry)
    })
  }

  private doShortTrip(entry: SpriteEntry) {
    if (!entry.patrolling) return

    const allActivities: CellType[][] = [
      ['pantry'],
      ['planning'],
      ['gaming1'],
      ['gaming2'],
    ]

    const shuffled = Phaser.Utils.Array.Shuffle([...allActivities])
    const tripCount = Phaser.Math.Between(1, 2)
    const trip = shuffled.slice(0, tripCount)

    const fullCellPath: CellCoord[] = []
    let current = entry.seatCoord
    fullCellPath.push(current)

    for (const targets of trip) {
      const targetPath = this.bfsToTypes(current, targets)
      if (!targetPath) continue
      targetPath.shift()
      fullCellPath.push(...targetPath)
      current = targetPath[targetPath.length - 1]
    }

    const returnPath = this.bfsToCell(current, entry.seatCoord)
    if (returnPath) {
      returnPath.shift()
      fullCellPath.push(...returnPath)
    }

    const points = fullCellPath.map(c => this.cellToWorld(c.c, c.r))
    this.runPatrolPath(entry, points, fullCellPath, 1)
  }

  private runPatrolPath(entry: SpriteEntry, points: Point[], cellPath: CellCoord[], i: number) {
    if (!entry.patrolling) return

    const speed = 140
    const sprite = entry.sprite
    const to = points[i]
    const toCell = cellPath[i]
    const distance = Phaser.Math.Distance.Between(sprite.x, sprite.y, to.x, to.y)
    const duration = (distance / speed) * 1000

    const dx = to.x - sprite.x
    sprite.setFlipX(dx < 0)
    sprite.play('walk-side', true)

    this.tweens.add({
      targets: sprite,
      x: to.x,
      y: to.y,
      duration,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (!entry.patrolling) return

        const colLetter = String.fromCharCode('A'.charCodeAt(0) + toCell.c)
        const id = `${colLetter}${toCell.r + 1}`
        const t = GRID.cells[id] ?? 'empty'

        const isOwnSeat = toCell.c === entry.seatCoord.c && toCell.r === entry.seatCoord.r
        const emp = useGameStore.getState().employees.find(e => e.id === entry.employeeId)
        const empName = emp?.name ?? ''

        const isActivityStop = t === 'pantry' || t === 'planning' || t === 'gaming1' || t === 'gaming2'
        const areaText = isOwnSeat
          ? idleAreaBubbleText(empName, 'seat')
          : isActivityStop
          ? idleAreaBubbleText(empName, t)
          : null

        if (t === 'pantry') {
          this.sound.play('sfx-coffee', { volume: useAudioStore.getState().sfxVolume * 0.2 })
        }

        const nextIndex = (i + 1) % points.length

        const continueWalk = (idx: number) => {
          const pause = 150 + Phaser.Math.Between(0, 250)
          this.time.delayedCall(pause, () => this.runPatrolPath(entry, points, cellPath, idx))
        }

        if (isOwnSeat) {
          const freshEmp = useGameStore.getState().employees.find(e => e.id === entry.employeeId)
          if (freshEmp) this.startIdlePatrol(entry, freshEmp)
        } else if (areaText) {
          sprite.anims.stop()
          sprite.setFrame(0)
          sprite.setFlipX(false)
          this.showBubble(sprite, areaText)
          const linger = Phaser.Math.Between(2500, 5000)

          this.time.delayedCall(linger, () => {
            if (!entry.patrolling) return
            this.hideBubble(sprite)
            continueWalk(nextIndex)
          })
        } else {
          continueWalk(nextIndex)
        }
      },
    })
  }

  private showBubble(sprite: Phaser.GameObjects.Sprite, text: string) {
    let bubble = this.bubbles.get(sprite)
    if (!bubble) {
      const bg = this.add.rectangle(0, 0, 180, 52, 0xfefae0, 0.96)
      bg.setStrokeStyle(2, 0x2c1e0f, 0.9)
      bg.setOrigin(0.5, 0.5)
      const nameTxt = this.add.text(0, -12, '', {
        fontFamily: "'Roboto', sans-serif",
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#5C3D1A',
      }).setOrigin(0.5, 0.5)
      nameTxt.setResolution(2)
      const actTxt = this.add.text(0, 8, '', {
        fontFamily: "'Roboto Mono', monospace",
        fontSize: '12px',
        color: '#2C1E0F',
      }).setOrigin(0.5, 0.5)
      actTxt.setResolution(2)
      const tail = this.add.triangle(0, 0, 0, 0, 10, 10, -10, 10, 0xfefae0, 0.96)
      tail.setStrokeStyle(2, 0x2C1E0F, 0.9)
      bubble = this.add.container(0, 0, [bg, nameTxt, actTxt, tail])
      bubble.setDepth(1000)
      this.bubbles.set(sprite, bubble)
    }
    const [bg, nameTxt, actTxt, tail] = bubble.list as [
      Phaser.GameObjects.Rectangle,
      Phaser.GameObjects.Text,
      Phaser.GameObjects.Text,
      Phaser.GameObjects.Triangle,
    ]
    const lines = text.split('\n')
    const name = lines[0] ?? ''
    const activity = lines[1] ?? lines[0] ?? ''
    nameTxt.setText(name)
    actTxt.setText(activity)
    bubble.setPosition(sprite.x, sprite.y - 160)
    tail.setPosition(0, bg.height / 2)
    bubble.setAlpha(1)
  }

  private hideBubble(sprite: Phaser.GameObjects.Sprite) {
    const bubble = this.bubbles.get(sprite)
    if (bubble) {
      bubble.setAlpha(0)
    }
  }

  destroy() {
    if (this.syncTimer) {
      this.syncTimer.destroy()
    }
    if (this.audioTimer) {
      this.audioTimer.destroy()
    }
    if (this.bgm) {
      this.bgm.stop()
      this.bgm.destroy()
    }
  }
}
