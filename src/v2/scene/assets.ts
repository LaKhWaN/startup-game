export const FURNITURE_MODELS = [
  'floorFull', 'wall', 'wallWindow',
  'desk', 'chairDesk', 'laptop',
  'bedSingle', 'sideTable', 'lampSquareTable',
  'bookcaseOpen', 'books', 'pottedPlant', 'plantSmall1',
  'lampRoundFloor', 'rugRectangle',
] as const

export type FurnitureModel = typeof FURNITURE_MODELS[number]

export function furnitureUrl(name: FurnitureModel): string {
  return `/assets/v2/furniture/${name}.glb`
}

export const CHARACTER_URL = '/assets/v2/characters/character-male-a.glb'

/** Clip names read from the Kenney Mini Characters GLB (all 12 characters share them). */
export const CHARACTER_CLIPS = [
  'static', 'idle', 'walk', 'sprint', 'jump', 'fall', 'crouch', 'sit', 'drive', 'die', 'pick-up',
  'emote-yes', 'emote-no', 'holding-right', 'holding-left', 'holding-both', 'holding-right-shoot',
  'holding-left-shoot', 'holding-both-shoot', 'attack-melee-right', 'attack-melee-left',
  'attack-kick-right', 'attack-kick-left', 'interact-right', 'interact-left', 'wheelchair-sit',
  'wheelchair-look-left', 'wheelchair-look-right', 'wheelchair-move-forward', 'wheelchair-move-back',
  'wheelchair-move-left', 'wheelchair-move-right',
] as const

export type CharacterClip = typeof CHARACTER_CLIPS[number]

export const PRELOAD_URLS: string[] = [...FURNITURE_MODELS.map(furnitureUrl), CHARACTER_URL]
