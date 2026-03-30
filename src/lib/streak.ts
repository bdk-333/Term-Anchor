import { subDays } from 'date-fns'
import type { AppState } from './types'
import { parseDateKey, toDateKey } from './dates'

export function streakCount(state: AppState, today: Date = new Date()): number {
  let n = 0
  let d = new Date(today)
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
