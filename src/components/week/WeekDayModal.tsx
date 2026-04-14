import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { format } from 'date-fns'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { WeekAddTaskForm, WeekSortableTaskRow } from '@/components/week/WeekSortableTaskRow'
import { listDropId } from '@/lib/weekCalendar'
import type { LaneTaskCreateOpts, TaskItem } from '@/lib/types'

type Props = {
  dateKey: string
  onClose: () => void
  items: TaskItem[]
  categoryLabels: Map<string, string>
  defaultCategoryId: string
  todayKey: string
  timeApiOk: boolean | null
  onAdd: (categoryId: string, text: string, opts?: LaneTaskCreateOpts) => void
  onToggleTask: (id: string) => void
  onPatchTask: (id: string, patch: Partial<TaskItem>) => void
  onRemoveTask: (id: string) => void
}

export function WeekDayModal({
  dateKey,
  onClose,
  items,
  categoryLabels,
  defaultCategoryId,
  todayKey,
  timeApiOk,
  onAdd,
  onToggleTask,
  onPatchTask,
  onRemoveTask,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const { setNodeRef } = useDroppable({ id: listDropId(dateKey) })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const t = window.setTimeout(() => panelRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [dateKey])

  const d = new Date(`${dateKey}T12:00:00`)
  const dayNum = d.getDate()
  const weekday = format(d, 'EEEE')
  const dateLabel = format(d, 'MMM d')
  const ids = items.map((t) => t.id)

  const body = (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
        aria-label="Close day"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full sm:max-w-lg max-h-[min(92vh,640px)] sm:rounded-2xl border border-white/[0.12] bg-ta-surface/98 shadow-[0_24px_80px_rgba(0,0,0,0.55)] flex flex-col outline-none sm:mx-4"
      >
        <div className="shrink-0 flex items-start justify-between gap-3 px-4 sm:px-5 pt-4 pb-3 border-b border-white/[0.08]">
          <div>
            <p id={titleId} className="text-2xl sm:text-3xl font-bold text-ta-text tracking-tight">
              <span className="font-mono tabular-nums">{dayNum}</span>{' '}
              <span className="font-sans font-semibold">{weekday}</span>
            </p>
            <p className="font-mono text-[11px] text-ta-muted mt-1">
              {format(d, 'MMMM d, yyyy')}
              {dateKey === todayKey ? ' · Today' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 font-mono text-lg leading-none text-ta-muted hover:text-ta-text px-2 py-1 rounded-md border border-transparent hover:border-white/15"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col px-4 sm:px-5 pb-4 overflow-hidden">
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div
              ref={setNodeRef}
              className="ta-scrollbar flex-1 min-h-[120px] overflow-y-auto space-y-2 pr-1 py-2 -mr-0.5"
            >
              {items.length === 0 ? (
                <p className="font-mono text-sm text-ta-muted py-6 text-center">No tasks yet.</p>
              ) : (
                items.map((t) => (
                  <WeekSortableTaskRow
                    key={t.id}
                    task={t}
                    categoryLabel={categoryLabels.get(t.categoryId) ?? '—'}
                    onToggle={onToggleTask}
                    onPatch={onPatchTask}
                    onRemove={onRemoveTask}
                    showTimerStart={dateKey === todayKey}
                    timeApiOk={timeApiOk}
                  />
                ))
              )}
            </div>
          </SortableContext>

          <WeekAddTaskForm
            categoryLabels={categoryLabels}
            defaultCategoryId={defaultCategoryId}
            dateLabel={dateLabel}
            onAdd={onAdd}
            submitLabel="Add task"
          />
        </div>
      </div>
    </div>
  )

  return createPortal(body, document.body)
}
