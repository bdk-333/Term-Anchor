import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { toDateKey } from '@/lib/dates'
import type { OverdueHighPriorityItem } from '@/lib/highPriorityReminder'
import { formatPlannedTimeRange } from '@/lib/taskPlannedTime'

export function HighPriorityReminderModal({
  open,
  items,
  onDismiss,
}: {
  open: boolean
  items: OverdueHighPriorityItem[]
  onDismiss: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onDismiss])

  if (!open || items.length === 0) return null

  const body = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ta-hp-modal-title"
      onClick={onDismiss}
    >
      <div
        className="ta-glass-panel ta-glass-panel--tilt-none max-w-md w-full max-h-[min(85vh,520px)] flex flex-col border border-ta-accent2/35 shadow-[0_0_40px_-10px_rgba(255,107,53,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 sm:p-6 border-b border-white/[0.08] shrink-0">
          <h2 id="ta-hp-modal-title" className="text-lg font-bold text-ta-text">
            High-priority tasks need attention
          </h2>
          <p className="text-sm text-ta-muted mt-2 leading-relaxed">
            These are marked urgent and are not done yet — either the planned time has passed, or the day is
            getting late. Complete or adjust them on Today or Week.
          </p>
        </div>
        <ul className="overflow-y-auto ta-scrollbar flex-1 px-5 sm:px-6 py-3 space-y-3">
          {items.map(({ dayKey, task }) => {
            const when = formatPlannedTimeRange(task)
            const todayKey = toDateKey(new Date())
            return (
              <li
                key={`${dayKey}-${task.id}`}
                className="rounded-lg border border-white/[0.1] bg-black/20 px-3 py-2.5"
              >
                <p className="font-mono text-[10px] uppercase tracking-wider text-ta-accent2/90 mb-1">
                  {dayKey === todayKey ? 'Today' : dayKey}
                </p>
                <p className="text-sm text-ta-text font-medium leading-snug">{task.text}</p>
                {when ? (
                  <p className="font-mono text-[10px] text-ta-muted mt-1">Planned: {when}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    to="/"
                    className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded border border-ta-accent/40 text-ta-accent hover:bg-ta-accent/10"
                  >
                    Open Today
                  </Link>
                  <Link
                    to={`/day/${dayKey}`}
                    className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded border border-white/15 text-ta-muted hover:text-ta-text hover:border-white/25"
                  >
                    View day
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
        <div className="p-4 sm:p-5 border-t border-white/[0.08] shrink-0 flex justify-end">
          <button
            type="button"
            className="font-mono text-xs uppercase tracking-wider px-5 py-2.5 rounded-lg bg-ta-accent text-ta-bg hover:opacity-95"
            onClick={onDismiss}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(body, document.body)
}
