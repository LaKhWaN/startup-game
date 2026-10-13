import { gameStore } from './store'
import { hydrateGame } from './saveV2'
import { resetUi } from './ui'

/**
 * Dev only: open `/?play&scene=<name>` to load a generated game moment from
 * `public/dev-scenes/<name>.json` (made by SIM_SCENES=1 npx vitest run src/v2/__tests__/scenes.test.ts),
 * paused, for screenshots.
 */
export function sceneFromUrl(): string | null {
  if (!import.meta.env.DEV) return null
  return new URLSearchParams(window.location.search).get('scene')
}

export async function loadScene(name: string): Promise<boolean> {
  try {
    const res = await fetch(`/dev-scenes/${encodeURIComponent(name)}.json`)
    if (!res.ok) return false
    const state = hydrateGame(await res.json())
    if (!state) return false
    resetUi()
    gameStore.setState({ ...state, gameSpeed: 0 })
    return true
  } catch (err) {
    console.error('[scenes] failed to load', name, err)
    return false
  }
}
