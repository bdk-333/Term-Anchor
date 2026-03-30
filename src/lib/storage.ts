import {
  CURRENT_SCHEMA_VERSION,
  type AppState,
  STORAGE_KEY,
  type Profile,
} from './types'
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

export function createDefaultState(): AppState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    profile: emptyProfile(),
    taskCategories: defaultCategories(),
    tasksByDay: {},
    weekIntentByWeekStart: {},
    dayIntent: {},
    dayLog: {},
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
  let state = { ...createDefaultState(), ...o, schemaVersion: v } as AppState

  while (v < CURRENT_SCHEMA_VERSION) {
    v += 1
    // future: switch(v) { case 1: ... }
    state = { ...state, schemaVersion: v }
  }

  if (!state.taskCategories?.length) state.taskCategories = defaultCategories()
  if (!state.habits?.length) state.habits = defaultHabits()
  if (!state.profile) state.profile = emptyProfile()
  state.tasksByDay ??= {}
  state.weekIntentByWeekStart ??= {}
  state.dayIntent ??= {}
  state.dayLog ??= {}
  state.daySaved ??= {}
  state.habitChecks ??= {}

  return state
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
