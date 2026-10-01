import { createContext, useContext } from 'react'
import { roomFor, type RoomLayout } from './rooms'

/** The layout of the location being drawn; provided by HomeScene. */
export const RoomContext = createContext<RoomLayout>(roomFor('home'))

export function useRoom(): RoomLayout {
  return useContext(RoomContext)
}
