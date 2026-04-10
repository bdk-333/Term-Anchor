import type { TaskItem } from './types'

export function clampMinutes(m: number): number {
  if (!Number.isFinite(m)) return 0
  return Math.max(0, Math.min(1439, Math.floor(m)))
}

/** Parse `HH:mm` from `<input type="time">`. */
export function parseTimeInput(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (!Number.isInteger(h) || !Number.isInteger(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return null
  }
  return h * 60 + min
}

/** Value for `<input type="time">` from minutes since midnight. */
export function minutesToTimeInput(m: number): string {
  const c = clampMinutes(m)
  const h = Math.floor(c / 60)
  const min = c % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

/** Local `Date` for calendar `dateKey` (yyyy-MM-dd) at `minutesFromMidnight`. */
export function dateKeyAndMinutesToDate(dateKey: string, minutesFromMidnight: number): Date {
  const [ys, ms, ds] = dateKey.split('-')
  const y = Number(ys)
  const mo = Number(ms)
  const d = Number(ds)
  const c = clampMinutes(minutesFromMidnight)
  const hh = Math.floor(c / 60)
  const mm = c % 60
  return new Date(y, mo - 1, d, hh, mm, 0, 0)
}

/** e.g. "4:00 PM" or "4:00 – 6:00 PM" (locale). */
export function formatPlannedTimeRange(task: Pick<TaskItem, 'plannedStartMinutes' | 'plannedEndMinutes'>): string | null {
  if (task.plannedStartMinutes == null) return null
  const d0 = new Date()
  d0.setHours(0, task.plannedStartMinutes, 0, 0)
  const start = d0.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (task.plannedEndMinutes == null) return start
  const d1 = new Date()
  d1.setHours(0, task.plannedEndMinutes, 0, 0)
  const end = d1.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${start} – ${end}`
}

/** Whether `completedAt` falls within planned window on `dateKey`, expanded by ±toleranceMinutes. */
export function isCompletionWithinPlannedWindow(
  dateKey: string,
  plannedStartMinutes: number,
  plannedEndMinutes: number | null | undefined,
  completedAtIso: string,
  toleranceMinutes = 5,
): boolean {
  const tol = toleranceMinutes * 60 * 1000
  const completed = new Date(completedAtIso).getTime()
  const start = dateKeyAndMinutesToDate(dateKey, plannedStartMinutes).getTime() - tol
  const endMin = plannedEndMinutes ?? plannedStartMinutes
  const end = dateKeyAndMinutesToDate(dateKey, endMin).getTime() + tol
  return completed >= start && completed <= end
}

export function computeDoneTimeMismatch(
  dateKey: string,
  task: Pick<TaskItem, 'plannedStartMinutes' | 'plannedEndMinutes'>,
  completedAtIso: string,
  toleranceMinutes = 5,
): boolean {
  if (task.plannedStartMinutes == null) return false
  return !isCompletionWithinPlannedWindow(
    dateKey,
    task.plannedStartMinutes,
    task.plannedEndMinutes,
    completedAtIso,
    toleranceMinutes,
  )
}
