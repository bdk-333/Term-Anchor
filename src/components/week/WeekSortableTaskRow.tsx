import { useEffect, useState, type KeyboardEvent } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'
import { TaskPlannedTimeInline } from '@/components/task/TaskPlannedTimeInline'
import {
  clampMinutes,
  formatPlannedTimeRange,
  parseTimeInput,
} from '@/lib/taskPlannedTime'
import type { LaneTaskCreateOpts, TaskItem } from '@/lib/types'

export function WeekSortableTaskRow({
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
  const [editing, setEditing] = useState(false)
  const [draftText, setDraftText] = useState(task.text)
  useEffect(() => {
    if (!editing) setDraftText(task.text)
  }, [task.text, editing])

  const plannedLabel = formatPlannedTimeRange(task)
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'group flex items-start gap-2 rounded-md border px-2 py-2 text-sm text-ta-text shadow-[0_2px_12px_rgba(0,0,0,0.25)] backdrop-blur-sm',
        task.done && task.doneTimeMismatch
          ? 'border-amber-400/50 bg-amber-500/[0.08]'
          : task.highPriority && !task.done
            ? 'border-ta-accent2/45 bg-ta-accent2/[0.06] ring-1 ring-ta-accent2/20'
            : 'border-white/10 bg-black/25',
      ].join(' ')}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing font-mono text-ta-muted touch-none px-1 shrink-0"
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
            ? 'bg-ta-success border-ta-success text-ta-bg'
            : 'border-ta-muted bg-ta-surface-muted/50'
        }`}
        aria-label={task.done ? 'Mark incomplete' : 'Mark done'}
      >
        {task.done ? '✓' : ''}
      </button>
      <div className={`flex-1 min-w-0 ${task.done ? 'text-ta-muted' : ''}`}>
        {plannedLabel ? (
          <p className="font-mono text-[9px] text-sky-300/90 leading-tight mb-0.5">{plannedLabel}</p>
        ) : null}
        {task.highPriority && !task.done ? (
          <p className="font-mono text-[8px] uppercase tracking-wider text-ta-accent2/90 mb-0.5">Urgent</p>
        ) : null}
        {editing ? (
          <input
            autoFocus
            aria-label="Edit task title"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onBlur={() => {
              const t = draftText.trim()
              setEditing(false)
              if (t && t !== task.text) onPatch(task.id, { text: t })
              else setDraftText(task.text)
            }}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') {
                setDraftText(task.text)
                setEditing(false)
              }
            }}
            className="ta-glass-input w-full px-2 py-1 text-sm text-ta-text font-sans"
          />
        ) : (
          <p className={task.done ? 'line-through' : ''}>{task.text}</p>
        )}
        <p className="font-mono text-[10px] text-ta-accent/80 mt-0.5">{categoryLabel}</p>
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
            className="mt-1.5 font-mono text-[9px] uppercase tracking-wider px-2 py-1 rounded border border-ta-accent/40 text-ta-accent hover:bg-ta-accent/10"
            onClick={() => navigate(`/?startPlannerTask=${encodeURIComponent(task.id)}`)}
          >
            Start timer
          </button>
        ) : null}
      </div>
      <button
        type="button"
        className="opacity-0 group-hover:opacity-100 text-ta-muted hover:text-ta-accent font-mono text-xs shrink-0"
        onClick={() => {
          setDraftText(task.text)
          setEditing(true)
        }}
        aria-label="Edit task title"
        title="Edit"
      >
        ✎
      </button>
      <button
        type="button"
        className="opacity-0 group-hover:opacity-100 text-ta-muted hover:text-ta-danger font-mono text-xs shrink-0"
        onClick={() => onRemove(task.id)}
        aria-label="Remove task"
      >
        ×
      </button>
    </div>
  )
}

export function WeekAddTaskForm({
  categoryLabels,
  defaultCategoryId,
  submitLabel,
  dateLabel,
  onAdd,
}: {
  categoryLabels: Map<string, string>
  defaultCategoryId: string
  submitLabel?: string
  /** Shown in placeholder e.g. "Apr 9" */
  dateLabel: string
  onAdd: (categoryId: string, text: string, opts?: LaneTaskCreateOpts) => void
}) {
  const [cat, setCat] = useState(defaultCategoryId)
  useEffect(() => {
    setCat(defaultCategoryId)
  }, [defaultCategoryId])
  return (
    <form
      className="shrink-0 mt-3 pt-3 border-t border-white/[0.08] flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const text = String(fd.get('t') || '')
        const startRaw = String(fd.get('planStart') || '')
        const endRaw = String(fd.get('planEnd') || '')
        const hasEnd = fd.get('planHasEnd') === 'on'
        const sm = startRaw ? parseTimeInput(startRaw) : null
        const em = hasEnd && endRaw ? parseTimeInput(endRaw) : null
        const hp = fd.get('highPriority') === 'on'
        const hpDueRaw = String(fd.get('priorityDeadline') || '')
        const hpDue = hp && hpDueRaw ? parseTimeInput(hpDueRaw) : null
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
          highPriority: hp || undefined,
          priorityDeadlineMinutes: hp && hpDue != null ? clampMinutes(hpDue) : undefined,
        })
        e.currentTarget.reset()
        setCat(defaultCategoryId)
      }}
    >
      <select
        value={cat}
        onChange={(e) => setCat(e.target.value)}
        aria-label="Lane for new task"
        className="ta-native-select"
      >
        {Array.from(categoryLabels.entries()).map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
      <input
        name="t"
        placeholder={`Add on ${dateLabel}…`}
        className="ta-glass-input px-3 py-2.5 font-mono text-sm text-ta-text placeholder:text-ta-muted/80 rounded-full border border-white/12"
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[9px] text-ta-muted uppercase shrink-0">When</span>
        <input
          type="time"
          name="planStart"
          aria-label="Planned start"
          className="ta-glass-input w-[6.5rem] px-2 py-1.5 font-mono text-xs text-ta-text"
        />
        <label className="flex items-center gap-1 font-mono text-[9px] text-ta-muted">
          <input type="checkbox" name="planHasEnd" className="rounded border-ta-border" />
          End
        </label>
        <input
          type="time"
          name="planEnd"
          aria-label="Planned end"
          className="ta-glass-input w-[6.5rem] px-2 py-1.5 font-mono text-xs text-ta-text"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 font-mono text-[9px] text-ta-accent2/90">
          <input type="checkbox" name="highPriority" className="rounded border-ta-border" />
          Urgent
        </label>
        <span className="font-mono text-[9px] text-ta-muted uppercase">Due by</span>
        <input
          type="time"
          name="priorityDeadline"
          aria-label="Urgent due by"
          className="ta-glass-input w-[6.5rem] px-2 py-1.5 font-mono text-xs text-ta-text"
        />
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          className="font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-full border border-ta-accent/40 text-ta-accent hover:bg-ta-accent/10"
        >
          {submitLabel ?? 'Add'}
        </button>
      </div>
    </form>
  )
}
