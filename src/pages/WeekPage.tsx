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
import { Navigate } from 'react-router-dom'
import { useAppState } from '@/context/AppStateContext'
import { weekDayKeys, weekStartMonday, weekStartKey, toDateKey } from '@/lib/dates'
import { newId } from '@/lib/id'
import type { TaskItem } from '@/lib/types'

/** ~3 months of extra days after the visible week (Mon–Sun). */
const BEYOND_DAY_COUNT = 90

function SortableTaskRow({
  task,
  categoryLabel,
}: {
  task: TaskItem
  categoryLabel: string
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
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 rounded-md border border-white/10 bg-black/25 px-2 py-2 text-sm text-gs-text shadow-[0_2px_12px_rgba(0,0,0,0.25)] backdrop-blur-sm"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing font-mono text-gs-muted touch-none px-1"
        {...attributes}
        {...listeners}
        aria-label="Drag task"
      >
        ⋮⋮
      </button>
      <div className="flex-1 min-w-0">
        <p className={task.done ? 'text-gs-muted line-through' : ''}>{task.text}</p>
        <p className="font-mono text-[10px] text-gs-accent/80 mt-0.5">{categoryLabel}</p>
      </div>
    </div>
  )
}

function DayColumn({
  dateKey,
  isToday,
  items,
  categoryLabels,
  onAdd,
  defaultCategoryId,
  compact,
}: {
  dateKey: string
  isToday: boolean
  items: TaskItem[]
  categoryLabels: Map<string, string>
  onAdd: (categoryId: string, text: string) => void
  defaultCategoryId: string
  /** Narrower columns in the “Beyond” strip */
  compact?: boolean
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
                categoryLabel={categoryLabels.get(t.categoryId) ?? '—'}
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
          onAdd(cat, text)
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

export function WeekPage() {
  const { state, setState } = useAppState()
  const [weekOffset, setWeekOffset] = useState(0)
  const [showBeyond, setShowBeyond] = useState(false)
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

  function addTask(dateKey: string, categoryId: string, text: string) {
    const t = text.trim()
    if (!t) return
    setState((s) => {
      const prev = s.tasksByDay[dateKey]?.items ?? []
      return {
        ...s,
        tasksByDay: {
          ...s.tasksByDay,
          [dateKey]: { items: [...prev, { id: newId(), categoryId, text: t, done: false }] },
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
        <h2 className="text-2xl font-bold text-gs-text drop-shadow-[0_0_20px_rgba(255,255,255,0.06)]">
          Weekly planner
        </h2>
        <div className="flex flex-wrap gap-2 font-mono text-xs">
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
            className={
              showBeyond
                ? `${navBase} font-semibold text-gs-accent border-gs-accent/45 shadow-[0_0_20px_-6px_rgba(232,255,71,0.25)] bg-gs-accent/10`
                : `${navBase} border-white/10 text-gs-muted hover:border-gs-accent/40 hover:text-gs-text`
            }
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
                  onAdd={(cid, text) => addTask(dateKey, cid, text)}
                />
              </div>
            )
          })}
        </div>

        {showBeyond && (
          <div className="mt-8 space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gs-muted">
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
                      onAdd={(cid, text) => addTask(dateKey, cid, text)}
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

      <p className="font-mono text-[10px] text-gs-muted">
        Drag tasks between any visible days. Open <strong className="text-gs-muted">Beyond</strong> for the
        next ~3 months after the week above. Day types (campus / home / explore) arrive in a future update.
      </p>
    </div>
  )
}
