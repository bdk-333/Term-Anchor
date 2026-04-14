import { subDays } from 'date-fns'
import { toDateKey } from '@/lib/dates'
import type { AppState, TaskItem } from '@/lib/types'

/** After this local time, high-priority tasks with no deadline/start/end still surface as overdue. */
export const HIGH_PRIORITY_SOFT_EOD_MINUTES = 18 * 60

export function nowMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

export type OverdueHighPriorityItem = { dayKey: string; task: TaskItem }

/**
 * Tasks that should trigger the high-priority reminder: same-day bucket rules + unfinished
 * high-priority from **yesterday** (carryover).
 */
export function overdueHighPriorityTasks(
  state: AppState,
  now: Date = new Date(),
): OverdueHighPriorityItem[] {
  const todayKey = toDateKey(now)
  const yesterdayKey = toDateKey(subDays(now, 1))
  const nowM = nowMinutes(now)
  const out: OverdueHighPriorityItem[] = []
  const seen = new Set<string>()

  function push(dayKey: string, task: TaskItem) {
    const k = `${dayKey}:${task.id}`
    if (seen.has(k)) return
    seen.add(k)
    out.push({ dayKey, task })
  }

  function considerToday(dayKey: string, task: TaskItem) {
    if (!task.highPriority || task.done || dayKey !== todayKey) return

    const explicitDeadline = task.priorityDeadlineMinutes ?? task.plannedEndMinutes ?? null
    if (explicitDeadline != null) {
      if (nowM >= explicitDeadline) push(dayKey, task)
      return
    }
    if (task.plannedStartMinutes != null) {
      if (nowM >= task.plannedStartMinutes) push(dayKey, task)
      return
    }
    if (nowM >= HIGH_PRIORITY_SOFT_EOD_MINUTES) push(dayKey, task)
  }

  function considerPast(dayKey: string, task: TaskItem) {
    if (!task.highPriority || task.done) return
    if (dayKey < todayKey) push(dayKey, task)
  }

  for (const t of state.tasksByDay[todayKey]?.items ?? []) considerToday(todayKey, t)
  for (const t of state.tasksByDay[yesterdayKey]?.items ?? []) considerPast(yesterdayKey, t)

  return out
}
