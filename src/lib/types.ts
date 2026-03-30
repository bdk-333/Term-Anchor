export const CURRENT_SCHEMA_VERSION = 2

export const STORAGE_KEY = 'gradSprint:v1'

export type Profile = {
  displayName?: string
  anchorLabel: string
  anchorDate: string
  semesterStart: string
  semesterEnd: string
  degreeFocus?: string
  jobTarget?: string
  commuteMinutes?: number
  typicalCampusDays?: Partial<Record<WeekdayIndex, 'campus' | 'home'>>
  weekendNotes?: string
  onboardingComplete: boolean
}

/** 0 = Sunday … 6 = Saturday */
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type TaskCategory = { id: string; label: string }

export type TaskItem = {
  id: string
  categoryId: string
  text: string
  done: boolean
}

export type Habit = { id: string; label: string }

/** One titled block for a day’s intention or daily log (title + optional detail notes). */
export type DaySection = { id: string; title: string; details: string }

export type AppState = {
  schemaVersion: number
  profile: Profile
  taskCategories: TaskCategory[]
  tasksByDay: Record<string, { items: TaskItem[] }>
  weekIntentByWeekStart: Record<string, string>
  dayIntentSections: Record<string, DaySection[]>
  dayLogSections: Record<string, DaySection[]>
  /** Explicit end-of-day save — drives streak (matches prototype `saved`) */
  daySaved: Record<string, boolean>
  habits: Habit[]
  habitChecks: Record<string, Record<string, boolean>>
}

export const MIN_CATEGORIES = 2
export const MAX_CATEGORIES = 8
export const MIN_HABITS = 1
export const MAX_HABITS = 12
