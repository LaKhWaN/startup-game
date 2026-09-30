import { useEffect, useRef } from 'react'
import { useAudioStore } from '../audio/audioStore'

const TYPING_VOLUME_SCALE = 0.12 // matches the legacy Phaser typing loop

/** Loops background music at the user's music volume. Starts on the first click/key (autoplay policy). */
export function useBackgroundMusic(src = '/assets/music/bg_music.mp3'): void {
  const musicVolume = useAudioStore(s => s.musicVolume)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio(src)
    audio.loop = true
    audio.volume = useAudioStore.getState().musicVolume
    audioRef.current = audio

    const start = () => { void audio.play().catch(() => { /* still blocked; next gesture retries */ }) }
    start()
    window.addEventListener('pointerdown', start)
    window.addEventListener('keydown', start)
    return () => {
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, [src])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = musicVolume
  }, [musicVolume])
}

/** Soft keyboard loop while the founder is typing. */
export function useTypingLoop(active: boolean, src = '/assets/music/keyboard_typing.mp3'): void {
  const sfxVolume = useAudioStore(s => s.sfxVolume)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio(src)
    audio.loop = true
    audioRef.current = audio
    return () => {
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, [src])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = sfxVolume * TYPING_VOLUME_SCALE
    if (active) void audio.play().catch(() => { /* blocked until a gesture; harmless */ })
    else audio.pause()
  }, [active, sfxVolume])
}
