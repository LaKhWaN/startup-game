import { useAudioStore } from './audioStore'

export type SfxKey =
  | 'click'
  | 'notification'
  | 'whoosh'
  | 'success1'
  | 'success2'
  | 'fired'
  | 'cashCredit'
  | 'cashDebit'

const SFX_URL: Record<SfxKey, string> = {
  click: '/assets/music/click.mp3',
  notification: '/assets/music/notification.mp3',
  whoosh: '/assets/music/whoosh.mp3',
  success1: '/assets/music/success_1.mp3',
  success2: '/assets/music/success_2.mp3',
  fired: '/assets/music/fired.mp3',
  cashCredit: '/assets/music/cash_credit.mp3',
  cashDebit: '/assets/music/cash_debit.mp3',
}

const pool = new Map<SfxKey, HTMLAudioElement[]>()

function getAudio(key: SfxKey): HTMLAudioElement {
  const list = pool.get(key) ?? []
  for (const a of list) {
    if (a.paused) return a
  }
  const a = new Audio(SFX_URL[key])
  a.preload = 'auto'
  list.push(a)
  pool.set(key, list)
  return a
}

export function playSfx(key: SfxKey, volumeMultiplier = 1) {
  const { sfxVolume } = useAudioStore.getState()
  if (sfxVolume <= 0) return

  const a = getAudio(key)
  a.volume = Math.max(0, Math.min(1, sfxVolume * volumeMultiplier))
  try {
    a.currentTime = 0
  } catch {
    // ignore
  }
  void a.play().catch(() => {
    // Autoplay can block; user gesture will unblock later.
  })
}

