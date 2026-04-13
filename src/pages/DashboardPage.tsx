import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { DashboardTimerSections } from '@/components/time/DashboardTimerSections'
import { TaskPlannedTimeInline } from '@/components/task/TaskPlannedTimeInline'
import { IntentSectionsEditor } from '@/components/IntentSectionsEditor'
import { LogSectionsEditor } from '@/components/LogSectionsEditor'
import { GlassStatCard } from '@/components/GlassStatCard'
import { StreakContributionHeatmap } from '@/components/StreakContributionHeatmap'
import { useAppState } from '@/context/AppStateContext'
import { useTimeTracker } from '@/context/TimeTrackerContext'
import { MIN_LOG_WORDS_FOR_SAVE, canSaveToday, dailyLogMeetsSaveRule } from '@/lib/daySections'
import {
  clampMinutes,
  computeDoneTimeMismatch,
  formatPlannedTimeRange,
  parseTimeInput,
} from '@/lib/taskPlannedTime'
import { daysUntil, semesterProgress, toDateKey } from '@/lib/dates'
import { newId } from '@/lib/id'
import type { AppState, DayLogSection, DaySection, TaskItem } from '@/lib/types'
import { streakCount, streakPips } from '@/lib/streak'
import { deleteTask } from '@/lib/timeApi'

const LANE_TITLE = [
  'text-ta-lane-0',
  'text-ta-lane-1',
  'text-ta-lane-2',
  'text-ta-lane-3',
] as const
const LANE_DOT = ['bg-ta-lane-0', 'bg-ta-lane-1', 'bg-ta-lane-2', 'bg-ta-lane-3'] as const

function firstSlotForEmptyLane(items: TaskItem[], lane: string, categoryOrder: string[]): number {
  const ti = categoryOrder.indexOf(lane)
  if (ti === -1) return items.length
  for (let i = 0; i < items.length; i++) {
    const li = categoryOrder.indexOf(items[i].categoryId)
    if (li > ti) return i
  }
  return items.length
}

function SortableDashboardTask({
  task,
  plannedLabel,
  tracking,
  mismatch,
  onToggle,
  onPatch,
  onRemove,
  onStartTimer,
  timeApiOk,
}: {
  task: TaskItem
  plannedLabel: ReturnType<typeof formatPlannedTimeRange>
  tracking: boolean
  mismatch: boolean
  onToggle: (id: string) => void
  onPatch: (id: string, patch: Partial<TaskItem>) => void
  onRemove: (id: string) => void
  onStartTimer: (id: string) => void
  timeApiOk: boolean | null
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  }
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={[
        'rounded-lg border px-2 py-2 group',
        tracking
          ? 'border-ta-accent/45 bg-ta-accent/[0.07] shadow-[0_0_20px_-8px_rgba(232,255,71,0.2)]'
          : mismatch
            ? 'border-amber-400/55 bg-amber-500/[0.07] shadow-[0_0_20px_-8px_rgba(251,191,36,0.25)]'
            : 'border-white/[0.06] bg-black/15',
      ].join(' ')}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing font-mono text-ta-muted touch-none px-0.5 shrink-0 mt-0.5"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder or move lane"
        >
          ⋮⋮
        </button>
        <button
          type="button"
          onClick={() => onToggle(task.id)}
          className={`mt-0.5 w-4 h-4 shrink-0 rounded border font-mono text-[10px] leading-4 ${
            task.done
              ? 'bg-ta-success border-ta-success text-ta-bg'
              : 'border-ta-muted bg-ta-surface-muted/50'
          }`}
          aria-label={task.done ? 'Mark incomplete' : 'Mark done'}
        >
          {task.done ? '✓' : ''}
        </button>
        <div className={`flex-1 min-w-0 ${task.done ? 'text-ta-muted' : ''}`}>
          {plannedLabel ? (
            <p className="font-mono text-[10px] text-sky-300/90 leading-tight mb-0.5">{plannedLabel}</p>
          ) : null}
          <span
            className={`text-sm block leading-snug ${task.done ? 'line-through' : 'text-ta-text'}`}
          >
            {task.text}
          </span>
          {task.done && task.completedAt ? (
            <p className="font-mono text-[9px] text-ta-muted/90 mt-1">
              Done at{' '}
              {new Date(task.completedAt).toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
          ) : null}
          {task.done && task.doneTimeMismatch ? (
            <p className="font-mono text-[9px] text-amber-200/95 mt-1 leading-snug">
              Completed outside the planned window (allowed ±5 min).
            </p>
          ) : null}
          <TaskPlannedTimeInline task={task} onPatch={(patch) => onPatch(task.id, patch)} />
          {tracking ? (
            <p className="font-mono text-[9px] text-ta-accent mt-2">Tracking now</p>
          ) : null}
          {!task.done && timeApiOk === true && !tracking ? (
            <div className="mt-2">
              <button
                type="button"
                className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md border border-ta-accent/45 text-ta-accent bg-white/[0.04] hover:bg-ta-accent/10"
                onClick={() => onStartTimer(task.id)}
              >
                Start timer
              </button>
            </div>
          ) : null}
          {!task.done && timeApiOk === false ? (
            <p className="font-mono text-[9px] text-ta-muted/90 mt-2 leading-snug">
              Start timer: run the app with the local server so{' '}
              <span className="font-mono text-ta-text/80">/api/time</span> is available.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 text-ta-muted hover:text-ta-danger font-mono text-xs shrink-0"
          onClick={() => onRemove(task.id)}
          aria-label="Remove task"
        >
          ×
        </button>
      </div>
    </li>
  )
}

function LaneSortableList({
  laneId,
  taskIds,
  children,
}: {
  laneId: string
  taskIds: string[]
  children: ReactNode
}) {
  const { setNodeRef } = useDroppable({ id: laneId })
  return (
    <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
      <ul ref={setNodeRef} className="space-y-3 flex-1 mb-3 min-h-[72px]">
        {children}
      </ul>
    </SortableContext>
  )
}

function countTasksDone(s: AppState): number {
  let n = 0
  for (const { items } of Object.values(s.tasksByDay)) {
    for (const t of items) {
      if (t.done) n++
    }
  }
  return n
}

export function DashboardPage() {
  const { state, setState } = useAppState()
  const { apiOk: timeApiOk, runStartPlannerTask, current: timerCurrent } = useTimeTracker()
  const [searchParams, setSearchParams] = useSearchParams()
  const plannerStartParam = searchParams.get('startPlannerTask')
  const [logSideBySide, setLogSideBySide] = useState(false)
  const [activeLaneTaskId, setActiveLaneTaskId] = useState<string | null>(null)
  const today = new Date()
  const todayKey = toDateKey(today)

  const profile = state.profile
  if (!profile.onboardingComplete) {
    return <Navigate to="/onboarding" replace />
  }

  const rawItems = state.tasksByDay[todayKey]?.items
  const byCat = useMemo(() => {
    const list = rawItems ?? []
    const m = new Map<string, typeof list>()
    for (const c of state.taskCategories) m.set(c.id, [])
    for (const t of list) {
      if (m.has(t.categoryId)) m.get(t.categoryId)!.push(t)
    }
    return m
  }, [rawItems, state.taskCategories])

  const bucket = rawItems ?? []

  const categoryIds = useMemo(() => state.taskCategories.map((c) => c.id), [state.taskCategories])
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const until = profile.anchorDate ? daysUntil(profile.anchorDate, today) : null
  const daysLeftDisplay = until != null ? Math.max(0, until) : null
  const progress =
    profile.semesterStart && profile.semesterEnd
      ? semesterProgress(profile.semesterStart, profile.semesterEnd, today)
      : 0

  const streak = streakCount(state, today)
  const pips = streakPips(state, today)

  const tasksDone = useMemo(() => countTasksDone(state), [state.tasksByDay])

  const streakDesc =
    streak === 0
      ? 'day streak — start today'
      : streak === 1
        ? 'day streak — keep going'
        : 'day streak — don’t break it'

  const intentionSections = state.dayIntentSections[todayKey] ?? []
  const logSections = state.dayLogSections[todayKey] ?? []
  const dayMarked = !!state.daySaved[todayKey]
  const logQualifies = useMemo(() => dailyLogMeetsSaveRule(logSections), [logSections])
  const saveReadiness = useMemo(() => canSaveToday(state, todayKey), [state, todayKey])

  function patchTodayTasks(items: typeof bucket) {
    setState((s) => ({
      ...s,
      tasksByDay: {
        ...s.tasksByDay,
        [todayKey]: { items },
      },
    }))
  }

  function patchTask(id: string, patch: Partial<TaskItem>) {
    patchTodayTasks(bucket.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  function addTask(
    categoryId: string,
    text: string,
    opts?: { plannedStartMinutes?: number | null; plannedEndMinutes?: number | null },
  ) {
    const t = text.trim()
    if (!t) return
    patchTodayTasks([
      ...bucket,
      {
        id: newId(),
        categoryId,
        text: t,
        done: false,
        plannedStartMinutes: opts?.plannedStartMinutes ?? undefined,
        plannedEndMinutes: opts?.plannedEndMinutes ?? undefined,
      },
    ])
  }

  function toggleTask(id: string) {
    const t = bucket.find((x) => x.id === id)
    if (!t) return
    if (t.done) {
      patchTask(id, { done: false, completedAt: undefined, doneTimeMismatch: undefined })
    } else {
      const completedAt = new Date().toISOString()
      const mismatch =
        t.plannedStartMinutes != null && computeDoneTimeMismatch(todayKey, t, completedAt, 5)
      patchTask(id, { done: true, completedAt, doneTimeMismatch: mismatch })
    }
  }

  function removeTask(id: string) {
    const t = bucket.find((x) => x.id === id)
    if (t?.timeTaskId != null) {
      void deleteTask(t.timeTaskId).catch(() => {})
    }
    patchTodayTasks(bucket.filter((x) => x.id !== id))
  }

  function laneOfTask(taskId: string): string | null {
    return bucket.find((t) => t.id === taskId)?.categoryId ?? null
  }

  function handleLaneDragStart(e: DragStartEvent) {
    setActiveLaneTaskId(String(e.active.id))
  }

  function handleLaneDragEnd(e: DragEndEvent) {
    setActiveLaneTaskId(null)
    const { active, over } = e
    if (!over) return
    const aid = String(active.id)
    const oid = String(over.id)
    const activeLane = laneOfTask(aid)
    if (!activeLane) return
    const overLane = categoryIds.includes(oid) ? oid : laneOfTask(oid)
    if (!overLane) return

    const items = [...bucket]
    const activeFlat = items.findIndex((t) => t.id === aid)
    if (activeFlat === -1) return

    if (activeLane === overLane) {
      const overFlat = items.findIndex((t) => t.id === oid)
      if (overFlat === -1 || activeFlat === overFlat) return
      patchTodayTasks(arrayMove(items, activeFlat, overFlat))
      return
    }

    const moved = { ...items[activeFlat], categoryId: overLane }
    const without = items.filter((t) => t.id !== aid)
    let insertAt = without.length
    if (categoryIds.includes(oid)) {
      let last = -1
      for (let i = 0; i < without.length; i++) {
        if (without[i].categoryId === overLane) last = i
      }
      insertAt =
        last === -1 ? firstSlotForEmptyLane(without, overLane, categoryIds) : last + 1
    } else {
      const overFlat = without.findIndex((t) => t.id === oid)
      insertAt = overFlat === -1 ? without.length : overFlat
    }
    patchTodayTasks([...without.slice(0, insertAt), moved, ...without.slice(insertAt)])
  }

  const activeDragTask = useMemo(() => {
    if (!activeLaneTaskId) return null
    return bucket.find((t) => t.id === activeLaneTaskId) ?? null
  }, [activeLaneTaskId, bucket])

  function setIntentionSections(next: DaySection[]) {
    setState((s) => ({
      ...s,
      dayIntentSections: { ...s.dayIntentSections, [todayKey]: next },
    }))
  }

  function setLogSections(next: DayLogSection[]) {
    setState((s) => ({
      ...s,
      dayLogSections: { ...s.dayLogSections, [todayKey]: next },
    }))
  }

  function saveDay() {
    if (dayMarked) return
    if (!canSaveToday(state, todayKey).ok) return
    setState((s) => ({
      ...s,
      daySaved: { ...s.daySaved, [todayKey]: true },
    }))
  }

  function toggleHabit(habitId: string) {
    setState((s) => {
      const day = s.habitChecks[todayKey] ?? {}
      const next = { ...day, [habitId]: !day[habitId] }
      return {
        ...s,
        habitChecks: { ...s.habitChecks, [todayKey]: next },
      }
    })
  }

  const greeting = profile.displayName?.trim()
    ? `Today — ${profile.displayName}`
    : 'Today'

  useEffect(() => {
    if (!plannerStartParam || timeApiOk !== true) return
    const taskId = decodeURIComponent(plannerStartParam)
    setSearchParams(
      (sp) => {
        const n = new URLSearchParams(sp)
        n.delete('startPlannerTask')
        return n
      },
      { replace: true },
    )
    void runStartPlannerTask(taskId)
  }, [plannerStartParam, timeApiOk, setSearchParams, runStartPlannerTask])

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 lg:gap-12 lg:items-start">
        <div className="space-y-10">
          <header className="ta-glass-panel ta-glass-panel--tilt-none flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 p-5 sm:p-6 mb-2">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ta-muted mb-2">
                {today.toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ta-text">
                {greeting}
              </h2>
              {profile.degreeFocus && (
                <p className="font-mono text-xs text-ta-accent2/90 mt-3 leading-relaxed max-w-md">
                  {profile.degreeFocus}
                </p>
              )}
            </div>
            <div className="flex flex-col items-start sm:items-end gap-3 shrink-0 w-full sm:w-auto">
              <div className="text-left sm:text-right w-full sm:w-auto">
                <span className="font-mono text-4xl sm:text-5xl font-bold text-ta-accent leading-none">
                  {daysLeftDisplay ?? '—'}
                </span>
                <p className="font-mono text-[11px] uppercase tracking-wider text-ta-muted mt-2">
                  days to {profile.anchorLabel || 'anchor'}
                </p>
                <div className="mt-4 h-1.5 w-40 max-w-full rounded-full bg-black/30 sm:ml-auto sm:mr-0 overflow-hidden ring-1 ring-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-ta-accent to-[#c8e830] transition-all duration-500 shadow-[0_0_12px_rgba(232,255,71,0.45)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="font-mono text-[10px] text-ta-muted mt-1.5">Term progress</p>
              </div>
            </div>
          </header>

          <div className="ta-stat-grid grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <GlassStatCard label="Days left" value={daysLeftDisplay ?? '—'} variant="lime" />
            <GlassStatCard label="Tasks done" value={tasksDone} variant="white" />
            <GlassStatCard label="Streak" value={streak} variant="red" />
          </div>

          <section
            className="ta-glass-streak flex flex-col gap-4 sm:gap-5 p-4 sm:p-5"
            aria-label="Streak"
          >
            <div className="flex flex-wrap items-center gap-4 sm:gap-5">
              <span className="ta-fire-emoji select-none shrink-0" title="Streak" aria-hidden="true">
                🔥
              </span>
              <div className="flex-1 min-w-[140px]">
                <p className="font-mono text-2xl sm:text-[1.75rem] font-bold text-ta-accent2 drop-shadow-[0_0_14px_rgba(255,107,53,0.45)]">
                  {streak}
                </p>
                <p className="font-mono text-[11px] text-ta-muted mt-1">{streakDesc}</p>
              </div>
              <div className="flex gap-1.5 w-full sm:w-auto sm:shrink-0 justify-between sm:justify-end">
                {pips.map((hot, i) => (
                  <div
                    key={i}
                    className={`ta-streak-pip ${hot ? 'ta-streak-pip--hot' : 'ta-streak-pip--off'}`}
                    title={hot ? 'Day saved' : 'Not marked'}
                  />
                ))}
              </div>
            </div>
            <StreakContributionHeatmap state={state} todayKey={todayKey} />
          </section>
        </div>

        <aside className="lg:border-l border-ta-border/80 lg:pl-8 space-y-5">
          <div className="ta-glass-panel ta-glass-panel--tilt-none p-5">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ta-muted mb-4">
              Habits
            </h3>
            <ul className="space-y-3">
              {state.habits.map((h) => {
                const checked = !!(state.habitChecks[todayKey]?.[h.id])
                return (
                  <li key={h.id}>
                    <label className="ta-habit-label group">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleHabit(h.id)}
                      />
                      <span className="ta-habit-box" aria-hidden />
                      <span
                        className={`text-sm leading-snug flex-1 ${checked ? 'text-ta-muted line-through' : 'text-ta-text'}`}
                      >
                        {h.label}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
            <p className="font-mono text-[10px] text-ta-muted leading-relaxed mt-5">
              Edit labels in Settings. Lightweight reminders only.
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-10 lg:mt-12 space-y-10 w-full max-w-none xl:max-w-[min(100%,1420px)] mx-auto">
        <section>
          <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ta-muted mb-1">
            Time tracking
          </h3>
          <p className="font-mono text-[10px] text-ta-muted/90 mb-4 max-w-2xl leading-relaxed">
            Pause, resume, and stop the session here. Tracked minutes and ad-hoc database tasks are below.
            Week can send you back with <span className="text-ta-text/90">Start timer</span> on today&apos;s
            column.
          </p>
          <DashboardTimerSections />
        </section>

        <section>
          <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ta-muted mb-1">
            Task lanes
          </h3>
          <p className="font-mono text-[10px] text-ta-muted/90 mb-4 max-w-2xl leading-relaxed">
            Set optional <span className="text-ta-text/90">When</span> times on each task. Drag{' '}
            <span className="text-ta-text/85">⋮⋮</span> to reorder within a lane or drop onto another lane.
            Marking done checks the clock against your plan (±5 minutes). Future days with times: use{' '}
            <span className="text-ta-accent/90">Week</span>. Use <span className="text-ta-accent/90">Start timer</span>{' '}
            on a row when the local time API is on (see Time tracking above).
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleLaneDragStart}
            onDragEnd={handleLaneDragEnd}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {state.taskCategories.map((cat, idx) => {
                const ti = idx % 4
                const laneList = byCat.get(cat.id) ?? []
                const laneIds = laneList.map((t) => t.id)
                return (
                  <div
                    key={cat.id}
                    className="ta-glass-panel p-4 flex flex-col min-h-[200px]"
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h4
                        className={`font-mono text-xs font-bold uppercase tracking-[0.1em] ${LANE_TITLE[ti]}`}
                      >
                        {cat.label}
                      </h4>
                      <span className={`h-2 w-2 rounded-full shrink-0 ${LANE_DOT[ti]}`} aria-hidden />
                    </div>
                    <LaneSortableList laneId={cat.id} taskIds={laneIds}>
                      {laneList.map((t) => {
                        const plannedLabel = formatPlannedTimeRange(t)
                        const tracking =
                          timeApiOk === true &&
                          timerCurrent != null &&
                          t.timeTaskId === timerCurrent.taskId
                        const mismatch = !!(t.done && t.doneTimeMismatch)
                        return (
                          <SortableDashboardTask
                            key={t.id}
                            task={t}
                            plannedLabel={plannedLabel}
                            tracking={tracking}
                            mismatch={mismatch}
                            onToggle={toggleTask}
                            onPatch={patchTask}
                            onRemove={removeTask}
                            onStartTimer={(id) => void runStartPlannerTask(id)}
                            timeApiOk={timeApiOk}
                          />
                        )
                      })}
                    </LaneSortableList>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      const fd = new FormData(e.currentTarget)
                      const text = String(fd.get('task') || '')
                      const startRaw = String(fd.get('planStart') || '')
                      const endRaw = String(fd.get('planEnd') || '')
                      const hasEnd = fd.get('planHasEnd') === 'on'
                      const sm = startRaw ? parseTimeInput(startRaw) : null
                      const em = hasEnd && endRaw ? parseTimeInput(endRaw) : null
                      let plannedStartMinutes: number | undefined
                      let plannedEndMinutes: number | undefined
                      if (sm != null) {
                        plannedStartMinutes = clampMinutes(sm)
                        if (em != null) {
                          plannedEndMinutes = clampMinutes(Math.max(em, plannedStartMinutes))
                        }
                      }
                      addTask(cat.id, text, {
                        plannedStartMinutes: plannedStartMinutes ?? undefined,
                        plannedEndMinutes:
                          plannedStartMinutes != null && hasEnd && em != null
                            ? plannedEndMinutes
                            : undefined,
                      })
                      e.currentTarget.reset()
                    }}
                    className="space-y-2 border-t border-white/[0.06] pt-3"
                  >
                    <div className="flex gap-2 flex-wrap">
                      <input
                        name="task"
                        placeholder="Task…"
                        className="ta-glass-input flex-1 min-w-[8rem] px-2 py-2 font-mono text-xs text-ta-text placeholder:text-ta-muted/80 placeholder:font-sans"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[9px] text-ta-muted uppercase">When (optional)</span>
                      <input
                        type="time"
                        name="planStart"
                        aria-label="Planned start for new task"
                        className="ta-glass-input w-[7rem] px-1.5 py-1 font-mono text-[10px] text-ta-text"
                      />
                      <label className="flex items-center gap-1 font-mono text-[9px] text-ta-muted">
                        <input type="checkbox" name="planHasEnd" className="rounded border-ta-border" />
                        End
                      </label>
                      <input
                        type="time"
                        name="planEnd"
                        aria-label="Planned end for new task"
                        className="ta-glass-input w-[7rem] px-1.5 py-1 font-mono text-[10px] text-ta-text"
                      />
                      <button
                        type="submit"
                        className="font-mono text-xs uppercase px-3 py-2 border border-ta-accent/50 text-ta-accent rounded-md bg-white/[0.04] hover:bg-ta-accent/10 hover:shadow-[0_0_16px_-4px_rgba(232,255,71,0.4)] transition-all ml-auto"
                      >
                        Add
                      </button>
                    </div>
                  </form>
                </div>
              )
            })}
            </div>
            <DragOverlay>
              {activeDragTask ? (
                <div className="rounded-lg border border-ta-accent/50 bg-ta-surface/95 px-3 py-2 text-sm text-ta-text shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-md max-w-[280px]">
                  {activeDragTask.text}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </section>

        <section className="space-y-10">
          <IntentSectionsEditor
            label="Today’s intention"
            sections={intentionSections}
            onChange={setIntentionSections}
            titlePlaceholder="e.g. Brainstorm project ideas"
            detailsPlaceholder="e.g. Keep scope realistic; interests: sports, finance…"
            addSectionLabel="Add intention"
          />

          <div className="space-y-2">
            <LogSectionsEditor
              label="Daily log / reflection"
              sections={logSections}
              onChange={setLogSections}
              addSectionLabel="Add log section"
              sideBySide={logSideBySide}
              onSideBySideChange={setLogSideBySide}
            />
            <p className="font-mono text-[10px] text-ta-muted leading-relaxed">
              To save today: mark at least one task done, and complete one log section — section title plus
              method-specific content (Default: {MIN_LOG_WORDS_FOR_SAVE}+ words in details; Cornell: cues/notes
              + {MIN_LOG_WORDS_FOR_SAVE}+ words total; Outline: top items with enough text; Boxed: titled
              boxes with enough text). Images and links attach below each section. Habits optional.
              {!logQualifies && logSections.length > 0 ? (
                <span className="block mt-1 text-ta-accent2/90">
                  Still need a qualifying section (see checklist below when you try Save).
                </span>
              ) : null}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              {!dayMarked ? (
                <button
                  type="button"
                  onClick={saveDay}
                  disabled={!saveReadiness.ok}
                  className="ta-glass-btn-primary font-mono text-sm uppercase tracking-wider px-6 py-3 text-white disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none"
                >
                  Save today
                </button>
              ) : (
                <p className="font-mono text-xs text-ta-success leading-relaxed max-w-xl">
                  This day is saved. You can keep editing intentions, daily log, and tasks — everything still
                  syncs automatically. Open <strong className="text-ta-accent">Week → Before</strong> anytime
                  to view this day as a snapshot.
                </p>
              )}
            </div>
            {!dayMarked && !saveReadiness.ok && (
              <ul className="font-mono text-xs text-ta-accent2/95 space-y-1 list-disc pl-5">
                {saveReadiness.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
