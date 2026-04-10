import {
  CURRENT_SCHEMA_VERSION,
  type AppState,
  type DayLogSection,
  STORAGE_KEY,
  type Profile,
  type TaskItem,
} from './types'
import { migrateLegacyDayStringMap } from './daySections'
import { migrateV2LogSectionToV3 } from './logSections'
import { newId } from './id'

function defaultCategories() {
  return [
    { id: newId(), label: 'Apply' },
    { id: newId(), label: 'Build' },
    { id: newId(), label: 'Learn' },
    { id: newId(), label: 'Prep' },
  ]
}

function defaultHabits() {
  return [
    { id: newId(), label: 'Moved my body' },
    { id: newId(), label: 'Drank enough water' },
    { id: newId(), label: 'No doom scrolling before work' },
    { id: newId(), label: 'Left the house' },
  ]
}

export function emptyProfile(): Profile {
  return {
    anchorLabel: '',
    anchorDate: '',
    semesterStart: '',
    semesterEnd: '',
    onboardingComplete: false,
  }
}

type LegacyScheduleSlot = {
  id: string
  label: string
  startMinutes: number
  endMinutes: number | null
}

type TaskWithLegacySlot = TaskItem & { scheduleSlotId?: string }

/** Widen `AppState` only while running `migrate()` (v4 schedule store → v5 task fields). */
type MigrateState = AppState & {
  dayIntent?: Record<string, string>
  dayLog?: Record<string, string>
  dayScheduleByDay?: Record<string, LegacyScheduleSlot[]>
}

/** v5: fold `dayScheduleByDay` + `scheduleSlotId` into per-task planned times; drop schedule store. */
function migrateV5ScheduleIntoTasks(
  state: AppState & { dayScheduleByDay?: Record<string, LegacyScheduleSlot[]> },
): AppState {
  const raw = state.dayScheduleByDay
  const nextTasks: Record<string, { items: TaskItem[] }> = {}
  for (const [dk, bucket] of Object.entries(state.tasksByDay ?? {})) {
    nextTasks[dk] = { items: [...(bucket?.items ?? [])] }
  }
  const defaultCat = state.taskCategories[0]?.id ?? ''

  if (raw && typeof raw === 'object' && defaultCat) {
    for (const [dayKey, slots] of Object.entries(raw)) {
      if (!Array.isArray(slots)) continue
      let items = [...(nextTasks[dayKey]?.items ?? [])]
      for (const slot of slots as LegacyScheduleSlot[]) {
        const idx = items.findIndex((t) => (t as TaskWithLegacySlot).scheduleSlotId === slot.id)
        if (idx !== -1) {
          const t = items[idx] as TaskWithLegacySlot
          const { scheduleSlotId: _r, ...rest } = t
          items[idx] = {
            ...rest,
            plannedStartMinutes: slot.startMinutes,
            plannedEndMinutes: slot.endMinutes,
          }
        } else {
          items.push({
            id: newId(),
            categoryId: defaultCat,
            text: slot.label?.trim() || 'Scheduled',
            done: false,
            plannedStartMinutes: slot.startMinutes,
            plannedEndMinutes: slot.endMinutes,
          })
        }
      }
      nextTasks[dayKey] = { items }
    }
  }

  for (const dk of Object.keys(nextTasks)) {
    nextTasks[dk] = { items: (nextTasks[dk]?.items ?? []).map(stripLegacyScheduleSlot) }
  }

  const { dayScheduleByDay: _drop, ...rest } = state as AppState & {
    dayScheduleByDay?: Record<string, LegacyScheduleSlot[]>
  }
  return { ...rest, tasksByDay: nextTasks, schemaVersion: 5 }
}

function stripLegacyScheduleSlot(t: TaskItem): TaskItem {
  const { scheduleSlotId: _s, ...rest } = t as TaskWithLegacySlot
  return rest as TaskItem
}

export function createDefaultState(): AppState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    profile: emptyProfile(),
    taskCategories: defaultCategories(),
    tasksByDay: {},
    weekIntentByWeekStart: {},
    dayIntentSections: {},
    dayLogSections: {},
    daySaved: {},
    habits: defaultHabits(),
    habitChecks: {},
  }
}

export function migrate(raw: unknown): AppState {
  if (!raw || typeof raw !== 'object') return createDefaultState()
  const o = raw as Record<string, unknown>
  const sv = o.schemaVersion
  let v =
    typeof sv === 'number' && !Number.isNaN(sv)
      ? sv
      : (() => {
          const n = parseInt(String(sv ?? ''), 10)
          return Number.isNaN(n) ? 0 : n
        })()
  let state = { ...createDefaultState(), ...o, schemaVersion: v } as MigrateState

  while (v < CURRENT_SCHEMA_VERSION) {
    v += 1
    if (v === 2) {
      const legacyIntent =
        (o.dayIntent as Record<string, string> | undefined) ??
        (state as { dayIntent?: Record<string, string> }).dayIntent
      const legacyLog =
        (o.dayLog as Record<string, string> | undefined) ??
        (state as { dayLog?: Record<string, string> }).dayLog
      const hasNewIntent = o.dayIntentSections != null
      const hasNewLog = o.dayLogSections != null
      state = {
        ...state,
        schemaVersion: 2,
        dayIntentSections: hasNewIntent
          ? (state.dayIntentSections ?? {})
          : migrateLegacyDayStringMap(legacyIntent ?? {}),
        dayLogSections: hasNewLog
          ? (state.dayLogSections ?? {})
          : migrateLegacyDayStringMap(legacyLog ?? {}),
      } as MigrateState
      delete (state as { dayIntent?: unknown }).dayIntent
      delete (state as { dayLog?: unknown }).dayLog
    }
    if (v === 3) {
      const logMap = state.dayLogSections ?? {}
      const next: Record<string, DayLogSection[]> = {}
      for (const [day, secs] of Object.entries(logMap)) {
        const arr = Array.isArray(secs) ? secs : []
        next[day] = arr.map((x) => migrateV2LogSectionToV3(x))
      }
      state = { ...state, dayLogSections: next, schemaVersion: 3 }
    }
    if (v === 4) {
      state = {
        ...state,
        dayScheduleByDay:
          state.dayScheduleByDay && typeof state.dayScheduleByDay === 'object'
            ? state.dayScheduleByDay
            : {},
        schemaVersion: 4,
      }
    }
    if (v === 5) {
      state = migrateV5ScheduleIntoTasks(state) as MigrateState
    }
    if (v === 6) {
      state = { ...state, schemaVersion: 6 }
    }
  }

  if (!state.taskCategories?.length) state.taskCategories = defaultCategories()
  if (!state.habits?.length) state.habits = defaultHabits()
  if (!state.profile) state.profile = emptyProfile()
  state.tasksByDay ??= {}
  state.weekIntentByWeekStart ??= {}
  state.dayIntentSections ??= {}
  state.dayLogSections ??= {}
  state.daySaved ??= {}
  state.habitChecks ??= {}

  delete (state as Record<string, unknown>).dayScheduleByDay

  return state as AppState
}

/** Browser-only storage (GitHub Pages, file://, or fallback when the local server is down). */
export function loadBrowserState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultState()
    return migrate(JSON.parse(raw))
  } catch {
    return createDefaultState()
  }
}

export function saveBrowserState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function exportStateJson(state: AppState): string {
  return JSON.stringify(state, null, 2)
}

export function importStateJson(json: string): AppState {
  const parsed = JSON.parse(json) as unknown
  return migrate(parsed)
}

export function downloadBackup(state: AppState, filename = 'term-anchor-backup.json') {
  const blob = new Blob([exportStateJson(state)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
