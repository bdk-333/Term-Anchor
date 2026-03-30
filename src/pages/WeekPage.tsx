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
import { addWeeks } from 'date-fns'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppState } from '@/context/AppStateContext'
import { weekDayKeys, weekStartMonday, weekStartKey, toDateKey } from '@/lib/dates'
import { newId } from '@/lib/id'
import type { TaskItem } from '@/lib/types'

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
      className="flex items-start gap-2 rounded-md border border-gs-border bg-gs-surface-muted/90 px-2 py-2 text-sm text-gs-text"
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
}: {
  dateKey: string
  isToday: boolean
  items: TaskItem[]
  categoryLabels: Map<string, string>
  onAdd: (categoryId: string, text: string) => void
  defaultCategoryId: string
}) {
  const ids = items.map((t) => t.id)
  const [cat, setCat] = useState(defaultCategoryId)
  const { setNodeRef } = useDroppable({ id: dateKey })

  return (
    <div
      className={`flex flex-col min-w-[240px] sm:min-w-[200px] flex-1 border border-gs-border rounded-lg bg-gs-surface/80 p-3 ${
        isToday ? 'ring-1 ring-gs-accent/40' : ''
      }`}
      data-day={dateKey}
    >
      <div className="mb-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-gs-muted">
          {new Date(dateKey + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' })}
        </p>
        <p className="font-mono text-lg font-bold text-gs-text">{new Date(dateKey + 'T12:00:00').getDate()}</p>
      </div>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="space-y-2 flex-1 min-h-[120px] mb-3" id={dateKey}>
          {items.map((t) => (
            <SortableTaskRow
              key={t.id}
              task={t}
              categoryLabel={categoryLabels.get(t.categoryId) ?? '—'}
            />
          ))}
        </div>
      </SortableContext>
      <form
        className="mt-auto flex flex-col gap-2"
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
          className="bg-gs-surface-muted/80 border border-gs-border rounded-md px-2 py-1 font-mono text-[10px] text-gs-text"
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
          className="bg-gs-surface-muted/80 border border-gs-border rounded-md px-2 py-1.5 font-mono text-xs text-gs-text placeholder:text-gs-muted/80"
        />
        <button
          type="submit"
          className="font-mono text-[10px] uppercase py-1.5 border border-gs-border rounded hover:border-gs-accent text-gs-muted hover:text-gs-accent"
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
  const [activeId, setActiveId] = useState<string | null>(null)

  if (!state.profile.onboardingComplete) {
    return <Navigate to="/onboarding" replace />
  }

  const monday = addWeeks(weekStartMonday(new Date()), weekOffset)
  const keys = weekDayKeys(monday)
  const wk = weekStartKey(monday)
  const todayKey = toDateKey(new Date())

  const weekIntent = state.weekIntentByWeekStart[wk] ?? ''

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const categoryLabels = new Map(state.taskCategories.map((c) => [c.id, c.label]))
  const defaultCategoryId = state.taskCategories[0]?.id ?? ''

  function colOf(taskId: string): string | null {
    for (const k of keys) {
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
    const overCol = keys.includes(oid) ? oid : colOf(oid)
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
    if (keys.includes(oid)) {
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
      : keys
          .flatMap((k) => state.tasksByDay[k]?.items ?? [])
          .find((t) => t.id === activeId) ?? null

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Weekly planner</h2>
        <div className="flex gap-2 font-mono text-xs">
          <button
            type="button"
            className="px-3 py-2 border border-gs-border rounded hover:border-gs-accent"
            onClick={() => setWeekOffset((o) => o - 1)}
          >
            Prev
          </button>
          <button
            type="button"
            className="px-3 py-2 border border-gs-border rounded hover:border-gs-accent"
            onClick={() => setWeekOffset(0)}
          >
            This week
          </button>
          <button
            type="button"
            className="px-3 py-2 border border-gs-border rounded hover:border-gs-accent"
            onClick={() => setWeekOffset((o) => o + 1)}
          >
            Next
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
          className="w-full bg-gs-surface/90 border border-gs-border rounded-lg px-3 py-2.5 text-sm text-gs-text placeholder:text-gs-muted/80 font-sans leading-relaxed"
          placeholder="What matters most this week?"
        />
      </label>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none">
          {keys.map((dateKey) => {
            const items = state.tasksByDay[dateKey]?.items ?? []
            return (
              <div key={dateKey} className="snap-start shrink-0 w-[min(88vw,240px)] md:w-auto md:flex-1">
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
        <DragOverlay>
          {activeTask ? (
            <div className="rounded-md border border-gs-accent/60 bg-gs-surface px-3 py-2 text-sm text-gs-text shadow-lg max-w-[220px]">
              {activeTask.text}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <p className="font-mono text-[10px] text-gs-muted">
        Drag tasks between days. Day types (campus / home / explore) arrive in a future update.
      </p>
    </div>
  )
}
