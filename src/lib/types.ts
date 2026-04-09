export const CURRENT_SCHEMA_VERSION = 3

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

/** Today’s intention — simple title + details per section. */
export type DaySection = { id: string; title: string; details: string }

export type NoteMode = 'default' | 'cornell' | 'outline' | 'boxed'

export type LogAttachment = {
  id: string
  kind: 'image' | 'link'
  /** data URL for images */
  data?: string
  href?: string
  label?: string
}

/** One row in an outline tree; `childrenListType` applies to this node’s children. */
export type OutlineNode = {
  id: string
  title?: string
  body: string
  childrenListType: 'ordered' | 'unordered'
  children: OutlineNode[]
}

/** Boxed notes — each box requires a title; can nest. */
export type BoxNode = {
  id: string
  title: string
  body?: string
  children: BoxNode[]
}

/** Daily log section — mode-specific fields; `title` is the section label (e.g. “Lec 3”). */
export type DayLogSection = {
  id: string
  noteMode: NoteMode
  title: string
  /** default */
  details?: string
  /** Cornell: cues left, notes right, summary full width below */
  cornellCues?: string
  cornellNotes?: string
  cornellSummary?: string
  /** outline */
  outlineTopListType?: 'ordered' | 'unordered'
  outlineRoot?: OutlineNode[]
  /** boxed */
  boxedRoot?: BoxNode[]
  attachments?: LogAttachment[]
}

export type AppState = {
  schemaVersion: number
  profile: Profile
  taskCategories: TaskCategory[]
  tasksByDay: Record<string, { items: TaskItem[] }>
  weekIntentByWeekStart: Record<string, string>
  dayIntentSections: Record<string, DaySection[]>
  dayLogSections: Record<string, DayLogSection[]>
  /** Explicit end-of-day save — drives streak (matches prototype `saved`) */
  daySaved: Record<string, boolean>
  habits: Habit[]
  habitChecks: Record<string, Record<string, boolean>>
}

export const MIN_CATEGORIES = 2
export const MAX_CATEGORIES = 8
export const MIN_HABITS = 1
export const MAX_HABITS = 12
