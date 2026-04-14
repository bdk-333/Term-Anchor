export const CURRENT_SCHEMA_VERSION = 7

/** Browser `localStorage` key for planner state (no server). */
export const STORAGE_KEY = 'termAnchor:v1'

/** Older installs only; read once in `loadBrowserState` then migrated to {@link STORAGE_KEY}. */
export const LEGACY_STORAGE_KEYS = ['gradSprint:v1'] as const

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

/** Optional fields when creating a lane task (Today / Week). */
export type LaneTaskCreateOpts = {
  plannedStartMinutes?: number | null
  plannedEndMinutes?: number | null
  highPriority?: boolean
  priorityDeadlineMinutes?: number | null
}

export type TaskItem = {
  id: string
  categoryId: string
  text: string
  done: boolean
  /** Planned start that day, minutes from local midnight (0–1439) */
  plannedStartMinutes?: number | null
  /** Planned end; omit or null = “at start” only (±5 min when marking done) */
  plannedEndMinutes?: number | null
  /** ISO time when marked done */
  completedAt?: string | null
  /** Set when marked done outside planned window (±5 min) */
  doneTimeMismatch?: boolean
  /** Linked row in SQLite time tracker (`/api/time/tasks`) when using Start timer */
  timeTaskId?: number | null
  /** Urgent — surfaced in reminder modal when overdue (see `highPriorityReminder`) */
  highPriority?: boolean
  /** Same-day deadline for reminders, minutes from local midnight (0–1439). */
  priorityDeadlineMinutes?: number | null
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

/** One Cornell row: short cue (left) and notes for that cue (right). */
export type CornellCueNoteRow = {
  id: string
  cue: string
  notes: string
}

/** Daily log section — mode-specific fields; `title` is the section label (e.g. “Lec 3”). */
export type DayLogSection = {
  id: string
  noteMode: NoteMode
  title: string
  /** default */
  details?: string
  /** Cornell: linked cue/notes rows (preferred). Legacy `cornellCues` / `cornellNotes` are migrated in normalize. */
  cornellRows?: CornellCueNoteRow[]
  /** 15–70: cues column width (%) in the cues+notes block */
  cornellCueColumnPct?: number
  /** Cornell legacy single-block fields (migrated into `cornellRows`) */
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
