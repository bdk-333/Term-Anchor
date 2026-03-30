import { subDays } from 'date-fns'
import type { AppState } from './types'
import { parseDateKey, toDateKey } from './dates'

/**
 * Consecutive days with "Save today" checked, walking backward in time.
 * If **today** is not saved yet, we start from **yesterday** so the streak does not
 * reset to 0 at midnight before the user has a chance to log the new day.
 */
export function streakCount(state: AppState, today: Date = new Date()): number {
  const todayKey = toDateKey(today)
  let d = new Date(today)
  if (!state.daySaved[todayKey]) {
    d = subDays(d, 1)
  }
  let n = 0
  while (true) {
    const k = toDateKey(d)
    if (state.daySaved[k]) {
      n++
      d = subDays(d, 1)
    } else break
  }
  return n
}

/** Last 7 calendar days ending at `today`, oldest first */
export function streakPips(state: AppState, today: Date = new Date()): boolean[] {
  const out: boolean[] = []
  for (let i = 6; i >= 0; i--) {
    const d = subDays(today, i)
    const k = toDateKey(d)
    out.push(!!state.daySaved[k])
  }
  return out
}

export function isValidDateKey(key: string): boolean {
  try {
    const d = parseDateKey(key)
    return !Number.isNaN(d.getTime())
  } catch {
    return false
  }
}
