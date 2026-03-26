import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AudioState {
  musicVolume: number // 0..1
  sfxVolume: number // 0..1
  setMusicVolume: (v: number) => void
  setSfxVolume: (v: number) => void
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

export const useAudioStore = create<AudioState>()(
  persist(
    (set) => ({
      musicVolume: 0.18,
      sfxVolume: 0.6,
      setMusicVolume: (v) => set({ musicVolume: clamp01(v) }),
      setSfxVolume: (v) => set({ sfxVolume: clamp01(v) }),
    }),
    {
      name: 'startup-game-audio',
      version: 1,
    },
  ),
)

