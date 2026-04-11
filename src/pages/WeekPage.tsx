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
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { addDays, addMonths, startOfMonth } from 'date-fns'
import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { firstDateKeyAfterMonthGrid, WeekMonthCalendar } from '@/components/week/WeekMonthCalendar'
import { WeekDayModal } from '@/components/week/WeekDayModal'
import { WeekAddTaskForm, WeekSortableTaskRow } from '@/components/week/WeekSortableTaskRow'
import { useTimeTracker } from '@/context/TimeTrackerContext'
import { useAppState } from '@/context/AppStateContext'
import { parseDateKey, toDateKey, weekDayKeys, weekStartKey, weekStartMonday } from '@/lib/dates'
import { newId } from '@/lib/id'
import { computeDoneTimeMismatch } from '@/lib/taskPlannedTime'
import type { TaskItem } from '@/lib/types'
import { isValidDateKey } from '@/lib/streak'
import { calendarDropId, parseDropToDateKey } from '@/lib/weekCalendar'
import { deleteTask } from '@/lib/timeApi'

/** ~3 months of days after the visible month grid. */
const BEYOND_DAY_COUNT = 90

function DayColumn({
  dateKey,
  isToday,
  items,
  categoryLabels,
  onAdd,
  onToggleTask,
  onPatchTask,
  onRemoveTask,
  defaultCategoryId,
  compact,
  todayKey,
  timeApiOk,
}: {
  dateKey: string
  isToday: boolean
  items: TaskItem[]
  categoryLabels: Map<string, string>
  onAdd: (
    categoryId: string,
    text: string,
    opts?: { plannedStartMinutes?: number | null; plannedEndMinutes?: number | null },
  ) => void
  onToggleTask: (id: string) => void
  onPatchTask: (id: string, patch: Partial<TaskItem>) => void
  onRemoveTask: (id: string) => void
  defaultCategoryId: string
  compact?: boolean
  todayKey: string
  timeApiOk: boolean | null
}) {
  const ids = items.map((t) => t.id)
  const { setNodeRef } = useDroppable({ id: calendarDropId(dateKey) })
  const dateLabel = new Date(dateKey + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  return (
    <div
      className={`gs-glass-panel flex flex-col w-full h-full min-h-[280px] max-h-[min(68vh,520px)] p-3 ${
        isToday ? 'ring-1 ring-gs-accent/35 shadow-[0_0_24px_-8px_rgba(232,255,71,0.25)]' : ''
      } ${compact ? 'min-h-[260px] max-h-[min(62vh,480px)]' : ''}`}
      data-day={dateKey}
    >
      <div className="shrink-0 mb-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-gs-muted">
          {new Date(dateKey + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' })}
        </p>
        <p className="font-mono text-lg font-bold text-gs-text drop-shadow-[0_0_12px_rgba(255,255,255,0.08)]">
          {new Date(dateKey + 'T12:00:00').getDate()}
        </p>
        {compact && (
          <p className="font-mono text-[9px] text-gs-muted/90 mt-0.5">
            {new Date(dateKey + 'T12:00:00').toLocaleDateString(undefined, { month: 'short' })}
          </p>
        )}
      </div>

      <div className="flex flex-col flex-1 min-h-0 min-w-0">
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div
            ref={setNodeRef}
            className="gs-scrollbar flex-1 min-h-[72px] overflow-y-auto overflow-x-hidden space-y-2 pr-1.5 pb-2 -mr-0.5"
          >
            {items.map((t) => (
              <WeekSortableTaskRow
                key={t.id}
                task={t}
                compact={compact}
                categoryLabel={categoryLabels.get(t.categoryId) ?? '—'}
                onToggle={onToggleTask}
                onPatch={onPatchTask}
                onRemove={onRemoveTask}
                showTimerStart={dateKey === todayKey}
                timeApiOk={timeApiOk}
              />
            ))}
          </div>
        </SortableContext>
      </div>

      <WeekAddTaskForm
        categoryLabels={categoryLabels}
        defaultCategoryId={defaultCategoryId}
        dateLabel={dateLabel}
        onAdd={onAdd}
        submitLabel="Add"
      />
    </div>
  )
}

function neonRangeBtn(active: boolean) {
  return [
    'gs-glass-panel gs-glass-panel--tilt-none px-3 py-2 font-mono text-xs rounded-lg border transition-all',
    active
      ? 'text-[#39ff14] border-[#39ff14]/55 bg-[#39ff14]/[0.14] shadow-[0_0_26px_-6px_rgba(57,255,20,0.5)] ring-1 ring-[#39ff14]/40 font-semibold'
      : 'border-[#39ff14]/22 text-[#5cee5c] hover:border-[#39ff14]/48 hover:text-[#84ff84] hover:shadow-[0_0_20px_-8px_rgba(57,255,20,0.38)]',
  ].join(' ')
}

export function WeekPage() {
  const { state, setState } = useAppState()
  const { apiOk: timeApiOk } = useTimeTracker()
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()))
  const [modalDateKey, setModalDateKey] = useState<string | null>(null)
  const [showBeyond, setShowBeyond] = useState(false)
  const [showBefore, setShowBefore] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const beyondAnchorKey = useMemo(() => firstDateKeyAfterMonthGrid(viewMonth), [viewMonth])
  const beyondKeys = useMemo(() => {
    const start = parseDateKey(beyondAnchorKey)
    return Array.from({ length: BEYOND_DAY_COUNT }, (_, i) => toDateKey(addDays(start, i)))
  }, [beyondAnchorKey])

  const intentWeekMonday = weekStartMonday(startOfMonth(viewMonth))
  const wk = weekStartKey(intentWeekMonday)
  const todayKey = toDateKey(new Date())

  const weekIntent = state.weekIntentByWeekStart[wk] ?? ''

  const loggedKeysDescending = useMemo(
    () =>
      Object.entries(state.daySaved)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .filter((k) => isValidDateKey(k))
        .sort((a, b) => b.localeCompare(a)),
    [state.daySaved],
  )
  const daysLogged = loggedKeysDescending.length

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const categoryLabels = new Map(state.taskCategories.map((c) => [c.id, c.label]))
  const defaultCategoryId = state.taskCategories[0]?.id ?? ''

  function colOf(taskId: string): string | null {
    for (const k of Object.keys(state.tasksByDay)) {
      if ((state.tasksByDay[k]?.items ?? []).some((t) => t.id === taskId)) return k
    }
    return null
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const aid = String(active.id)
    const oid = String(over.id)

    const activeCol = colOf(aid)
    if (!activeCol) return
    const overCol = parseDropToDateKey(oid) ?? colOf(oid)
    if (!overCol) return

    const oldActiveItems = state.tasksByDay[activeCol]?.items ?? []
    const activeIndex = oldActiveItems.findIndex((t) => t.id === aid)
    if (activeIndex === -1) return

    if (activeCol === overCol) {
      const overIndex = oldActiveItems.findIndex((t) => t.id === oid)
      if (overIndex === -1 || activeIndex === overIndex) return
      const newItems = arrayMove(oldActiveItems, activeIndex, overIndex)
      setState((s) => ({
        ...s,
        tasksByDay: {
          ...s.tasksByDay,
          [activeCol]: { items: newItems },
        },
      }))
      return
    }

    const moved = oldActiveItems[activeIndex]
    const without = oldActiveItems.filter((t) => t.id !== aid)
    const dest = [...(state.tasksByDay[overCol]?.items ?? [])]
    let newIndex: number
    if (parseDropToDateKey(oid) != null) {
      newIndex = dest.length
    } else {
      const i = dest.findIndex((t) => t.id === oid)
      newIndex = i === -1 ? dest.length : i
    }
    const newDest = [...dest.slice(0, newIndex), moved, ...dest.slice(newIndex)]

    setState((s) => ({
      ...s,
      tasksByDay: {
        ...s.tasksByDay,
        [activeCol]: { items: without },
        [overCol]: { items: newDest },
      },
    }))
  }

  function addTask(
    dateKey: string,
    categoryId: string,
    text: string,
    opts?: { plannedStartMinutes?: number | null; plannedEndMinutes?: number | null },
  ) {
    const t = text.trim()
    if (!t) return
    setState((s) => {
      const prev = s.tasksByDay[dateKey]?.items ?? []
      return {
        ...s,
        tasksByDay: {
          ...s.tasksByDay,
          [dateKey]: {
            items: [
              ...prev,
              {
                id: newId(),
                categoryId,
                text: t,
                done: false,
                plannedStartMinutes: opts?.plannedStartMinutes ?? undefined,
                plannedEndMinutes: opts?.plannedEndMinutes ?? undefined,
              },
            ],
          },
        },
      }
    })
  }

  function patchTask(dateKey: string, taskId: string, patch: Partial<TaskItem>) {
    setState((s) => {
      const items = s.tasksByDay[dateKey]?.items ?? []
      return {
        ...s,
        tasksByDay: {
          ...s.tasksByDay,
          [dateKey]: {
            items: items.map((x) => (x.id === taskId ? { ...x, ...patch } : x)),
          },
        },
      }
    })
  }

  function toggleTask(dateKey: string, id: string) {
    setState((s) => {
      const items = s.tasksByDay[dateKey]?.items ?? []
      const t = items.find((x) => x.id === id)
      if (!t) return s
      const next = items.map((x) => {
        if (x.id !== id) return x
        if (x.done) {
          return { ...x, done: false, completedAt: undefined, doneTimeMismatch: undefined }
        }
        const completedAt = new Date().toISOString()
        const mismatch =
          x.plannedStartMinutes != null && computeDoneTimeMismatch(dateKey, x, completedAt, 5)
        return { ...x, done: true, completedAt, doneTimeMismatch: mismatch }
      })
      return {
        ...s,
        tasksByDay: { ...s.tasksByDay, [dateKey]: { items: next } },
      }
    })
  }

  function removeTask(dateKey: string, taskId: string) {
    const items = state.tasksByDay[dateKey]?.items ?? []
    const t = items.find((x) => x.id === taskId)
    if (t?.timeTaskId != null) {
      void deleteTask(t.timeTaskId).catch(() => {})
    }
    setState((s) => {
      const list = s.tasksByDay[dateKey]?.items ?? []
      return {
        ...s,
        tasksByDay: {
          ...s.tasksByDay,
          [dateKey]: { items: list.filter((x) => x.id !== taskId) },
        },
      }
    })
  }

  function setWeekIntent(v: string) {
    setState((s) => ({
      ...s,
      weekIntentByWeekStart: { ...s.weekIntentByWeekStart, [wk]: v },
    }))
  }

  const activeTask = useMemo(() => {
    if (activeId == null) return null
    for (const bucket of Object.values(state.tasksByDay)) {
      const t = bucket?.items.find((x) => x.id === activeId)
      if (t) return t
    }
    return null
  }, [activeId, state.tasksByDay])

  const modalItems = modalDateKey ? (state.tasksByDay[modalDateKey]?.items ?? []) : []

  if (!state.profile.onboardingComplete) {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gs-text drop-shadow-[0_0_20px_rgba(255,255,255,0.06)]">
            Month planner
          </h2>
          <p className="font-mono text-[11px] text-gs-muted mt-1.5 max-w-xl leading-relaxed">
            Tap a day for tasks and times. Colored lines are lanes. Week that contains today is outlined.
            Days logged: <span className="text-gs-text/90">{daysLogged}</span>
            {daysLogged > 0
              ? ' — open Before to revisit a saved day.'
              : ' — save a day on Today to build history.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 font-mono text-xs">
          <button
            type="button"
            className={neonRangeBtn(showBefore)}
            onClick={() => setShowBefore((v) => !v)}
          >
            Before
          </button>
          <button
            type="button"
            className={neonRangeBtn(showBeyond)}
            onClick={() => setShowBeyond((v) => !v)}
          >
            Beyond
          </button>
        </div>
      </div>

      <label className="block space-y-2 max-w-3xl">
        <span className="font-mono text-xs uppercase tracking-widest text-gs-muted">
          Week intention · top 3 things that matter
        </span>
        <span className="font-mono text-[10px] text-gs-muted/90 block -mt-1">
          Applies to the week that contains the first of this calendar month ({weekDayKeys(intentWeekMonday)[0]}{' '}
          – {weekDayKeys(intentWeekMonday)[6]}).
        </span>
        <textarea
          value={weekIntent}
          onChange={(e) => setWeekIntent(e.target.value)}
          rows={2}
          className="gs-glass-input w-full px-3 py-2.5 text-sm text-gs-text placeholder:text-gs-muted/80 font-sans leading-relaxed"
          placeholder="What matters most this week?"
        />
      </label>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <WeekMonthCalendar
          viewMonth={viewMonth}
          todayKey={todayKey}
          selectedDateKey={modalDateKey}
          tasksByDay={state.tasksByDay}
          taskCategories={state.taskCategories}
          onOpenDay={(dk) => setModalDateKey(dk)}
          onPrevMonth={() => setViewMonth((m) => startOfMonth(addMonths(m, -1)))}
          onNextMonth={() => setViewMonth((m) => startOfMonth(addMonths(m, 1)))}
          onThisMonth={() => {
            setViewMonth(startOfMonth(new Date()))
          }}
        />

        {showBefore && (
          <div className="mt-8 space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5cee5c]">
              Before · all logged days
            </p>
            {loggedKeysDescending.length === 0 ? (
              <p className="font-mono text-xs text-gs-muted">No saved days yet.</p>
            ) : (
              <div className="flex gap-2.5 items-stretch overflow-x-auto pb-3 gs-week-scroller min-h-0">
                {loggedKeysDescending.map((k) => {
                  const d = new Date(`${k}T12:00:00`)
                  return (
                    <div
                      key={k}
                      className="shrink-0 w-[min(44vw,168px)] sm:w-[172px] flex flex-col gs-glass-panel p-3 border border-[#39ff14]/15 shadow-[0_0_18px_-10px_rgba(57,255,20,0.25)]"
                    >
                      <p className="font-mono text-[10px] uppercase tracking-wider text-gs-muted">
                        {d.toLocaleDateString(undefined, { weekday: 'short' })}
                      </p>
                      <p className="font-mono text-xl font-bold text-gs-text leading-tight mt-1">
                        {d.getDate()}
                      </p>
                      <p className="font-mono text-[9px] text-gs-muted/90 mt-0.5">
                        {d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                      </p>
                      <Link
                        to={`/day/${k}`}
                        className="mt-auto pt-3 font-mono text-[10px] uppercase tracking-wider text-center py-2 rounded-md border border-[#39ff14]/35 text-[#7fff7f] hover:bg-[#39ff14]/10 hover:border-[#39ff14]/55 hover:shadow-[0_0_16px_-6px_rgba(57,255,20,0.35)] transition-all"
                      >
                        View
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {showBeyond && (
          <div className="mt-8 space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5cee5c]">
              Beyond · next {BEYOND_DAY_COUNT} days after this month grid
            </p>
            <div className="flex gap-2.5 items-stretch overflow-x-auto pb-3 gs-week-scroller min-h-0">
              {beyondKeys.map((dateKey) => {
                const items = state.tasksByDay[dateKey]?.items ?? []
                return (
                  <div key={dateKey} className="shrink-0 w-[132px] sm:w-[148px] flex">
                    <DayColumn
                      dateKey={dateKey}
                      isToday={dateKey === todayKey}
                      items={items}
                      categoryLabels={categoryLabels}
                      defaultCategoryId={defaultCategoryId}
                      onAdd={(cid, text, opts) => addTask(dateKey, cid, text, opts)}
                      onToggleTask={(id) => toggleTask(dateKey, id)}
                      onPatchTask={(id, patch) => patchTask(dateKey, id, patch)}
                      onRemoveTask={(id) => removeTask(dateKey, id)}
                      todayKey={todayKey}
                      timeApiOk={timeApiOk}
                      compact
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <DragOverlay>
          {activeTask ? (
            <div className="rounded-md border border-gs-accent/50 bg-gs-surface/95 px-3 py-2 text-sm text-gs-text shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-md max-w-[220px]">
              {activeTask.text}
            </div>
          ) : null}
        </DragOverlay>

        {modalDateKey ? (
          <WeekDayModal
            dateKey={modalDateKey}
            onClose={() => setModalDateKey(null)}
            items={modalItems}
            categoryLabels={categoryLabels}
            defaultCategoryId={defaultCategoryId}
            todayKey={todayKey}
            timeApiOk={timeApiOk}
            onAdd={(cid, text, opts) => addTask(modalDateKey, cid, text, opts)}
            onToggleTask={(id) => toggleTask(modalDateKey, id)}
            onPatchTask={(id, patch) => patchTask(modalDateKey, id, patch)}
            onRemoveTask={(id) => removeTask(modalDateKey, id)}
          />
        ) : null}
      </DndContext>

      <p className="font-mono text-[10px] text-gs-muted leading-relaxed">
        Drag tasks between days on the calendar, in the day window, or onto Beyond columns. Optional{' '}
        <span className="text-gs-text/85">When</span> times compare to your clock when you mark done (±5 min).{' '}
        <strong className="text-[#6dff6d]">Before</strong> lists saved days;{' '}
        <strong className="text-[#6dff6d]">Beyond</strong> extends after the month grid.
      </p>
    </div>
  )
}
