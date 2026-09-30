import type { CharacterClip } from './assets'

export interface BoneLike { rotation: { x: number } }
export interface TypingBones { head?: BoneLike; armL?: BoneLike; armR?: BoneLike }

/** Procedural typing on top of the 'sit' clip. */
/**
 * Procedural typing on top of the 'sit' clip. Sets absolute rotations from each
 * bone's rest value: 'sit' has no head track, so an additive `+=` would
 * accumulate every frame and spin the head.
 */
export function applyTypingMotion(bones: TypingBones, rest: Required<Record<keyof TypingBones, number>>, t: number): void {
  if (bones.armL) bones.armL.rotation.x = rest.armL + Math.sin(t * 14) * 0.12
  if (bones.armR) bones.armR.rotation.x = rest.armR + Math.sin(t * 14 + Math.PI) * 0.12
  if (bones.head) bones.head.rotation.x = rest.head + 0.05 + Math.sin(t * 2.5) * 0.03
}

export interface FrameIntent { move: boolean; clip: CharacterClip; once: boolean }

/** What the founder does this frame: whether to advance the walk, and which clip to play. */
export function frameIntent(s: { emoting: boolean; walking: boolean; pace: boolean; poseClip: CharacterClip }): FrameIntent {
  // The nod plays in place, before walking to the next spot (spec §6.3).
  if (s.emoting) return { move: false, clip: 'emote-yes', once: true }
  if (s.walking || s.pace) return { move: true, clip: 'walk', once: false }
  return { move: true, clip: s.poseClip, once: false }
}
