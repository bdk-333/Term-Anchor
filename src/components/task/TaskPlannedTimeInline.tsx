import type { TaskItem } from '@/lib/types'
import { clampMinutes, minutesToTimeInput, parseTimeInput } from '@/lib/taskPlannedTime'

/** Inline start/end time controls for a task (same day as the task bucket). */
export function TaskPlannedTimeInline({
  task,
  onPatch,
  compact,
  showHighPriority,
}: {
  task: TaskItem
  onPatch: (patch: Partial<TaskItem>) => void
  compact?: boolean
  /** When false, hide urgent / due-by controls (e.g. compact week cells). Default true. */
  showHighPriority?: boolean
}) {
  const showHp = showHighPriority !== false
  const startVal =
    task.plannedStartMinutes != null ? minutesToTimeInput(task.plannedStartMinutes) : ''
  const endVal = task.plannedEndMinutes != null ? minutesToTimeInput(task.plannedEndMinutes) : ''
  const hasEnd = task.plannedEndMinutes != null
  const deadlineVal =
    task.priorityDeadlineMinutes != null ? minutesToTimeInput(task.priorityDeadlineMinutes) : ''

  function setStart(v: string) {
    if (!v) {
      onPatch({ plannedStartMinutes: undefined, plannedEndMinutes: undefined })
      return
    }
    const m = parseTimeInput(v)
    if (m == null) return
    const sm = clampMinutes(m)
    let em = task.plannedEndMinutes
    if (em != null && em < sm) em = sm
    onPatch({ plannedStartMinutes: sm, plannedEndMinutes: em ?? undefined })
  }

  function setEnd(v: string) {
    if (!v) {
      onPatch({ plannedEndMinutes: undefined })
      return
    }
    const m = parseTimeInput(v)
    if (m == null) return
    const em = clampMinutes(m)
    const sm = task.plannedStartMinutes ?? 0
    onPatch({ plannedEndMinutes: em < sm ? sm : em })
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${compact ? 'mt-1' : 'mt-1.5'} ${compact ? 'max-w-full' : ''}`}
    >
      <span className="font-mono text-[9px] text-ta-muted uppercase shrink-0">When</span>
      <input
        type="time"
        aria-label="Planned start"
        value={startVal}
        onChange={(e) => setStart(e.target.value)}
        className={`ta-glass-input font-mono text-[10px] px-1.5 py-1 text-ta-text ${compact ? 'w-[6.5rem]' : 'w-[7.25rem]'}`}
      />
      <label className="flex items-center gap-1 font-mono text-[9px] text-ta-muted shrink-0">
        <input
          type="checkbox"
          checked={hasEnd}
          onChange={(e) => {
            if (e.target.checked) {
              const sm = task.plannedStartMinutes ?? 9 * 60
              onPatch({ plannedEndMinutes: Math.min(1439, sm + 60) })
            } else {
              onPatch({ plannedEndMinutes: undefined })
            }
          }}
        />
        End
      </label>
      {hasEnd ? (
        <input
          type="time"
          aria-label="Planned end"
          value={endVal}
          onChange={(e) => setEnd(e.target.value)}
          className={`ta-glass-input font-mono text-[10px] px-1.5 py-1 text-ta-text ${compact ? 'w-[6.5rem]' : 'w-[7.25rem]'}`}
        />
      ) : null}
      {showHp ? (
        <>
          <label className="flex items-center gap-1 font-mono text-[9px] text-ta-accent2/90 shrink-0">
            <input
              type="checkbox"
              checked={!!task.highPriority}
              onChange={(e) => {
                const on = e.target.checked
                onPatch(
                  on
                    ? { highPriority: true }
                    : { highPriority: false, priorityDeadlineMinutes: undefined },
                )
              }}
            />
            Urgent
          </label>
          {task.highPriority ? (
            <>
              <span className="font-mono text-[9px] text-ta-muted uppercase shrink-0">Due by</span>
              <input
                type="time"
                aria-label="Urgent due by (today)"
                value={deadlineVal}
                onChange={(e) => {
                  const v = e.target.value
                  if (!v) {
                    onPatch({ priorityDeadlineMinutes: undefined })
                    return
                  }
                  const m = parseTimeInput(v)
                  if (m == null) return
                  onPatch({ priorityDeadlineMinutes: clampMinutes(m) })
                }}
                className={`ta-glass-input font-mono text-[10px] px-1.5 py-1 text-ta-text ${compact ? 'w-[6.5rem]' : 'w-[7.25rem]'}`}
              />
            </>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
