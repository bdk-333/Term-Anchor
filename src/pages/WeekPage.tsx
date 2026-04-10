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
import { addDays, addWeeks } from 'date-fns'
import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { TaskPlannedTimeInline } from '@/components/task/TaskPlannedTimeInline'
import { useTimeTracker } from '@/context/TimeTrackerContext'
import { useAppState } from '@/context/AppStateContext'
import { weekDayKeys, weekStartMonday, weekStartKey, toDateKey } from '@/lib/dates'
import { newId } from '@/lib/id'
import {
  clampMinutes,
  computeDoneTimeMismatch,
  formatPlannedTimeRange,
  parseTimeInput,
} from '@/lib/taskPlannedTime'
import type { TaskItem } from '@/lib/types'
import { isValidDateKey } from '@/lib/streak'
import { deleteTask } from '@/lib/timeApi'

/** ~3 months of extra days after the visible week (Mon–Sun). */
const BEYOND_DAY_COUNT = 90

function SortableTaskRow({
  task,
  categoryLabel,
  onToggle,
  onPatch,
  onRemove,
  compact,
  showTimerStart,
  timeApiOk,
}: {
  task: TaskItem
  categoryLabel: string
  onToggle: (id: string) => void
  onPatch: (id: string, patch: Partial<TaskItem>) => void
  onRemove: (id: string) => void
  compact?: boolean
  showTimerStart?: boolean
  timeApiOk?: boolean | null
}) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  }
  const plannedLabel = formatPlannedTimeRange(task)
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'group flex items-start gap-2 rounded-md border px-2 py-2 text-sm text-gs-text shadow-[0_2px_12px_rgba(0,0,0,0.25)] backdrop-blur-sm',
        task.done && task.doneTimeMismatch
          ? 'border-amber-400/50 bg-amber-500/[0.08]'
          : 'border-white/10 bg-black/25',
      ].join(' ')}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing font-mono text-gs-muted touch-none px-1 shrink-0"
        {...attributes}
        {...listeners}
        aria-label="Drag task"
      >
        ⋮⋮
      </button>
      <button
        type="button"
        onClick={() => onToggle(task.id)}
        className={`mt-0.5 w-4 h-4 shrink-0 rounded border font-mono text-[10px] leading-4 ${
          task.done
            ? 'bg-gs-success border-gs-success text-gs-bg'
            : 'border-gs-muted bg-gs-surface-muted/50'
        }`}
        aria-label={task.done ? 'Mark incomplete' : 'Mark done'}
      >
        {task.done ? '✓' : ''}
      </button>
      <div className={`flex-1 min-w-0 ${task.done ? 'text-gs-muted' : ''}`}>
        {plannedLabel ? (
          <p className="font-mono text-[9px] text-sky-300/90 leading-tight mb-0.5">{plannedLabel}</p>
        ) : null}
        <p className={task.done ? 'line-through' : ''}>{task.text}</p>
        <p className="font-mono text-[10px] text-gs-accent/80 mt-0.5">{categoryLabel}</p>
        {task.done && task.completedAt ? (
          <p className="font-mono text-[9px] text-gs-muted/90 mt-1">
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
            Outside planned window (±5 min).
          </p>
        ) : null}
        <TaskPlannedTimeInline
          task={task}
          compact={compact}
          onPatch={(patch) => onPatch(task.id, patch)}
        />
        {showTimerStart && timeApiOk === true && !task.done ? (
          <button
            type="button"
            className="mt-1.5 font-mono text-[9px] uppercase tracking-wider px-2 py-1 rounded border border-gs-accent/40 text-gs-accent hover:bg-gs-accent/10"
            onClick={() => navigate(`/?startPlannerTask=${encodeURIComponent(task.id)}`)}
          >
            Start timer
          </button>
        ) : null}
      </div>
      <button
        type="button"
        className="opacity-0 group-hover:opacity-100 text-gs-muted hover:text-gs-danger font-mono text-xs shrink-0"
        onClick={() => onRemove(task.id)}
        aria-label="Remove task"
      >
        ×
      </button>
    </div>
  )
}

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
  /** Narrower columns in the “Beyond” strip */
  compact?: boolean
  todayKey: string
  timeApiOk: boolean | null
}) {
  const ids = items.map((t) => t.id)
  const [cat, setCat] = useState(defaultCategoryId)
  const { setNodeRef } = useDroppable({ id: dateKey })

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
            id={dateKey}
            className="gs-scrollbar flex-1 min-h-[72px] overflow-y-auto overflow-x-hidden space-y-2 pr-1.5 pb-2 -mr-0.5"
          >
            {items.map((t) => (
              <SortableTaskRow
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

      <form
        className="shrink-0 mt-2 pt-2 border-t border-white/[0.08] flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          const text = String(fd.get('t') || '')
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
          onAdd(cat, text, {
            plannedStartMinutes: plannedStartMinutes ?? undefined,
            plannedEndMinutes:
              plannedStartMinutes != null && hasEnd && em != null ? plannedEndMinutes : undefined,
          })
          e.currentTarget.reset()
        }}
      >
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          aria-label="Category for new task"
          className="gs-native-select"
        >
          {Array.from(categoryLabels.entries()).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <input
          name="t"
          placeholder="Add task…"
          className="gs-glass-input px-2 py-1.5 font-mono text-xs text-gs-text placeholder:text-gs-muted/80"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[8px] text-gs-muted uppercase shrink-0">When</span>
          <input
            type="time"
            name="planStart"
            aria-label="Planned start"
            className="gs-glass-input w-[6.25rem] px-1 py-1 font-mono text-[9px] text-gs-text"
          />
          <label className="flex items-center gap-0.5 font-mono text-[8px] text-gs-muted">
            <input type="checkbox" name="planHasEnd" className="rounded border-gs-border scale-90" />
            End
          </label>
          <input
            type="time"
            name="planEnd"
            aria-label="Planned end"
            className="gs-glass-input w-[6.25rem] px-1 py-1 font-mono text-[9px] text-gs-text"
          />
        </div>
        <button
          type="submit"
          className="font-mono text-[10px] uppercase py-1.5 rounded-md border border-white/15 text-gs-muted hover:text-gs-accent hover:border-gs-accent/50 hover:shadow-[0_0_14px_-4px_rgba(232,255,71,0.35)] transition-all"
        >
          Add
        </button>
      </form>
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
  const [weekOffset, setWeekOffset] = useState(0)
  const [showBeyond, setShowBeyond] = useState(false)
  const [showBefore, setShowBefore] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  if (!state.profile.onboardingComplete) {
    return <Navigate to="/onboarding" replace />
  }

  const monday = addWeeks(weekStartMonday(new Date()), weekOffset)
  const keys = weekDayKeys(monday)
  const wk = weekStartKey(monday)
  const todayKey = toDateKey(new Date())

  const beyondKeys = useMemo(() => {
    const start = addDays(monday, 7)
    return Array.from({ length: BEYOND_DAY_COUNT }, (_, i) => toDateKey(addDays(start, i)))
  }, [monday])

  const dndKeys = useMemo(
    () => (showBeyond ? [...keys, ...beyondKeys] : keys),
    [keys, beyondKeys, showBeyond],
  )

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
    for (const k of dndKeys) {
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
    const overCol = dndKeys.includes(oid) ? oid : colOf(oid)
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
    if (dndKeys.includes(oid)) {
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
          x.plannedStartMinutes != null &&
          computeDoneTimeMismatch(dateKey, x, completedAt, 5)
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

  const activeTask =
    activeId == null
      ? null
      : dndKeys
          .flatMap((k) => state.tasksByDay[k]?.items ?? [])
          .find((t) => t.id === activeId) ?? null

  const navBase =
    'gs-glass-panel gs-glass-panel--tilt-none px-3 py-2 font-mono text-xs rounded-lg border transition-all'
  const thisWeekActive = weekOffset === 0

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gs-text drop-shadow-[0_0_20px_rgba(255,255,255,0.06)]">
            Weekly planner
          </h2>
          <p className="font-mono text-[11px] text-gs-muted mt-1.5 max-w-md leading-relaxed">
            Days logged: <span className="text-gs-text/90">{daysLogged}</span>
            {daysLogged > 0
              ? ' — open Before to revisit any saved day (tasks, intentions, log).'
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
            className={`${navBase} border-white/10 text-gs-muted hover:border-gs-accent/40 hover:text-gs-text`}
            onClick={() => setWeekOffset((o) => o - 1)}
          >
            Prev
          </button>
          <button
            type="button"
            className={
              thisWeekActive
                ? `${navBase} font-bold text-white border-white/40 shadow-[0_0_22px_-6px_rgba(255,255,255,0.2)] bg-white/[0.08]`
                : `${navBase} border-white/10 text-gs-muted hover:border-gs-accent/40 hover:text-gs-text`
            }
            onClick={() => setWeekOffset(0)}
          >
            This week
          </button>
          <button
            type="button"
            className={`${navBase} border-white/10 text-gs-muted hover:border-gs-accent/40 hover:text-gs-text`}
            onClick={() => setWeekOffset((o) => o + 1)}
          >
            Next
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
        <div className="flex gap-3 items-stretch overflow-x-auto pb-3 gs-week-scroller snap-x snap-mandatory md:snap-none min-h-0">
          {keys.map((dateKey) => {
            const items = state.tasksByDay[dateKey]?.items ?? []
            return (
              <div
                key={dateKey}
                className="snap-start shrink-0 w-[min(88vw,248px)] md:flex-1 md:min-w-[160px] flex"
              >
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
                />
              </div>
            )
          })}
        </div>

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
              Beyond · next {BEYOND_DAY_COUNT} days after this week
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
      </DndContext>

      <p className="font-mono text-[10px] text-gs-muted leading-relaxed">
        Drag tasks between days. Optional <span className="text-gs-text/85">When</span> times live on each
        task; marking done on a day compares your clock to that plan (±5 min).{' '}
        <strong className="text-[#6dff6d]">Before</strong> lists saved days;{' '}
        <strong className="text-[#6dff6d]">Beyond</strong> extends ~3 months after this week.
      </p>
    </div>
  )
}
