import { eachDayOfInterval, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns'
import { toDateKey, weekStartKey } from '@/lib/dates'
import type { TaskCategory, TaskItem } from '@/lib/types'

/** Prefixes for @dnd-kit droppable ids (unique per day surface). */
export const CAL_DROP_PREFIX = 'calendar:'
export const LIST_DROP_PREFIX = 'list:'

export function calendarDropId(dateKey: string): string {
  return `${CAL_DROP_PREFIX}${dateKey}`
}

export function listDropId(dateKey: string): string {
  return `${LIST_DROP_PREFIX}${dateKey}`
}

/** Resolve drop target to `yyyy-MM-dd`, or `null` if not a day drop. */
export function parseDropToDateKey(overId: string): string | null {
  if (overId.startsWith(CAL_DROP_PREFIX)) return overId.slice(CAL_DROP_PREFIX.length)
  if (overId.startsWith(LIST_DROP_PREFIX)) return overId.slice(LIST_DROP_PREFIX.length)
  return null
}

export type MonthGridRange = {
  gridStart: Date
  gridEnd: Date
  /** Every visible calendar cell (Mon–Sun weeks covering the month). */
  cellDateKeys: string[]
}

/** Monday-start grid that fully contains `viewMonth`. */
export function getMonthGridRange(viewMonth: Date): MonthGridRange {
  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const cellDateKeys = eachDayOfInterval({ start: gridStart, end: gridEnd }).map((d) =>
    toDateKey(d),
  )
  return { gridStart, gridEnd, cellDateKeys }
}

export function chunkIntoWeeks(cellDateKeys: string[]): string[][] {
  const weeks: string[][] = []
  for (let i = 0; i < cellDateKeys.length; i += 7) {
    weeks.push(cellDateKeys.slice(i, i + 7))
  }
  return weeks
}

/** Monday-start week key for a calendar date string. */
export function weekKeyForDateKey(dateKey: string): string {
  return weekStartKey(new Date(`${dateKey}T12:00:00`))
}

export const MAX_LANE_BARS_PER_CELL = 5

/** Bar colors aligned with reference (green, blue, purple, gray, …). */
const LANE_BAR_BG: string[] = [
  'bg-emerald-400/88',
  'bg-sky-400/85',
  'bg-violet-400/82',
  'bg-zinc-500/78',
  'bg-amber-400/80',
  'bg-rose-400/78',
  'bg-cyan-400/80',
  'bg-fuchsia-400/75',
]

export function laneBarClassForCategory(categoryId: string, categories: ReadonlyArray<TaskCategory>): string {
  const idx = categories.findIndex((c) => c.id === categoryId)
  const i = idx === -1 ? 3 : idx % LANE_BAR_BG.length
  return LANE_BAR_BG[i] ?? LANE_BAR_BG[3]
}

/** Tasks for lane bars: by planned start, then stable order. */
export function tasksForLaneBars(items: TaskItem[]): TaskItem[] {
  return [...items].sort((a, b) => {
    const sa = a.plannedStartMinutes ?? 9999
    const sb = b.plannedStartMinutes ?? 9999
    if (sa !== sb) return sa - sb
    return a.text.localeCompare(b.text)
  })
}
