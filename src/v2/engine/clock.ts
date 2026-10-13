import type { GameTime } from '../../types'

export const HOURS_PER_DAY = 24
export const DAYS_PER_MONTH = 30
/** Games start at 09:00 on a Monday. */
export const WORK_START = 9
/** Night hours (the founder recovers faster resting then). */
export const NIGHT_START = 18
export const NIGHT_END = 7
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export const totalDays = (t: GameTime) => Math.floor(t.totalHours / HOURS_PER_DAY)
export const totalMonths = (t: GameTime) => Math.floor(t.totalHours / (HOURS_PER_DAY * DAYS_PER_MONTH))
export const hourOfDay = (totalHours: number) => totalHours % HOURS_PER_DAY
/** Day 0 is a Monday. 0 = Mon … 6 = Sun. */
export const weekday = (totalHours: number) => Math.floor(totalHours / HOURS_PER_DAY) % 7
export const weekdayName = (totalHours: number) => WEEKDAYS[weekday(totalHours)]
export const isWeekend = (totalHours: number) => weekday(totalHours) >= 5

export function isNight(totalHours: number): boolean {
  const h = hourOfDay(totalHours)
  return h >= NIGHT_START || h < NIGHT_END
}

export function clockLabel(totalHours: number): string {
  const h = hourOfDay(totalHours)
  return `${weekdayName(totalHours)} ${String(h).padStart(2, '0')}:00`
}
