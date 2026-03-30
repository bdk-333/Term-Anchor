import {
  addDays,
  differenceInCalendarDays,
  format,
  isWithinInterval,
  parseISO,
  startOfWeek,
} from 'date-fns'

export const DATE_KEY = 'yyyy-MM-dd'

export function toDateKey(d: Date): string {
  return format(d, DATE_KEY)
}

export function parseDateKey(key: string): Date {
  return parseISO(key)
}

/** Monday-start week; key = Monday's yyyy-MM-dd */
export function weekStartMonday(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 1 })
}

export function weekStartKey(d: Date): string {
  return toDateKey(weekStartMonday(d))
}

export function daysUntil(targetIso: string, from: Date = new Date()): number {
  const t = parseISO(targetIso)
  return differenceInCalendarDays(t, from)
}

export function semesterProgress(
  startIso: string,
  endIso: string,
  now: Date = new Date(),
): number {
  const start = parseISO(startIso)
  const end = parseISO(endIso)
  if (now < start) return 0
  if (now > end) return 100
  const total = differenceInCalendarDays(end, start) || 1
  const elapsed = differenceInCalendarDays(now, start)
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
}

export function weekDayKeys(monday: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => toDateKey(addDays(monday, i)))
}

export function isDateInSemester(
  dateKey: string,
  semesterStart: string,
  semesterEnd: string,
): boolean {
  const d = parseISO(dateKey)
  return isWithinInterval(d, {
    start: parseISO(semesterStart),
    end: parseISO(semesterEnd),
  })
}
