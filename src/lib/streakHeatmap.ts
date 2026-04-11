import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { toDateKey } from '@/lib/dates'
import type { AppState } from '@/lib/types'

/** Count of tasks marked done on that calendar day. */
export function countDoneTasksOnDay(state: AppState, dateKey: string): number {
  return (state.tasksByDay[dateKey]?.items ?? []).filter((t) => t.done).length
}

/** Map done count to heat level 0–5 (5 means five or more). */
export function doneCountToLevel(done: number): 0 | 1 | 2 | 3 | 4 | 5 {
  const n = Number.isFinite(done) ? Math.max(0, Math.floor(done)) : 0
  return Math.min(5, n) as 0 | 1 | 2 | 3 | 4 | 5
}

export type StreakHeatmapCell = {
  dateKey: string
  level: 0 | 1 | 2 | 3 | 4 | 5
  doneCount: number
  saved: boolean
  isToday: boolean
  /** False for padding days outside the labeled month (neutral tile). */
  inDisplayMonth: boolean
}

/**
 * Five calendar months, oldest → newest: two before the current month, current, two after.
 * The calendar month containing `today` is the center block.
 */
export function getFiveMonthHeatmapStarts(today: Date): Date[] {
  return [
    startOfMonth(subMonths(today, 2)),
    startOfMonth(subMonths(today, 1)),
    startOfMonth(today),
    startOfMonth(addMonths(today, 1)),
    startOfMonth(addMonths(today, 2)),
  ]
}

/**
 * One calendar month as LeetCode-style week columns (Sun → Sat rows).
 * Grid is padded to full weeks; days outside that month use neutral tiles (level 0 look).
 */
export function buildStreakHeatmapMonthBlock(
  state: AppState,
  today: Date,
  displayMonthStart: Date,
): { columns: StreakHeatmapCell[][]; monthLabel: string } {
  const monthStart = startOfMonth(displayMonthStart)
  const monthEnd = endOfMonth(monthStart)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const todayKey = toDateKey(today)
  const y = monthStart.getFullYear()
  const m = monthStart.getMonth()

  const flat: StreakHeatmapCell[] = days.map((d) => {
    const dateKey = toDateKey(d)
    const d12 = new Date(`${dateKey}T12:00:00`)
    const inDisplayMonth = d12.getFullYear() === y && d12.getMonth() === m
    const doneCount = countDoneTasksOnDay(state, dateKey)
    const level = doneCountToLevel(doneCount)
    return {
      dateKey,
      level: inDisplayMonth ? level : 0,
      doneCount,
      saved: !!state.daySaved[dateKey],
      isToday: dateKey === todayKey,
      inDisplayMonth,
    }
  })

  const columns: StreakHeatmapCell[][] = []
  for (let i = 0; i < flat.length; i += 7) {
    columns.push(flat.slice(i, i + 7))
  }

  return {
    columns,
    monthLabel: format(monthStart, 'MMM yy').toUpperCase(),
  }
}
